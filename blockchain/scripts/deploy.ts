import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  // Hardhat test accounts used as citizen/police server wallets
  const citizenWallet  = signers[1]; // account #1
  const policeWallet   = signers[2]; // account #2

  console.log("=".repeat(50));
  console.log("Deploying FIRRegistry contract");
  console.log("Network:  localhost (Hardhat)");
  console.log("Deployer:", deployer.address);
  console.log("Balance: ", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("=".repeat(50));

  const FIRRegistry = await ethers.getContractFactory("FIRRegistry");
  const contract = await FIRRegistry.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("\nFIRRegistry deployed to:", address);

  // ─── Authorize server wallets ─────────────────────────────────────────────
  // Citizen wallet registers FIRs; police wallet verifies and updates statuses.
  // The deployer is already authorized in the constructor.
  console.log("\nAuthorizing server wallets…");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = contract as any;
  const tx1 = await c.authorize(citizenWallet.address);
  await tx1.wait();
  console.log(`  Citizen wallet authorized:  ${citizenWallet.address}`);

  const tx2 = await c.authorize(policeWallet.address);
  await tx2.wait();
  console.log(`  Police wallet authorized:   ${policeWallet.address}`);

  // ─── 1. Write contract address + wallet keys to .env.contract ───────────────
  const envContractPath = path.resolve(__dirname, "../../.env.contract");
  const hardhatAccounts = [
    { name: "deployer",   address: deployer.address,      key: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" },
    { name: "citizen",    address: citizenWallet.address,  key: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" },
    { name: "police",     address: policeWallet.address,   key: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a" },
  ];

  const envLines = [
    `CONTRACT_ADDRESS=${address}`,
    `DEPLOYER_PRIVATE_KEY=${hardhatAccounts[0].key}`,
    `CITIZEN_PRIVATE_KEY=${hardhatAccounts[1].key}`,
    `POLICE_PRIVATE_KEY=${hardhatAccounts[2].key}`,
    "",
  ].join("\n");

  fs.writeFileSync(envContractPath, envLines);
  console.log("\nContract address + wallet keys written to: .env.contract");
  console.log(">>> Copy these values into your .env.local <<<");

  // ─── 2. Copy ABI to lib/contracts so Next.js can import it ───────────────────
  const artifactPath = path.resolve(
    __dirname,
    "../artifacts/contracts/FIRRegistry.sol/FIRRegistry.json"
  );
  const abiDestDir = path.resolve(__dirname, "../../lib/contracts");
  const abiDestPath = path.join(abiDestDir, "FIRRegistry.json");

  if (fs.existsSync(artifactPath)) {
    if (!fs.existsSync(abiDestDir)) fs.mkdirSync(abiDestDir, { recursive: true });
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    // Only save the ABI, not the full artifact
    fs.writeFileSync(
      abiDestPath,
      JSON.stringify({ abi: artifact.abi, contractName: artifact.contractName }, null, 2)
    );
    console.log("ABI copied to: lib/contracts/FIRRegistry.json");
  } else {
    console.warn("Artifact not found — run `npm run compile` first, then `npm run deploy`.");
  }

  console.log("\nDeployment summary:");
  console.log("  Contract:       ", address);
  for (const acc of hardhatAccounts) {
    console.log(`  ${acc.name.padEnd(12)} ${acc.address}`);
  }
  console.log("\nDeployment complete.");
  console.log("=".repeat(50));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
