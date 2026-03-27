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
import axios from "axios";
import FormData from "form-data";

const PINATA_BASE = "https://api.pinata.cloud";

interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

/**
 * Upload a binary file buffer to IPFS via Pinata's pin-file endpoint.
 * @returns The IPFS CIDv1 string for the uploaded file.
 */
export async function uploadFileToPinata(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  const form = new FormData();
  form.append("file", fileBuffer, {
    filename: fileName,
    contentType: mimeType,
  });
  // Human-readable label shown in Pinata dashboard
  form.append("pinataMetadata", JSON.stringify({ name: fileName }));
  // Use CIDv1 (base32) — more standards-compliant than v0
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
      maxBodyLength: Infinity, // allow large video files up to the per-file limit
    }
  );

  return data.IpfsHash;
}

/**
 * Upload a JSON object to IPFS via Pinata's pin-JSON endpoint.
 * Used for FIR metadata documents (title, description, evidence refs, hash).
 * @returns The IPFS CIDv1 string for the uploaded JSON document.
 */
export async function uploadJSONToPinata(
  content: object,
  name: string
): Promise<string> {
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
    }
  );

  return data.IpfsHash;
}
