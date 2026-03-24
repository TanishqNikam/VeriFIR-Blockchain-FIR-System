import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();

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

  // ─── 1. Write contract address to .env.contract ─────────────────────────────
  // The Next.js app reads CONTRACT_ADDRESS from .env.local.
  // After deployment, copy the value below into your .env.local file.
  const envContractPath = path.resolve(__dirname, "../../.env.contract");
  fs.writeFileSync(envContractPath, `CONTRACT_ADDRESS=${address}\n`);
  console.log("\nContract address written to: .env.contract");
  console.log(">>> Copy CONTRACT_ADDRESS from .env.contract into your .env.local <<<");

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

  // ─── 3. Print deployer private key hint ──────────────────────────────────────
  console.log("\nHardhat default account #0 private key:");
  console.log("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
  console.log(">>> Add this as DEPLOYER_PRIVATE_KEY in your .env.local <<<");
  console.log("\nDeployment complete.");
  console.log("=".repeat(50));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
