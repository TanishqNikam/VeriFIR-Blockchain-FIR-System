/**
 * lib/blockchain.ts
 * Ethers.js integration for the FIRRegistry smart contract.
 * Connects to the local Hardhat node and interacts with the deployed contract.
 */
import { ethers } from "ethers";
import FIRRegistryArtifact from "@/lib/contracts/FIRRegistry.json";

// ── Singleton provider / signer / contract ─────────────────────────────────────
let _provider: ethers.JsonRpcProvider | null = null;
let _signer: ethers.Wallet | null = null;
let _contract: ethers.Contract | null = null;

function getProvider(): ethers.JsonRpcProvider {
  if (!_provider) {
    const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
    _provider = new ethers.JsonRpcProvider(rpcUrl);
  }
  return _provider;
}

function getSigner(): ethers.Wallet {
  if (!_signer) {
    const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error(
        "DEPLOYER_PRIVATE_KEY is not set in .env.local.\n" +
          "Use account #0 private key from `npx hardhat node` output."
      );
    }
    _signer = new ethers.Wallet(privateKey, getProvider());
  }
  return _signer;
}

function getContract(): ethers.Contract {
  if (!_contract) {
    const contractAddress = process.env.CONTRACT_ADDRESS;
    if (!contractAddress) {
      throw new Error(
        "CONTRACT_ADDRESS is not set in .env.local.\n" +
          "Deploy the contract first: cd blockchain && npm run deploy"
      );
    }
    _contract = new ethers.Contract(
      contractAddress,
      FIRRegistryArtifact.abi,
      getSigner()
    );
  }
  return _contract;
}

// ── Public interface ───────────────────────────────────────────────────────────

export interface RegisterFIRResult {
  txHash: string;
  blockNumber: number;
}

/**
 * Call registerFIR() on the smart contract and wait for confirmation.
 */
export async function registerFIROnChain(
  firId: string,
  cid: string,
  dataHash: string
): Promise<RegisterFIRResult> {
  const contract = getContract();
  const tx = await contract.registerFIR(firId, cid, dataHash);
  const receipt: ethers.TransactionReceipt = await tx.wait(1); // wait 1 confirmation

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
  };
}

export interface ChainFIRData {
  firId: string;
  cid: string;
  dataHash: string;
  timestamp: number;
  registeredBy: string;
}

/**
 * Read FIR data from the contract (view call — no gas).
 */
export async function getFIRFromChain(firId: string): Promise<ChainFIRData> {
  const contract = getContract();
  const result = await contract.getFIR(firId);

  return {
    firId: result[0] as string,
    cid: result[1] as string,
    dataHash: result[2] as string,
    timestamp: Number(result[3]),
    registeredBy: result[4] as string,
  };
}

/**
 * Call verifyFIR() on the smart contract — records police endorsement on-chain.
 */
export async function verifyFIROnChain(firId: string): Promise<RegisterFIRResult> {
  const contract = getContract();
  const tx = await contract.verifyFIR(firId);
  const receipt: ethers.TransactionReceipt = await tx.wait(1);
  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
  };
}

/**
 * Check on-chain if a FIR has already been registered.
 */
export async function isFIROnChain(firId: string): Promise<boolean> {
  const contract = getContract();
  return contract.isFIRRegistered(firId) as Promise<boolean>;
}

// ── Event log queries ──────────────────────────────────────────────────────────

export interface ContractEvent {
  event: "FIRCreated" | "FIRVerified" | "StatusUpdated";
  firId: string;
  txHash: string;
  blockNumber: number;
  timestamp?: number;
  walletAddress: string;
  /** Extra fields depending on event type */
  extra?: Record<string, string>;
}

/**
 * Query all FIRCreated, FIRVerified, and StatusUpdated events from the
 * contract starting at `fromBlock`. Returns them sorted oldest-first.
 */
export async function getContractEvents(fromBlock: number | "earliest" = 0): Promise<ContractEvent[]> {
  const contract = getContract();
  const provider = getProvider();

  const [createdLogs, verifiedLogs, statusLogs] = await Promise.all([
    contract.queryFilter(contract.filters.FIRCreated(), fromBlock),
    contract.queryFilter(contract.filters.FIRVerified(), fromBlock),
    contract.queryFilter(contract.filters.StatusUpdated(), fromBlock),
  ]);

  const results: ContractEvent[] = [];

  for (const log of createdLogs) {
    const parsed = contract.interface.parseLog({ topics: [...log.topics], data: log.data });
    if (!parsed) continue;
    let timestamp: number | undefined;
    try {
      const block = await provider.getBlock(log.blockNumber);
      timestamp = block?.timestamp ? Number(block.timestamp) : undefined;
    } catch { /* best-effort */ }
    results.push({
      event: "FIRCreated",
      firId: String(parsed.args[0] ?? ""),
      txHash: log.transactionHash,
      blockNumber: log.blockNumber,
      timestamp,
      walletAddress: String(parsed.args[4] ?? ""),
      extra: { cid: String(parsed.args[1] ?? ""), dataHash: String(parsed.args[2] ?? "") },
    });
  }

  for (const log of verifiedLogs) {
    const parsed = contract.interface.parseLog({ topics: [...log.topics], data: log.data });
    if (!parsed) continue;
    let timestamp: number | undefined;
    try {
      const block = await provider.getBlock(log.blockNumber);
      timestamp = block?.timestamp ? Number(block.timestamp) : undefined;
    } catch { /* best-effort */ }
    results.push({
      event: "FIRVerified",
      firId: String(parsed.args[0] ?? ""),
      txHash: log.transactionHash,
      blockNumber: log.blockNumber,
      timestamp,
      walletAddress: String(parsed.args[1] ?? ""),
    });
  }

  for (const log of statusLogs) {
    const parsed = contract.interface.parseLog({ topics: [...log.topics], data: log.data });
    if (!parsed) continue;
    // Skip StatusUpdated for "pending" (emitted at registration) — FIRCreated covers it
    const status = parsed.args[1] as string;
    if (status === "pending") continue;
    let timestamp: number | undefined;
    try {
      const block = await provider.getBlock(log.blockNumber);
      timestamp = block?.timestamp ? Number(block.timestamp) : undefined;
    } catch { /* best-effort */ }
    results.push({
      event: "StatusUpdated",
      firId: String(parsed.args[0] ?? ""),
      txHash: log.transactionHash,
      blockNumber: log.blockNumber,
      timestamp,
      walletAddress: String(parsed.args[2] ?? ""),
      extra: { status },
    });
  }

  // Sort by block number ascending
  results.sort((a, b) => a.blockNumber - b.blockNumber);
  return results;
}

/**
 * Record a status change on-chain (under-verification, rejected, etc.)
 */
export async function updateFIRStatusOnChain(
  firId: string,
  status: string
): Promise<RegisterFIRResult> {
  const contract = getContract();
  const tx = await contract.updateStatus(firId, status);
  const receipt: ethers.TransactionReceipt = await tx.wait(1);
  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
  };
}
