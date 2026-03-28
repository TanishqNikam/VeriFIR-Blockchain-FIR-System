import { ethers } from "hardhat";
import fs from "fs";
import path from "path";
import * as dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function main() {
  const signers = await ethers.getSigners();
  const deployer = signers[0];

  // On Sepolia only the deployer wallet is configured as a signer.
  // Citizen and police wallets are authorized by address (from .env).
  const citizenAddress = process.env.CITIZEN_WALLET_ADDRESS || "";
  const policeAddress  = process.env.POLICE_WALLET_ADDRESS  || "";

  if (!citizenAddress || !policeAddress) {
    throw new Error(
      "CITIZEN_WALLET_ADDRESS and POLICE_WALLET_ADDRESS must be set in blockchain/.env"
    );
  }

  const network = await ethers.provider.getNetwork();
  console.log("=".repeat(50));
  console.log("Deploying FIRRegistry contract");
  console.log("Network:  ", network.name, `(chainId: ${network.chainId})`);
  console.log("Deployer: ", deployer.address);
  console.log("Balance:  ", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("=".repeat(50));

  const FIRRegistry = await ethers.getContractFactory("FIRRegistry");
  const contract = await FIRRegistry.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("\nFIRRegistry deployed to:", address);

  // ─── Authorize server wallets ─────────────────────────────────────────────
  console.log("\nAuthorizing server wallets…");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = contract as any;

  const tx1 = await c.authorize(citizenAddress);
  await tx1.wait();
  console.log(`  Citizen wallet authorized:  ${citizenAddress}`);

  const tx2 = await c.authorize(policeAddress);
  await tx2.wait();
  console.log(`  Police wallet authorized:   ${policeAddress}`);

  // ─── 1. Write contract address to .env.contract ──────────────────────────
  const envContractPath = path.resolve(__dirname, "../../.env.contract");
  const envLines = [
    `CONTRACT_ADDRESS=${address}`,
    `NEXT_PUBLIC_CONTRACT_ADDRESS=${address}`,
    "",
  ].join("\n");

  fs.writeFileSync(envContractPath, envLines);
  console.log("\nContract address written to: .env.contract");
  console.log(">>> Add these values to your .env.local <<<");

  // ─── 2. Copy ABI to lib/contracts so Next.js can import it ───────────────
  const artifactPath = path.resolve(
    __dirname,
    "../artifacts/contracts/FIRRegistry.sol/FIRRegistry.json"
  );
  const abiDestDir  = path.resolve(__dirname, "../../lib/contracts");
  const abiDestPath = path.join(abiDestDir, "FIRRegistry.json");

  if (fs.existsSync(artifactPath)) {
    if (!fs.existsSync(abiDestDir)) fs.mkdirSync(abiDestDir, { recursive: true });
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    fs.writeFileSync(
      abiDestPath,
      JSON.stringify({ abi: artifact.abi, contractName: artifact.contractName }, null, 2)
    );
    console.log("ABI copied to: lib/contracts/FIRRegistry.json");
  } else {
    console.warn("Artifact not found — run `npm run compile` first.");
  }

  console.log("\nDeployment summary:");
  console.log("  Contract:  ", address);
  console.log("  Deployer:  ", deployer.address);
  console.log("  Citizen:   ", citizenAddress);
  console.log("  Police:    ", policeAddress);
  console.log("\nDeployment complete.");
  console.log("=".repeat(50));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
