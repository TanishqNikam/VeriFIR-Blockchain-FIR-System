export type UserRole = "citizen" | "police" | "admin"

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  walletAddress?: string
  /** Jurisdiction pincode (police officers only) */
  pincode?: string
  gender?: "male" | "female" | "other"
  phone?: string
  aadhaarMasked?: string
  dateOfBirth?: string
  badgeNumber?: string
  policeStation?: string
  emailVerified?: boolean
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

// Extended NCRB I.I.F.-I sub-types
export interface FIRActSection { act: string; sections: string }
export interface FIRAccused { name: string; alias?: string; relativeName?: string; address?: string }
export interface FIRPropertyDetail { category: string; type: string; description: string; value: number }
export interface FIRComplainantDetails {
  fathersName?: string; dob?: string; nationality?: string; occupation?: string
  mobile?: string; currentAddress?: string; permanentAddress?: string
  idProofType?: string; idProofNumber?: string; uid?: string
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
  pincode?: string
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
  // On-chain data (populated by GET /api/fir/:id — null when blockchain unavailable)
  onChainStatusHistory?: OnChainStatusEntry[] | null
  onChainVerification?: OnChainVerificationRecord | null
  // Extended NCRB I.I.F.-I fields
  district?: string
  policeStation?: string
  acts?: FIRActSection[]
  incidentDateTo?: string
  incidentTimeFrom?: string
  incidentTimeTo?: string
  typeOfInformation?: "written" | "oral"
  placeAddress?: string
  distanceFromPS?: string
  complainantDetails?: FIRComplainantDetails
  accusedDetails?: FIRAccused[]
  delayReason?: string
  propertyDetails?: FIRPropertyDetail[]
  totalPropertyValue?: number
  firstInformationContents?: string
}

export interface OnChainStatusEntry {
  status: string
  updatedBy: string
  timestamp: number
}

export interface OnChainVerificationRecord {
  verifiedBy: string
  timestamp: number
  exists: boolean
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
