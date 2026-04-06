/**
 * lib/models/FIR.ts
 * Mongoose model for FIR records.
 */
import mongoose, { Schema, Document, Model } from "mongoose";

// ── Sub-document: act & section entry (from real FIR form section 2) ──────────
export interface IActSection {
  act: string;      // Name of the act (e.g., "Indian Penal Code, 1860")
  sections: string; // Applicable sections (e.g., "420, 467, 468")
}

const ActSectionSchema = new Schema<IActSection>(
  {
    act: { type: String, required: true },
    sections: { type: String, required: true },
  },
  { _id: false }
);

// ── Sub-document: accused person ──────────────────────────────────────────────
export interface IAccused {
  name: string;
  alias?: string;
  relativeName?: string; // Father's/relative's name
  address?: string;
}

const AccusedSchema = new Schema<IAccused>(
  {
    name: { type: String, required: true },
    alias: { type: String },
    relativeName: { type: String },
    address: { type: String },
  },
  { _id: false }
);

// ── Sub-document: property involved in the offence ────────────────────────────
export interface IPropertyDetail {
  category: string;    // e.g., "Movable", "Immovable"
  type: string;        // e.g., "Cash", "Jewellery", "Vehicle"
  description: string;
  value: number;       // In Indian Rupees
}

const PropertyDetailSchema = new Schema<IPropertyDetail>(
  {
    category: { type: String },
    type: { type: String },
    description: { type: String },
    value: { type: Number, default: 0 },
  },
  { _id: false }
);

// ── Sub-document: complainant personal details (FIR form section 6) ───────────
export interface IComplainantDetails {
  fathersName?: string;
  dob?: string;
  nationality?: string;
  occupation?: string;
  mobile?: string;
  currentAddress?: string;
  permanentAddress?: string;
  idProofType?: string;   // e.g., "Aadhaar", "Voter ID", "PAN"
  idProofNumber?: string;
  uid?: string;           // Aadhaar number
}

const ComplainantDetailsSchema = new Schema<IComplainantDetails>(
  {
    fathersName: { type: String },
    dob: { type: String },
    nationality: { type: String, default: "Indian" },
    occupation: { type: String },
    mobile: { type: String },
    currentAddress: { type: String },
    permanentAddress: { type: String },
    idProofType: { type: String },
    idProofNumber: { type: String },
    uid: { type: String },
  },
  { _id: false }
);

// ── Sub-document: police note ─────────────────────────────────────────────────
export interface INote {
  text: string;
  authorId: string;
  authorName: string;
  role: string;
  createdAt: Date;
}

const NoteSchema = new Schema<INote>(
  {
    text: { type: String, required: true },
    authorId: { type: String, required: true },
    authorName: { type: String, required: true },
    role: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

// ── Sub-document: evidence file ────────────────────────────────────────────────
export interface IEvidenceFile {
  name: string;
  type: string;
  size: number;
  ipfsCid: string;
  uploadedAt: Date;
}

const EvidenceFileSchema = new Schema<IEvidenceFile>(
  {
    name: { type: String, required: true },
    type: { type: String, required: true },
    size: { type: Number, required: true },
    ipfsCid: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// ── Sub-document: police evidence file ─────────────────────────────────────────
export interface IPoliceEvidenceFile {
  name: string;
  type: string;
  size: number;
  ipfsCid: string;
  uploadedAt: Date;
  uploadedBy: string;      // officer name
  uploadedById: string;    // officer userId
}

const PoliceEvidenceFileSchema = new Schema<IPoliceEvidenceFile>(
  {
    name: { type: String, required: true },
    type: { type: String, required: true },
    size: { type: Number, required: true },
    ipfsCid: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: String, required: true },
    uploadedById: { type: String, required: true },
  },
  { _id: false }
);

// ── Sub-document: original evidence ref (frozen at filing, used for hash) ──────
export interface IOriginalEvidenceRef {
  name: string;
  cid: string;
}

const OriginalEvidenceRefSchema = new Schema<IOriginalEvidenceRef>(
  {
    name: { type: String, required: true },
    cid: { type: String, required: true },
  },
  { _id: false }
);

// ── Main document ──────────────────────────────────────────────────────────────
export interface IFIR extends Document {
  firId: string;
  title: string;
  description: string;
  location: string;
  incidentDate: string;
  filedDate: Date;

  // ── Extended NCRB I.I.F.-I fields (added to match real FIR structure) ───────
  /** District name (e.g., "Ahmedabad") */
  district?: string;
  /** Police Station / Thana name */
  policeStation?: string;
  /** Applicable Acts and their sections (FIR form section 2) */
  acts?: IActSection[];
  /** End date of the incident (for multi-day offences) */
  incidentDateTo?: string;
  /** Start time of the incident (HH:MM 24hr) */
  incidentTimeFrom?: string;
  /** End time of the incident (HH:MM 24hr) */
  incidentTimeTo?: string;
  /** How the information was received by police station */
  typeOfInformation?: "written" | "oral";
  /** Full address of the place of occurrence */
  placeAddress?: string;
  /** Direction and distance from the nearest police station */
  distanceFromPS?: string;
  /** Beat number assigned to the occurrence area */
  beatNo?: string;
  /** Personal details of the complainant (FIR form section 6) */
  complainantDetails?: IComplainantDetails;
  /** Details of known / suspected accused persons (FIR form section 7) */
  accusedDetails?: IAccused[];
  /** Reason for delay in lodging the FIR (FIR form section 8) */
  delayReason?: string;
  /** Particulars of property involved in the offence (FIR form section 9) */
  propertyDetails?: IPropertyDetail[];
  /** Total estimated value of all involved property in INR */
  totalPropertyValue?: number;
  /** Verbatim narrative of the complaint (FIR form section 12) */
  firstInformationContents?: string;
  /** Typed full name submitted as digital signature at filing */
  digitalSignature?: string;
  /** Whether the complainant accepted the truth declaration at filing */
  declarationAccepted?: boolean;
  status: "pending" | "under-verification" | "verified" | "rejected";
  citizenId: string;
  citizenName: string;
  pincode?: string;
  policeVerifierId?: string;
  policeVerifierName?: string;
  /** Wallet address of the police officer who verified */
  policeVerifierWallet?: string;
  /** On-chain tx hash from verifyFIR() */
  verificationTxHash?: string;
  /** When the FIR was verified */
  verifiedAt?: Date;
  /** Reason provided when an FIR is rejected */
  rejectionReason?: string;
  /** Citizen's reason when appealing a rejection */
  appealReason?: string;
  /** When the citizen appealed */
  appealedAt?: Date;
  /** Whether this FIR is a re-submission after rejection */
  isAppeal?: boolean;
  /** When a police officer first opened and set status to under-verification */
  underVerificationAt?: Date;
  /** Internal police/admin notes */
  notes: INote[];
  /** IPFS CID of the FIR metadata JSON */
  ipfsCid: string;
  /** On-chain transaction hash from registerFIR() */
  blockchainTxHash: string;
  /** Block number of the registration transaction */
  blockNumber: number;
  /** SHA-256 hash of the canonical FIR metadata at time of submission */
  storedHash: string;
  /** Citizen-uploaded files at the time of FIR filing + any added later by citizen */
  evidenceFiles: IEvidenceFile[];
  /**
   * Frozen snapshot of evidence refs taken at filing time.
   * This is what the storedHash covers — never changes after creation.
   */
  originalEvidenceRefs: IOriginalEvidenceRef[];
  /** Evidence uploaded by police officers during investigation */
  policeEvidenceFiles: IPoliceEvidenceFile[];
  createdAt: Date;
  updatedAt: Date;
}

const FIRSchema = new Schema<IFIR>(
  {
    firId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, required: true, maxlength: 5000 },
    location: { type: String, required: true, maxlength: 300 },
    incidentDate: { type: String, required: true },
    filedDate: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["pending", "under-verification", "verified", "rejected"],
      default: "pending",
    },
    citizenId: { type: String, required: true },
    citizenName: { type: String, required: true },
    /** Area pincode at time of filing — determines which police officer sees this FIR */
    pincode: { type: String, index: true },

    // Extended NCRB I.I.F.-I fields
    district: { type: String },
    policeStation: { type: String },
    acts: { type: [ActSectionSchema], default: undefined },
    incidentDateTo: { type: String },
    incidentTimeFrom: { type: String },
    incidentTimeTo: { type: String },
    typeOfInformation: { type: String, enum: ["written", "oral"] },
    placeAddress: { type: String },
    distanceFromPS: { type: String },
    beatNo: { type: String },
    complainantDetails: { type: ComplainantDetailsSchema },
    accusedDetails: { type: [AccusedSchema], default: undefined },
    delayReason: { type: String },
    propertyDetails: { type: [PropertyDetailSchema], default: undefined },
    totalPropertyValue: { type: Number },
    firstInformationContents: { type: String, maxlength: 10000 },
    digitalSignature: { type: String },
    declarationAccepted: { type: Boolean, default: false },
    policeVerifierId: { type: String },
    policeVerifierName: { type: String },
    policeVerifierWallet: { type: String },
    verificationTxHash: { type: String },
    verifiedAt: { type: Date },
    rejectionReason: { type: String },
    appealReason: { type: String },
    appealedAt: { type: Date },
    isAppeal: { type: Boolean, default: false },
    underVerificationAt: { type: Date },
    notes: { type: [NoteSchema], default: [] },
    ipfsCid: { type: String, required: true },
    blockchainTxHash: { type: String, required: true },
    blockNumber: { type: Number, required: true },
    storedHash: { type: String, required: true },
    evidenceFiles: { type: [EvidenceFileSchema], default: [] },
    originalEvidenceRefs: { type: [OriginalEvidenceRefSchema], default: [] },
    policeEvidenceFiles: { type: [PoliceEvidenceFileSchema], default: [] },
  },
  {
    timestamps: true, // adds createdAt + updatedAt automatically
  }
);

// Guard against model re-registration during HMR
const FIRModel: Model<IFIR> =
  (mongoose.models.FIR as Model<IFIR>) ||
  mongoose.model<IFIR>("FIR", FIRSchema);

export default FIRModel;
