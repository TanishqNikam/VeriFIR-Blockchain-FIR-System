/**
 * lib/ipfs.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Pinata IPFS integration — uploads evidence files and FIR metadata to IPFS.
 *
 * WHY IPFS?
 *   Storing FIR data on IPFS gives every document a content-addressed CID.
 *   If the file is tampered with, its CID changes — making tampering detectable.
 *   We anchor the CID + SHA-256 hash on the blockchain so courts can
 *   independently verify that the original submission is unchanged.
 *
 * FAILSAFE — AUTOMATIC RETRY:
 *   Both upload functions retry up to MAX_RETRIES times on transient errors
 *   (network timeouts, Pinata 5xx responses). A short delay is added between
 *   attempts so a brief Pinata hiccup does not immediately fail the user's
 *   FIR filing request.
 *
 * REQUIRED ENV:
 *   PINATA_API_KEY=<your Pinata v1 API key>
 *   PINATA_SECRET_KEY=<your Pinata v1 secret key>
 *
 * RETURNED VALUE:
 *   Both functions return an IPFS CIDv1 string (e.g. "bafkreig...").
 *   Files are retrievable from any public IPFS gateway:
 *     https://gateway.pinata.cloud/ipfs/<CID>
 *     https://cloudflare-ipfs.com/ipfs/<CID>
 */
import axios, { AxiosError } from "axios";
import FormData from "form-data";

const PINATA_BASE = "https://api.pinata.cloud";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1500; // wait 1.5 s between attempts

interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

/** Returns true for errors worth retrying (network glitch, Pinata 5xx). */
function isRetryable(err: unknown): boolean {
  if (err instanceof AxiosError) {
    // No response at all = network/timeout error
    if (!err.response) return true;
    // Pinata server error — may recover quickly
    if (err.response.status >= 500) return true;
  }
  return false;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Upload a binary file buffer to IPFS via Pinata's pin-file endpoint.
 * Retries up to MAX_RETRIES times on transient failures.
 * @returns The IPFS CIDv1 string for the uploaded file.
 */
export async function uploadFileToPinata(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const form = new FormData();
      form.append("file", fileBuffer, {
        filename: fileName,
        contentType: mimeType,
      });
      form.append("pinataMetadata", JSON.stringify({ name: fileName }));
      form.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

      const { data } = await axios.post<PinataResponse>(
        `${PINATA_BASE}/pinning/pinFileToIPFS`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            pinata_api_key: process.env.PINATA_API_KEY!,
            pinata_secret_api_key: process.env.PINATA_SECRET_KEY!,
          },
          maxBodyLength: Infinity,
          timeout: 30_000, // 30 s per attempt
        }
      );

      return data.IpfsHash;
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || attempt === MAX_RETRIES) break;
      console.warn(`[IPFS] uploadFileToPinata attempt ${attempt} failed — retrying in ${RETRY_DELAY_MS}ms`);
      await sleep(RETRY_DELAY_MS);
    }
  }

  throw lastError;
}

/**
 * Upload a JSON object to IPFS via Pinata's pin-JSON endpoint.
 * Retries up to MAX_RETRIES times on transient failures.
 * @returns The IPFS CIDv1 string for the uploaded JSON document.
 */
export async function uploadJSONToPinata(
  content: object,
  name: string
): Promise<string> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { data } = await axios.post<PinataResponse>(
        `${PINATA_BASE}/pinning/pinJSONToIPFS`,
        {
          pinataContent: content,
          pinataMetadata: { name },
          pinataOptions: { cidVersion: 1 },
        },
        {
          headers: {
            "Content-Type": "application/json",
            pinata_api_key: process.env.PINATA_API_KEY!,
            pinata_secret_api_key: process.env.PINATA_SECRET_KEY!,
          },
          timeout: 15_000, // 15 s per attempt
        }
      );

      return data.IpfsHash;
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || attempt === MAX_RETRIES) break;
      console.warn(`[IPFS] uploadJSONToPinata attempt ${attempt} failed — retrying in ${RETRY_DELAY_MS}ms`);
      await sleep(RETRY_DELAY_MS);
    }
  }

  throw lastError;
}
