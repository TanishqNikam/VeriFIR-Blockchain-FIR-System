/**
 * lib/ipfs.ts
 * Pinata IPFS integration.
 * Uploads files and JSON metadata to IPFS via the Pinata API.
 */
import axios from "axios";
import FormData from "form-data";

const PINATA_BASE = "https://api.pinata.cloud";

interface PinataFileResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

interface PinataJSONResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

/**
 * Upload a file buffer to IPFS via Pinata.
 * @returns IPFS CID (v1)
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
  form.append("pinataMetadata", JSON.stringify({ name: fileName }));
  form.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

  const { data } = await axios.post<PinataFileResponse>(
    `${PINATA_BASE}/pinning/pinFileToIPFS`,
    form,
    {
      headers: {
        ...form.getHeaders(),
        pinata_api_key: process.env.PINATA_API_KEY!,
        pinata_secret_api_key: process.env.PINATA_SECRET_KEY!,
      },
      maxBodyLength: Infinity, // allow large files
    }
  );

  return data.IpfsHash;
}

/**
 * Upload a JSON object to IPFS via Pinata.
 * @returns IPFS CID (v1)
 */
export async function uploadJSONToPinata(
  content: object,
  name: string
): Promise<string> {
  const { data } = await axios.post<PinataJSONResponse>(
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
