/**
 * lib/blockchain.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Ethers.js integration with the FIRRegistry smart contract on a local Hardhat
 * (or any EVM-compatible) network.
 *
 * ARCHITECTURE:
 *   - All blockchain calls are fire-and-forget from API routes (non-blocking).
 *     FIRs are saved to MongoDB first; the chain call updates the record when
 *     it confirms. This means a chain outage never breaks FIR filing.
 *
 * TWO SIGNER ROLES:
 *   CITIZEN_SIGNER_PRIVATE_KEY  → registers FIRs and appeals
 *   POLICE_SIGNER_PRIVATE_KEY   → verifies FIRs and records status changes
 *   Having separate on-chain addresses proves WHICH party acted.
 *
 * REQUIRED ENV:
 *   RPC_URL=http://127.0.0.1:8545          (Hardhat node, default)
 *   CONTRACT_ADDRESS=0x...                 (output of npm run deploy)
 *   DEPLOYER_PRIVATE_KEY=0x...
 *   CITIZEN_SIGNER_PRIVATE_KEY=0x...
 *   POLICE_SIGNER_PRIVATE_KEY=0x...
 *   (All three keys are printed by the deploy script)
 *
 * SINGLETON PATTERN:
 *   Provider and signer instances are cached at module level to avoid creating
 *   a new WebSocket/HTTP connection on every API call.
 */
import { ethers } from "ethers";
import FIRRegistryArtifact from "@/lib/contracts/FIRRegistry.json";

// ── Singleton provider ─────────────────────────────────────────────────────────
let _provider: ethers.JsonRpcProvider | null = null;

function getProvider(): ethers.JsonRpcProvider {
  if (!_provider) {
    const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
    _provider = new ethers.JsonRpcProvider(rpcUrl);
  }
  return _provider;
}

// ── Role-based signer cache ────────────────────────────────────────────────────
// Each role maps to a distinct Hardhat account so on-chain records show
// different `msg.sender` values for citizens vs. police officers.
//
//   deployer → DEPLOYER_PRIVATE_KEY        (Hardhat account #0)
//   citizen  → CITIZEN_SIGNER_PRIVATE_KEY  (Hardhat account #2, fallback: deployer)
//   police   → POLICE_SIGNER_PRIVATE_KEY   (Hardhat account #1, fallback: deployer)
export type SignerRole = "deployer" | "police" | "citizen";

const _signerCache = new Map<string, ethers.Wallet>();

function getSignerByRole(role: SignerRole = "deployer"): ethers.Wallet {
  const keyEnvMap: Record<SignerRole, string> = {
    deployer: "DEPLOYER_PRIVATE_KEY",
    police: "POLICE_SIGNER_PRIVATE_KEY",
    citizen: "CITIZEN_SIGNER_PRIVATE_KEY",
  };
  // Fall back to deployer key if role-specific key is not configured
  const privateKey =
    process.env[keyEnvMap[role]] ?? process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error(
      `${keyEnvMap[role]} (or DEPLOYER_PRIVATE_KEY) is not set in .env.local.\n` +
        "Use Hardhat account private keys from `npx hardhat node` output."
    );
  }
  if (!_signerCache.has(privateKey)) {
    _signerCache.set(privateKey, new ethers.Wallet(privateKey, getProvider()));
  }
  return _signerCache.get(privateKey)!;
}

function getContractWithRole(role: SignerRole = "deployer"): ethers.Contract {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error(
      "CONTRACT_ADDRESS is not set in .env.local.\n" +
        "Deploy the contract first: cd blockchain && npm run deploy"
    );
  }
  return new ethers.Contract(
    contractAddress,
    FIRRegistryArtifact.abi,
    getSignerByRole(role)
  );
}

// Read-only contract — no signer needed for view calls, uses provider directly
let _readContract: ethers.Contract | null = null;

function getReadContract(): ethers.Contract {
  if (!_readContract) {
    const contractAddress = process.env.CONTRACT_ADDRESS;
    if (!contractAddress)
      throw new Error("CONTRACT_ADDRESS is not set in .env.local.");
    _readContract = new ethers.Contract(
      contractAddress,
      FIRRegistryArtifact.abi,
      getProvider()
    );
  }
  return _readContract;
}

// ── Public interface ───────────────────────────────────────────────────────────

export interface RegisterFIRResult {
  txHash: string;
  blockNumber: number;
}

/**
 * Call registerFIR() on the smart contract and wait for confirmation.
 * Uses CITIZEN_SIGNER_PRIVATE_KEY so the citizen's wallet appears as registeredBy.
 */
export async function registerFIROnChain(
  firId: string,
  cid: string,
  dataHash: string,
  signerRole: SignerRole = "citizen"
): Promise<RegisterFIRResult> {
  const contract = getContractWithRole(signerRole);
  const tx = await contract.registerFIR(firId, cid, dataHash);
  const receipt: ethers.TransactionReceipt = await tx.wait(1);
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
  const contract = getReadContract();
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
 * Uses POLICE_SIGNER_PRIVATE_KEY so the officer's wallet appears as verifiedBy.
 */
export async function verifyFIROnChain(
  firId: string,
  signerRole: SignerRole = "police"
): Promise<RegisterFIRResult> {
  const contract = getContractWithRole(signerRole);
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
  const contract = getReadContract();
  return contract.isFIRRegistered(firId) as Promise<boolean>;
}

// ── On-chain status history ────────────────────────────────────────────────────

export interface OnChainStatusEntry {
  status: string;
  updatedBy: string; // wallet address of the actor
  timestamp: number; // unix seconds (block.timestamp)
}

/**
 * Read the full on-chain status history for a FIR.
 * Each entry is append-only — immutable once written.
 */
export async function getOnChainStatusHistory(
  firId: string
): Promise<OnChainStatusEntry[]> {
  const contract = getReadContract();
  const count = Number(await contract.getStatusHistoryCount(firId));
  const entries: OnChainStatusEntry[] = [];
  for (let i = 0; i < count; i++) {
    const [status, updatedBy, timestamp] = await contract.getStatusHistory(
      firId,
      i
    );
    entries.push({
      status: String(status),
      updatedBy: String(updatedBy),
      timestamp: Number(timestamp),
    });
  }
  return entries;
}

// ── On-chain verification record ──────────────────────────────────────────────

export interface OnChainVerification {
  verifiedBy: string; // wallet address of the verifying officer
  timestamp: number;  // unix seconds
  exists: boolean;
}

/**
 * Get the on-chain verification record for a FIR.
 * Returns exists=false if the FIR has not been verified on-chain yet.
 */
export async function getVerificationFromChain(
  firId: string
): Promise<OnChainVerification> {
  const contract = getReadContract();
  const [verifiedBy, timestamp, exists] = await contract.getVerification(firId);
  return {
    verifiedBy: String(verifiedBy),
    timestamp: Number(timestamp),
    exists: Boolean(exists),
  };
}

// ── Registry statistics ────────────────────────────────────────────────────────

/**
 * Get the total number of FIRs registered on-chain (public `firCount` variable).
 */
export async function getFIRCount(): Promise<number> {
  const contract = getReadContract();
  return Number(await contract.firCount());
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
export async function getContractEvents(
  fromBlock: number | "earliest" = 0
): Promise<ContractEvent[]> {
  const contract = getReadContract();
  const provider = getProvider();

  const [createdLogs, verifiedLogs, statusLogs] = await Promise.all([
    contract.queryFilter(contract.filters.FIRCreated(), fromBlock),
    contract.queryFilter(contract.filters.FIRVerified(), fromBlock),
    contract.queryFilter(contract.filters.StatusUpdated(), fromBlock),
  ]);

  const results: ContractEvent[] = [];

  for (const log of createdLogs) {
    const parsed = contract.interface.parseLog({
      topics: [...log.topics],
      data: log.data,
    });
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
      extra: {
        cid: String(parsed.args[1] ?? ""),
        dataHash: String(parsed.args[2] ?? ""),
      },
    });
  }

  for (const log of verifiedLogs) {
    const parsed = contract.interface.parseLog({
      topics: [...log.topics],
      data: log.data,
    });
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
    const parsed = contract.interface.parseLog({
      topics: [...log.topics],
      data: log.data,
    });
    if (!parsed) continue;
    // Skip StatusUpdated for "pending" — FIRCreated already covers registration
    const status = String(parsed.args[1] ?? "");
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
 * The `signerRole` determines which private key signs the transaction.
 * Police actions use POLICE_SIGNER_PRIVATE_KEY so the officer's wallet is recorded.
 */
export async function updateFIRStatusOnChain(
  firId: string,
  status: string,
  signerRole: SignerRole = "police"
): Promise<RegisterFIRResult> {
  const contract = getContractWithRole(signerRole);
  const tx = await contract.updateStatus(firId, status);
  const receipt: ethers.TransactionReceipt = await tx.wait(1);
  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
  };
}

// ── Real-time contract event listener ─────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var _contractListenerActive: boolean | undefined;
}

/**
 * Initialize a persistent contract event listener that bridges on-chain events
 * to the in-process SSE emitter. Safe to call multiple times — only runs once.
 * Uses globalThis to survive Next.js HMR reloads in development.
 */
export function initContractEventListener(): void {
  if (globalThis._contractListenerActive) return;
  try {
    const contract = getReadContract();

    contract.on(
      "FIRCreated",
      async (firId, _cid, _dataHash, _timestamp, registeredBy) => {
        try {
          const { emitNewFIR } = await import("@/lib/sse-emitter");
          emitNewFIR({
            firId: String(firId),
            citizenId: String(registeredBy),
            citizenName: "On-chain",
            title: `New FIR on-chain: ${String(firId)}`,
          });
        } catch { /* best-effort */ }
      }
    );

    contract.on("FIRVerified", async (firId, verifiedBy) => {
      try {
        const { emitFIRUpdate } = await import("@/lib/sse-emitter");
        emitFIRUpdate({
          firId: String(firId),
          status: "verified",
          citizenId: "",
          title: `FIR verified on-chain: ${String(firId)}`,
          updatedBy: String(verifiedBy),
        });
      } catch { /* best-effort */ }
    });

    contract.on("StatusUpdated", async (firId, status, updatedBy) => {
      try {
        const statusStr = String(status);
        if (statusStr === "pending") return;
        const { emitFIRUpdate } = await import("@/lib/sse-emitter");
        emitFIRUpdate({
          firId: String(firId),
          status: statusStr,
          citizenId: "",
          title: `Status → ${statusStr}: ${String(firId)}`,
          updatedBy: String(updatedBy),
        });
      } catch { /* best-effort */ }
    });

    globalThis._contractListenerActive = true;
  } catch (err) {
    console.warn("[blockchain] Could not start contract event listener:", err);
  }
}
