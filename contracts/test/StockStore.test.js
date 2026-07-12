const { expect } = require("chai");
const { ethers } = require("hardhat");

const VAULT_ROLE = ethers.keccak256(ethers.toUtf8Bytes("VAULT_ROLE"));
const p8 = (v) => ethers.parseUnits(v, 8);
const usdc = (v) => ethers.parseUnits(v, 6);

describe("StockStore", () => {
  let deployer, user, treasury, stable, oracle, token, store;

  beforeEach(async () => {
    [deployer, user, treasury] = await ethers.getSigners();
    stable = await (await ethers.getContractFactory("MockUSDC")).deploy();
    oracle = await (await ethers.getContractFactory("PriceOracle")).deploy();
    token = await (await ethers.getContractFactory("RWAToken")).deploy("NVIDIA onchain", "NVDAon", "NVIDIA");
    await oracle.setPrice(await token.getAddress(), p8("100"));

    store = await (await ethers.getContractFactory("StockStore")).deploy(
      await stable.getAddress(),
      await oracle.getAddress(),
      treasury.address,
      deployer.address
    );
    await token.grantRole(VAULT_ROLE, await store.getAddress());

    await stable.mint(user.address, usdc("10000"));
    await stable.connect(user).approve(await store.getAddress(), ethers.MaxUint256);
  });

  it("buys stock: mints units to the wallet at oracle price, net of fee", async () => {
    await store.connect(user).buy(await token.getAddress(), usdc("1000"));
    // fee 0.3% of 1000 = 3 -> net 997 at $100 => 9.97 units
    expect(await stable.balanceOf(treasury.address)).to.equal(usdc("3"));
    expect(await token.balanceOf(user.address)).to.equal(ethers.parseEther("9.97"));
  });

  it("sells stock at oracle price when solvent", async () => {
    await store.connect(user).buy(await token.getAddress(), usdc("1000")); // store holds 997
    const units = await token.balanceOf(user.address);
    const before = await stable.balanceOf(user.address);
    await store.connect(user).sell(await token.getAddress(), units);
    expect((await stable.balanceOf(user.address)) - before).to.equal(usdc("997"));
    expect(await token.balanceOf(user.address)).to.equal(0n);
  });

  it("caps sell payout at store collateral in an up market", async () => {
    await store.connect(user).buy(await token.getAddress(), usdc("1000")); // store holds 997
    await oracle.setPriceForce(await token.getAddress(), p8("200")); // +100%
    const units = await token.balanceOf(user.address);
    const before = await stable.balanceOf(user.address);
    await store.connect(user).sell(await token.getAddress(), units);
    // gross would be 1994 but only 997 collateral present -> capped
    expect((await stable.balanceOf(user.address)) - before).to.equal(usdc("997"));
  });

  it("pays full value after treasury funds the gain", async () => {
    await store.connect(user).buy(await token.getAddress(), usdc("1000"));
    await oracle.setPriceForce(await token.getAddress(), p8("110")); // +10%
    await stable.approve(await store.getAddress(), usdc("1000"));
    await store.fund(usdc("1000"));
    const units = await token.balanceOf(user.address);
    const before = await stable.balanceOf(user.address);
    await store.connect(user).sell(await token.getAddress(), units);
    // 9.97 units * $110 = 1096.7
    expect((await stable.balanceOf(user.address)) - before).to.equal(usdc("1096.7"));
  });
});
