// Full protocol deployment for Moltiply on HashKey Chain.
//
//   npx hardhat run scripts/deploy.js --network hashkeyTestnet
//   npx hardhat run scripts/deploy.js --network hashkey        (mainnet)
//
// Env:
//   DEPLOYER_PRIVATE_KEY  required
//   STABLE_ADDRESS        optional; use an existing stable (e.g. USDC.e
//                         0x054ed45810DbBAb8B27668922D110669c9D88D0a on mainnet).
//                         If unset, MockUSDC is deployed (recommended for demo,
//                         it has a faucet so judges can try the flow).
//
// Writes deployments/<network>.json with every address, consumed by web/ and server/.

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const { ASSETS, BASKETS } = require("./data");

const VAULT_ROLE = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("VAULT_ROLE"));

function toPrice8(p) {
  // "108.96" -> 10896000000n
  return hre.ethers.parseUnits(p, 8);
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;
  console.log(`Deploying to ${network} as ${deployer.address}`);
  console.log(`Balance: ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address))} HSK`);

  // 1. Stable
  let stableAddress = process.env.STABLE_ADDRESS;
  let mockUsdc = null;
  if (!stableAddress) {
    const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
    mockUsdc = await MockUSDC.deploy();
    await mockUsdc.waitForDeployment();
    stableAddress = await mockUsdc.getAddress();
    console.log(`MockUSDC: ${stableAddress}`);
  } else {
    console.log(`Using existing stable: ${stableAddress}`);
  }

  // 2. Oracle
  const PriceOracle = await hre.ethers.getContractFactory("PriceOracle");
  const oracle = await PriceOracle.deploy();
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();
  console.log(`PriceOracle: ${oracleAddress}`);

  // 3. RWA tokens
  const RWAToken = await hre.ethers.getContractFactory("RWAToken");
  const tokenAddresses = {};
  for (const a of ASSETS) {
    const token = await RWAToken.deploy(a.name, a.symbol, a.underlying);
    await token.waitForDeployment();
    tokenAddresses[a.symbol] = await token.getAddress();
    console.log(`  ${a.symbol}: ${tokenAddresses[a.symbol]}`);
  }

  // 4. Initial prices (batched)
  const addrs = ASSETS.map((a) => tokenAddresses[a.symbol]);
  const prices = ASSETS.map((a) => toPrice8(a.price));
  await (await oracle.setPrices(addrs, prices)).wait();
  console.log("Initial prices posted");

  // 4b. Grant the off-chain price pusher UPDATER_ROLE so the server's cron can
  //     push fresh prices on-chain. Defaults to the deployer if unset.
  const UPDATER_ROLE = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("UPDATER_ROLE"));
  const updater = process.env.ORACLE_UPDATER_ADDRESS;
  if (updater && updater.toLowerCase() !== deployer.address.toLowerCase()) {
    await (await oracle.grantRole(UPDATER_ROLE, updater)).wait();
    console.log(`Granted UPDATER_ROLE to ${updater}`);
  }

  // 5. Factory
  const BasketFactory = await hre.ethers.getContractFactory("BasketFactory");
  const factory = await BasketFactory.deploy(stableAddress, oracleAddress, deployer.address);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log(`BasketFactory: ${factoryAddress}`);

  // 6. Baskets
  const basketAddresses = {};
  for (const b of BASKETS) {
    const assets = b.allocation.map(([sym]) => tokenAddresses[sym]);
    const weights = b.allocation.map(([, w]) => w);
    const minInvest = hre.ethers.parseUnits(b.minInvest, 6);
    const tx = await factory.createBasket(b.name, b.symbol, assets, weights, b.entryFeeBps, minInvest);
    const receipt = await tx.wait();
    const event = receipt.logs
      .map((l) => { try { return factory.interface.parseLog(l); } catch { return null; } })
      .find((e) => e && e.name === "BasketCreated");
    const vault = event.args.vault;
    basketAddresses[b.slug] = vault;
    console.log(`  ${b.slug}: ${vault}`);

    // Grant mint/burn rights on every underlying token to this vault.
    for (const [sym] of b.allocation) {
      const token = await hre.ethers.getContractAt("RWAToken", tokenAddresses[sym]);
      await (await token.grantRole(VAULT_ROLE, vault)).wait();
    }
  }

  // 6b. StockStore: direct single-stock buy/sell. Grant it mint/burn on every
  //     token so any listed stock is tradable on its own.
  const StockStore = await hre.ethers.getContractFactory("StockStore");
  const store = await StockStore.deploy(stableAddress, oracleAddress, deployer.address, deployer.address);
  await store.waitForDeployment();
  const storeAddress = await store.getAddress();
  console.log(`StockStore: ${storeAddress}`);
  for (const a of ASSETS) {
    const token = await hre.ethers.getContractAt("RWAToken", tokenAddresses[a.symbol]);
    await (await token.grantRole(VAULT_ROLE, storeAddress)).wait();
  }
  console.log("Granted StockStore mint/burn on all tokens");

  // 7. Persist
  const out = {
    network,
    chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    stable: stableAddress,
    stableIsMock: !!mockUsdc,
    oracle: oracleAddress,
    stockStore: storeAddress,
    factory: factoryAddress,
    tokens: tokenAddresses,
    baskets: basketAddresses,
  };
  const dir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(dir, { recursive: true });
  const json = JSON.stringify(out, null, 2);
  fs.writeFileSync(path.join(dir, `${network}.json`), json);

  // Propagate to the web app and server so they pick up fresh addresses.
  const targets = [
    path.join(__dirname, "..", "..", "web", "src", "lib", "deployment.json"),
    path.join(__dirname, "..", "..", "server", "deployment.json"),
  ];
  for (const t of targets) {
    try {
      fs.writeFileSync(t, json);
      console.log(`Copied to ${t}`);
    } catch (e) {
      console.warn(`Could not copy to ${t}: ${e.message}`);
    }
  }
  console.log(`\nSaved deployments/${network}.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
