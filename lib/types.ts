export type UserRole = "citizen" | "police" | "admin"

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  walletAddress?: string
}

export type FIRStatus = "pending" | "under-verification" | "verified" | "rejected"

export interface FIRNote {
  id: string
  text: string
  authorId: string
  authorName: string
  role: string
  createdAt: string
}

export interface FIR {
  id: string
  title: string
  description: string
  location: string
  incidentDate: string
  filedDate: string
  status: FIRStatus
  citizenId: string
  citizenName: string
  policeVerifierId?: string
  policeVerifierName?: string
  rejectionReason?: string
  appealReason?: string
  isAppeal?: boolean
  verificationTxHash?: string
  verifiedAt?: string
  underVerificationAt?: string
  ipfsCid: string
  blockchainTxHash: string
  storedHash: string
  computedHash?: string
  evidenceFiles: EvidenceFile[]
  policeEvidenceFiles?: PoliceEvidenceFile[]
  notes?: FIRNote[]
}

export interface EvidenceFile {
  id: string
  name: string
  type: string
  size: number
  ipfsCid: string
  uploadedAt: string
}

export interface PoliceEvidenceFile {
  name: string
  type: string
  size: number
  ipfsCid: string
  uploadedAt: string
  uploadedBy: string
  uploadedById: string
}

export interface BlockchainLog {
  id: string
  event: "FIRCreated" | "FIRVerified" | "EvidenceAdded"
  firId: string
  timestamp: string
  txHash: string
  walletAddress: string
  details: string
}
