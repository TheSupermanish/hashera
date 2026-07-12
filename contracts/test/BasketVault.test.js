const { expect } = require("chai");
const { ethers } = require("hardhat");

const VAULT_ROLE = ethers.keccak256(ethers.toUtf8Bytes("VAULT_ROLE"));
const p8 = (v) => ethers.parseUnits(v, 8);
const usdc = (v) => ethers.parseUnits(v, 6);

describe("BasketVault", () => {
  let deployer, user, treasury;
  let stable, oracle, tokenA, tokenB, vault;

  beforeEach(async () => {
    [deployer, user, treasury] = await ethers.getSigners();

    stable = await (await ethers.getContractFactory("MockUSDC")).deploy();
    oracle = await (await ethers.getContractFactory("PriceOracle")).deploy();
    const RWAToken = await ethers.getContractFactory("RWAToken");
    tokenA = await RWAToken.deploy("Intel onchain", "INTCon", "Intel (NASDAQ: INTC)");
    tokenB = await RWAToken.deploy("NVIDIA onchain", "NVDAon", "NVIDIA (NASDAQ: NVDA)");

    await oracle.setPrice(await tokenA.getAddress(), p8("100"));
    await oracle.setPrice(await tokenB.getAddress(), p8("200"));

    vault = await (await ethers.getContractFactory("BasketVault")).deploy(
      "Test Basket", "bTEST",
      await stable.getAddress(),
      await oracle.getAddress(),
      [await tokenA.getAddress(), await tokenB.getAddress()],
      [6000, 4000],
      treasury.address,
      50,          // 0.5% entry fee
      usdc("25"),  // min invest
      deployer.address
    );

    await tokenA.grantRole(VAULT_ROLE, await vault.getAddress());
    await tokenB.grantRole(VAULT_ROLE, await vault.getAddress());

    await stable.mint(user.address, usdc("10000"));
    await stable.connect(user).approve(await vault.getAddress(), ethers.MaxUint256);
  });

  it("rejects investments below minimum", async () => {
    await expect(vault.connect(user).invest(usdc("10"))).to.be.revertedWith("vault: below minimum");
  });

  it("mints shares 1:1 with net USD on first invest and splits by weights", async () => {
    await vault.connect(user).invest(usdc("1000"));

    const fee = usdc("5"); // 0.5%
    expect(await stable.balanceOf(treasury.address)).to.equal(fee);

    const net = usdc("995");
    expect(await vault.balanceOf(user.address)).to.equal(net * 10n ** 12n);

    // 60% of 995 = 597 USD at $100 -> 5.97 units; 40% = 398 at $200 -> 1.99 units
    expect(await tokenA.balanceOf(await vault.getAddress())).to.equal(ethers.parseEther("5.97"));
    expect(await tokenB.balanceOf(await vault.getAddress())).to.equal(ethers.parseEther("1.99"));

    // NAV should equal net deposit
    expect(await vault.totalValue()).to.equal(net);
    expect(await vault.sharePrice()).to.equal(usdc("1"));
  });

  it("share price tracks oracle price moves", async () => {
    await vault.connect(user).invest(usdc("1000"));
    // tokenA +10%, tokenB flat -> basket +6%
    await oracle.setPrice(await tokenA.getAddress(), p8("110"));
    expect(await vault.sharePrice()).to.equal(usdc("1.06"));
  });

  it("redeems at NAV and burns pro-rata units", async () => {
    await vault.connect(user).invest(usdc("1000"));
    const shares = await vault.balanceOf(user.address);
    const before = await stable.balanceOf(user.address);

    await vault.connect(user).redeem(shares / 2n);
    const got = (await stable.balanceOf(user.address)) - before;
    expect(got).to.equal(usdc("497.5")); // half of 995 net

    expect(await tokenA.balanceOf(await vault.getAddress())).to.equal(ethers.parseEther("2.985"));
  });

  it("stays solvent when NAV outgrows deposits: pays pro-rata collateral, and fund() lifts payout to NAV", async () => {
    await vault.connect(user).invest(usdc("1000")); // 995 net USDC collateral
    await oracle.setPriceForce(await tokenA.getAddress(), p8("200")); // large appreciation (admin)
    const shares = await vault.balanceOf(user.address);

    // Without a treasury top-up, redemption is capped at the actual USDC
    // collateral (the deposited 995), never reverts, and never over-pays.
    const before = await stable.balanceOf(user.address);
    await vault.connect(user).redeem(shares);
    const got = (await stable.balanceOf(user.address)) - before;
    expect(got).to.equal(usdc("995"));
    expect(await vault.totalSupply()).to.equal(0n);
  });

  it("pays full NAV on redemption once the treasury funds the gain", async () => {
    await vault.connect(user).invest(usdc("1000")); // 995 net
    await oracle.setPrice(await tokenA.getAddress(), p8("110")); // tokenA +10% -> basket +6%
    const shares = await vault.balanceOf(user.address);
    const navOut = await vault.previewRedeem(shares); // capped at collateral (995) pre-fund
    expect(navOut).to.equal(usdc("995"));

    // Treasury tops up so collateral >= NAV; now the holder captures the gain.
    await stable.approve(await vault.getAddress(), usdc("100"));
    await vault.fund(usdc("100"));
    const before = await stable.balanceOf(user.address);
    await vault.connect(user).redeem(shares);
    const got = (await stable.balanceOf(user.address)) - before;
    expect(got).to.equal(usdc("1054.7")); // 995 * 1.06
  });

  it("rebalances value-neutrally with new weights", async () => {
    await vault.connect(user).invest(usdc("1000"));
    const valueBefore = await vault.totalValue();

    await vault.rebalance([2000, 8000], "AI: rotating into NVDA on datacenter capex momentum");

    const valueAfter = await vault.totalValue();
    // allow 1 unit rounding dust in 6-decimals
    expect(valueBefore - valueAfter).to.be.lessThanOrEqual(2n);

    const bVal = (await tokenB.balanceOf(await vault.getAddress())) * p8("200") / 10n ** 20n;
    expect(bVal * 10000n / valueAfter).to.be.closeTo(8000n, 5n);
  });

  it("blocks rebalance from non-manager", async () => {
    await expect(vault.connect(user).rebalance([5000, 5000], "nope")).to.be.reverted;
  });

  it("factory deploys and registers baskets", async () => {
    const factory = await (await ethers.getContractFactory("BasketFactory")).deploy(
      await stable.getAddress(), await oracle.getAddress(), treasury.address
    );
    await factory.createBasket(
      "Factory Basket", "bFAC",
      [await tokenA.getAddress(), await tokenB.getAddress()],
      [5000, 5000], 50, usdc("25")
    );
    expect(await factory.basketCount()).to.equal(1n);
    const vaultAddr = (await factory.allBaskets())[0];
    expect(await factory.isBasket(vaultAddr)).to.equal(true);
  });
});
