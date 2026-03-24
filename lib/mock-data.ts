import type { FIR, BlockchainLog, User } from "./types"

export const mockUsers: User[] = [
  {
    id: "citizen-001",
    email: "rahul.sharma@email.com",
    name: "Rahul Sharma",
    role: "citizen",
  },
  {
    id: "police-001",
    email: "inspector.singh@police.gov.in",
    name: "Inspector Ajay Singh",
    role: "police",
    walletAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD58",
  },
  {
    id: "admin-001",
    email: "admin@gov.in",
    name: "System Administrator",
    role: "admin",
    walletAddress: "0x8Ba1f109551bD432803012645Ac136E8dc8F2Ac",
  },
]

export const mockFIRs: FIR[] = [
  {
    id: "FIR-2024-001",
    title: "Vehicle Theft Report",
    description:
      "My two-wheeler (Honda Activa) was stolen from outside City Mall parking area on 15th January 2024 around 8:30 PM. Vehicle registration number: MH-12-AB-1234.",
    location: "City Mall, MG Road, Pune",
    incidentDate: "2024-01-15",
    filedDate: "2024-01-16",
    status: "verified",
    citizenId: "citizen-001",
    citizenName: "Rahul Sharma",
    policeVerifierId: "police-001",
    policeVerifierName: "Inspector Ajay Singh",
    ipfsCid: "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
    blockchainTxHash: "0x8f7d8a9e3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e",
    storedHash: "a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a",
    computedHash: "a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a",
    evidenceFiles: [
      {
        id: "ev-001",
        name: "parking_cctv_footage.mp4",
        type: "video/mp4",
        size: 15728640,
        ipfsCid: "QmT5NvUtoM5nWFfrQdVrFtvGfKFmG7AHE8P34isapyhCxX",
        uploadedAt: "2024-01-16T10:30:00Z",
      },
      {
        id: "ev-002",
        name: "vehicle_registration.pdf",
        type: "application/pdf",
        size: 524288,
        ipfsCid: "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
        uploadedAt: "2024-01-16T10:35:00Z",
      },
    ],
  },
  {
    id: "FIR-2024-002",
    title: "Assault Incident",
    description:
      "Physical assault by unknown individuals near Railway Station at approximately 11 PM. Sustained minor injuries and personal belongings were damaged.",
    location: "Railway Station Area, Mumbai",
    incidentDate: "2024-01-20",
    filedDate: "2024-01-21",
    status: "pending",
    citizenId: "citizen-002",
    citizenName: "Priya Patel",
    ipfsCid: "QmRf22bZar3WKmojipms22PkXH1MZGmvsqzQtuSvQE3uhm",
    blockchainTxHash: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
    storedHash: "b8ffc7f9cf2fe87762d25867b172e773f691ff5ef54c5afb93e91b5c91f9545b",
    evidenceFiles: [
      {
        id: "ev-003",
        name: "injury_photos.zip",
        type: "application/zip",
        size: 2097152,
        ipfsCid: "QmSomeNewCidForEvidence003",
        uploadedAt: "2024-01-21T09:15:00Z",
      },
    ],
  },
  {
    id: "FIR-2024-003",
    title: "Cyber Fraud Complaint",
    description:
      "Received fraudulent call claiming to be from bank. Lost Rs. 50,000 through unauthorized UPI transactions.",
    location: "Online/Digital - Residence in Delhi",
    incidentDate: "2024-01-22",
    filedDate: "2024-01-22",
    status: "under-verification",
    citizenId: "citizen-003",
    citizenName: "Amit Kumar",
    ipfsCid: "QmPZ9gcCEpqKTo6aq61g2nXGUhM4iCL3ewB6LDXZCtioEB",
    blockchainTxHash: "0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c",
    storedHash: "c9ffd8fae03f988738e36978c283f8847a2ff6f865d6b9c04f02c6da2fa656c1",
    evidenceFiles: [
      {
        id: "ev-004",
        name: "transaction_screenshot.png",
        type: "image/png",
        size: 1048576,
        ipfsCid: "QmAnotherCidForScreenshot",
        uploadedAt: "2024-01-22T14:20:00Z",
      },
      {
        id: "ev-005",
        name: "call_recording.mp3",
        type: "audio/mpeg",
        size: 3145728,
        ipfsCid: "QmCallRecordingCid",
        uploadedAt: "2024-01-22T14:25:00Z",
      },
    ],
  },
  {
    id: "FIR-2024-004",
    title: "Property Dispute",
    description:
      "Illegal encroachment on agricultural land by neighboring party. Land documents and survey records available as evidence.",
    location: "Village Rampur, Lucknow District",
    incidentDate: "2024-01-10",
    filedDate: "2024-01-25",
    status: "verified",
    citizenId: "citizen-001",
    citizenName: "Rahul Sharma",
    policeVerifierId: "police-001",
    policeVerifierName: "Inspector Ajay Singh",
    ipfsCid: "QmPropertyDisputeCid",
    blockchainTxHash: "0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d",
    storedHash: "d0ffe9fbf10984f47089d3940995b8b3007076e7c1d15013d7eb3b767d4f8a2e",
    computedHash: "d0ffe9fbf10984f47089d3940995b8b3007076e7c1d15013d7eb3b767d4f8a2e",
    evidenceFiles: [
      {
        id: "ev-006",
        name: "land_documents.pdf",
        type: "application/pdf",
        size: 4194304,
        ipfsCid: "QmLandDocsCid",
        uploadedAt: "2024-01-25T11:00:00Z",
      },
    ],
  },
  {
    id: "FIR-2024-005",
    title: "Burglary Report",
    description:
      "Home break-in while family was on vacation. Jewelry and electronic items worth approximately Rs. 3 lakhs stolen.",
    location: "Green Park Colony, Jaipur",
    incidentDate: "2024-01-28",
    filedDate: "2024-01-29",
    status: "pending",
    citizenId: "citizen-004",
    citizenName: "Sunita Devi",
    ipfsCid: "QmBurglaryCid",
    blockchainTxHash: "0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e",
    storedHash: "e10fafcb21aa95058190e4a5aa691c4008787f8d1e26024e8fc40c878e3d5b9f",
    evidenceFiles: [],
  },
]

export const mockBlockchainLogs: BlockchainLog[] = [
  {
    id: "log-001",
    event: "FIRCreated",
    firId: "FIR-2024-001",
    timestamp: "2024-01-16T10:45:00Z",
    txHash: "0x8f7d8a9e3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e",
    walletAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD58",
    details: "FIR registered on blockchain with IPFS evidence hash",
  },
  {
    id: "log-002",
    event: "FIRVerified",
    firId: "FIR-2024-001",
    timestamp: "2024-01-17T14:30:00Z",
    txHash: "0x9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d",
    walletAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD58",
    details: "FIR verified by Inspector Ajay Singh",
  },
  {
    id: "log-003",
    event: "FIRCreated",
    firId: "FIR-2024-002",
    timestamp: "2024-01-21T09:20:00Z",
    txHash: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
    walletAddress: "0x8Ba1f109551bD432803012645Ac136E8dc8F2Ac",
    details: "FIR registered on blockchain",
  },
  {
    id: "log-004",
    event: "FIRCreated",
    firId: "FIR-2024-003",
    timestamp: "2024-01-22T14:30:00Z",
    txHash: "0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c",
    walletAddress: "0x8Ba1f109551bD432803012645Ac136E8dc8F2Ac",
    details: "Cyber fraud FIR registered with evidence",
  },
  {
    id: "log-005",
    event: "EvidenceAdded",
    firId: "FIR-2024-003",
    timestamp: "2024-01-22T14:35:00Z",
    txHash: "0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d",
    walletAddress: "0x8Ba1f109551bD432803012645Ac136E8dc8F2Ac",
    details: "Additional evidence files uploaded to IPFS",
  },
  {
    id: "log-006",
    event: "FIRCreated",
    firId: "FIR-2024-004",
    timestamp: "2024-01-25T11:05:00Z",
    txHash: "0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e",
    walletAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD58",
    details: "Property dispute FIR registered",
  },
  {
    id: "log-007",
    event: "FIRVerified",
    firId: "FIR-2024-004",
    timestamp: "2024-01-26T16:45:00Z",
    txHash: "0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f",
    walletAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD58",
    details: "FIR verified after document review",
  },
  {
    id: "log-008",
    event: "FIRCreated",
    firId: "FIR-2024-005",
    timestamp: "2024-01-29T08:15:00Z",
    txHash: "0x6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a",
    walletAddress: "0x8Ba1f109551bD432803012645Ac136E8dc8F2Ac",
    details: "Burglary report FIR created",
  },
]

export function generateMockTxHash(): string {
  const chars = "0123456789abcdef"
  let hash = "0x"
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)]
  }
  return hash
}

export function generateMockIpfsCid(): string {
  const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
  let cid = "Qm"
  for (let i = 0; i < 44; i++) {
    cid += chars[Math.floor(Math.random() * chars.length)]
  }
  return cid
}

export function generateMockHash(): string {
  const chars = "0123456789abcdef"
  let hash = ""
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)]
  }
  return hash
}

export function generateFIRId(): string {
  const year = new Date().getFullYear()
  const num = String(Math.floor(Math.random() * 1000)).padStart(3, "0")
  return `FIR-${year}-${num}`
}
