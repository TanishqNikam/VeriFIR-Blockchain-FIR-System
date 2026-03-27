<div align="center">

<img src="public/icon.svg" alt="VeriFIR Logo" width="72" height="72" />

# VeriFIR

### Blockchain-Integrated FIR Management System

**A tamper-proof, transparent, and cryptographically verifiable First Information Report platform for Indian law enforcement.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.19-363636?style=flat-square&logo=solidity)](https://soliditylang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_9-47A248?style=flat-square&logo=mongodb)](https://www.mongodb.com/)
[![IPFS](https://img.shields.io/badge/IPFS-Pinata-65C2CB?style=flat-square&logo=ipfs)](https://pinata.cloud/)
[![Hardhat](https://img.shields.io/badge/Hardhat-2.22-F7DF1E?style=flat-square)](https://hardhat.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[Overview](#-overview) · [Features](#-features) · [Tech Stack](#-tech-stack) · [Architecture](#-architecture) · [Getting Started](#-getting-started) · [Demo](#-demo-accounts) · [API](#-api-reference)

</div>

---

## 📋 Overview

**VeriFIR** is a full-stack web application that digitises the entire lifecycle of a First Information Report (FIR) — from citizen filing to police verification — using blockchain technology to guarantee tamper-evidence and transparency.

In India's traditional system, FIRs are paper-based and vulnerable to tampering, suppression, and loss. VeriFIR solves this by anchoring every FIR's cryptographic fingerprint on an Ethereum smart contract, making any modification mathematically detectable by anyone, anywhere, without trusting any central authority.

### How Integrity Works

```
Citizen Files FIR
       │
       ▼
SHA-256 hash computed from core FIR fields
       │
       ├──► Stored in MongoDB (storedHash)
       │
       ├──► Uploaded to IPFS via Pinata (metadata JSON + evidence)
       │
       └──► Anchored on Ethereum blockchain (dataHash) ◄── Immutable
                         │
                         ▼
              Anyone can verify:
              Recompute hash → Compare with chain → ✓ or ✗
```

---

## ✨ Features

### For Citizens
- **NCRB I.I.F.-I Compliant Form** — 6-section FIR form mirroring the real Indian government format (District, Acts/Sections, Complainant, Accused, Narrative, Evidence)
- **Real-Time Status Tracking** — Live updates via Server-Sent Events when police review your FIR
- **Evidence Upload** — Attach images, PDFs, and videos; stored permanently on IPFS
- **PDF Export** — Download a fully formatted FIR PDF with NCRB header, blockchain record, and optional "BLOCKCHAIN VERIFIED" watermark
- **Public Verification** — Verify any FIR's authenticity using only its blockchain transaction hash — no login required
- **Appeal System** — Appeal rejected FIRs; a new on-chain record is created automatically

### For Police Officers
- **Jurisdiction Routing** — FIRs automatically filtered by 6-digit pincode; officers only see FIRs from their area
- **Blockchain Verification** — One-click cryptographic endorsement written to the smart contract
- **Investigation Evidence** — Upload additional files during review; stored separately from citizen evidence
- **Internal Notes** — Add investigation notes visible only to police and admin
- **Three-Level Verification** — DB integrity check, chain hash comparison, and deep IPFS verification

### For Administrators
- **System-Wide Dashboard** — View all FIRs across all jurisdictions
- **User Management** — Create, update, and deactivate citizen, police, and admin accounts
- **Pincode Assignment** — Assign and update officer jurisdictions; changes take effect immediately without re-login
- **Audit Log Viewer** — Immutable, append-only log of every action in the system
- **Reports & Analytics** — System-wide statistics and charts

### Platform-Wide
- **Multilingual** — English, Hindi (हिंदी), Marathi (मराठी)
- **Dark / Light Mode** — System-aware theme toggle
- **Email Notifications** — Status change alerts via SMTP
- **Rate Limiting** — Brute-force protection on login, FIR filing, and evidence uploads
- **Immutable Audit Trail** — Schema-level write guards ensure audit records can never be modified

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | Full-stack React — SSR, API routes, middleware |
| **Frontend** | React 19, TypeScript 5 | UI & type safety |
| **Styling** | Tailwind CSS 4, Radix UI | Accessible, responsive design system |
| **Database** | MongoDB + Mongoose 9 | Primary persistent store |
| **Blockchain** | Solidity 0.8.19, Ethers.js 6 | Smart contract & on-chain interaction |
| **Dev Chain** | Hardhat 2.22 | Local Ethereum node & deployment |
| **Storage** | IPFS via Pinata | Evidence files + FIR metadata JSON |
| **Auth** | Custom HMAC-SHA256 | HTTP-only session cookies, no JWT libraries |
| **Password** | PBKDF2-SHA512 | 100k iterations + unique salt per user |
| **Real-Time** | Server-Sent Events | Live dashboard updates |
| **Email** | Nodemailer | Status notifications via SMTP |
| **PDF** | jsPDF + jspdf-autotable | Client-side NCRB-format PDF generation |
| **Forms** | react-hook-form + Zod | Form state management & validation |
| **i18n** | Custom Context API | EN / HI / MR translations |
| **Charts** | Recharts | Admin analytics dashboard |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Application                       │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │   Citizen    │  │    Police    │  │      Admin        │  │
│  │  Dashboard   │  │  Dashboard   │  │    Dashboard      │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬──────────┘  │
│         └─────────────────┴──────────────────┘              │
│                            │                                 │
│                    ┌───────▼────────┐                        │
│                    │  API Routes    │                        │
│                    │  (18 routes)   │                        │
│                    └───────┬────────┘                        │
└────────────────────────────┼────────────────────────────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
    ┌──────▼──────┐  ┌───────▼──────┐  ┌──────▼──────┐
    │   MongoDB   │  │    IPFS      │  │  Ethereum   │
    │             │  │  (Pinata)    │  │  Blockchain │
    │ FIRs, Users │  │ Evidence     │  │ FIRRegistry │
    │ Audit Logs  │  │ Metadata JSON│  │ Smart       │
    │ Notifs      │  │              │  │ Contract    │
    └─────────────┘  └──────────────┘  └─────────────┘
```

### Smart Contract — `FIRRegistry.sol`

The contract stores the **minimum necessary data** for tamper detection, keeping gas costs low while providing cryptographic guarantees independent of any central authority.

```solidity
struct FIR {
    string firId;        // Unique identifier
    string cid;          // IPFS CID of metadata JSON
    string dataHash;     // SHA-256 hash (64 hex chars)
    uint256 timestamp;   // Block timestamp
    address registeredBy;
    bool exists;
}
```

All blockchain writes are **non-blocking** — FIR creation never fails due to chain latency. The `blockchainTxHash` field initialises as `"pending"` and updates once the transaction confirms.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 16+
- [MongoDB](https://www.mongodb.com/) (local or [Atlas](https://www.mongodb.com/atlas))
- [Pinata](https://pinata.cloud/) account (free tier sufficient)
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/verifir-blockchain-fir-system.git
cd verifir-blockchain-fir-system
```

### 2. Install Dependencies

```bash
# Install Next.js app dependencies
npm install

# Install Hardhat blockchain dependencies
cd blockchain && npm install && cd ..
```

### 3. Configure Environment Variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in the required values:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/verifir

# IPFS — get from https://pinata.cloud
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key

# Blockchain (filled automatically after step 5)
RPC_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS=

# Hardhat dev account private keys (pre-filled for local dev)
DEPLOYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
POLICE_SIGNER_PRIVATE_KEY=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
CITIZEN_SIGNER_PRIVATE_KEY=0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a

# Session (generate a random 32+ char string for production)
SESSION_SECRET=verifir-dev-secret-change-this-in-production

# Email (optional — notifications are silently disabled if not set)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM="VeriFIR <noreply@verifir.in>"
```

> ⚠️ **Never commit `.env.local`** — it is gitignored by default.

### 4. Start the Local Blockchain

Open a terminal and start the Hardhat node:

```bash
cd blockchain
npx hardhat node
```

Keep this terminal running. It will display 20 pre-funded test accounts.

### 5. Deploy the Smart Contract

Open a second terminal:

```bash
cd blockchain
npm run deploy
```

This compiles `FIRRegistry.sol`, deploys it to the local Hardhat node, authorises the signer wallets, and prints the contract address. Copy the address into `CONTRACT_ADDRESS` in your `.env.local`.

### 6. Start the Application

Open a third terminal:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔐 Demo Accounts

Demo accounts are **automatically seeded** into MongoDB on the first login — no manual setup required.

| Role | Email | Password | Jurisdiction |
|---|---|---|---|
| **Citizen** | `citizen@verifir.in` | `citizen123` | — |
| **Police Officer 1** | `police@verifir.in` | `police123` | Pincode 411007 (Pune — Kothrud) |
| **Police Officer 2** | `police2@verifir.in` | `police123` | Pincode 411005 (Pune — Shivajinagar) |
| **Administrator** | `admin@verifir.in` | `admin123` | All jurisdictions |

> FIRs filed with pincode `411007` appear on Police Officer 1's dashboard; those filed with `411005` appear on Police Officer 2's dashboard.

---

## 📁 Project Structure

```
verifir-blockchain-fir-system/
│
├── app/                          # Next.js App Router
│   ├── api/                      # 18 API route handlers
│   │   ├── auth/                 # login, logout, register, me, password reset
│   │   ├── fir/                  # CRUD, appeal, evidence, notes, deep-verify
│   │   ├── admin/                # user management
│   │   ├── blockchain-stats/     # on-chain statistics
│   │   ├── audit/                # audit log access
│   │   ├── notifications/        # in-app notifications
│   │   └── sse/                  # Server-Sent Events stream
│   │
│   ├── dashboard/
│   │   ├── citizen/              # file-fir, my-firs, verify
│   │   ├── police/               # pending, verified, evidence, verify
│   │   └── admin/                # all-firs, users, logs, reports
│   │
│   ├── login/                    # Login page (role selector)
│   ├── register/                 # Registration page
│   ├── forgot-password/          # Password reset request
│   └── reset-password/           # Password reset form
│
├── blockchain/                   # Hardhat project
│   ├── contracts/
│   │   └── FIRRegistry.sol       # Main smart contract
│   ├── scripts/
│   │   └── deploy.ts             # Deployment script
│   ├── test/                     # Contract tests
│   └── hardhat.config.ts
│
├── components/                   # Reusable React components
│   ├── dashboard/                # Sidebar, status badges, timeline
│   ├── landing/                  # Homepage sections
│   └── ui/                       # Radix UI primitives (shadcn/ui)
│
├── hooks/                        # Custom React hooks
│   ├── use-firs.ts               # useFIRs(), useFIR()
│   ├── use-notifications.ts      # Notification polling
│   └── use-toast.ts
│
├── lib/                          # Core application logic
│   ├── models/                   # Mongoose schemas (FIR, User, Notification, AuditLog)
│   ├── i18n/                     # Translations (EN, HI, MR)
│   ├── contracts/                # Compiled ABI (FIRRegistry.json)
│   ├── api-auth.ts               # requireSession, getSession helpers
│   ├── audit.ts                  # Immutable audit logging
│   ├── auth-context.tsx          # AuthProvider + useAuth hook
│   ├── blockchain.ts             # Ethers.js contract interaction
│   ├── db.ts                     # MongoDB singleton connection
│   ├── email.ts                  # Nodemailer SMTP wrapper
│   ├── file-validation.ts        # Magic-byte file type checking
│   ├── ipfs.ts                   # Pinata upload functions
│   ├── notifications.ts          # In-app notification creation
│   ├── pdf.ts                    # jsPDF NCRB document generator
│   ├── rate-limit.ts             # Sliding window rate limiter
│   ├── session.ts                # HMAC-SHA256 token sign/verify
│   ├── sse-emitter.ts            # Real-time event broadcaster
│   └── types.ts                  # Shared TypeScript interfaces
│
├── middleware.ts                 # Route protection & role-based redirects
├── next.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

---

## 🔌 API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Login — rate limited 10/15min/IP |
| `POST` | `/api/auth/register` | Public | Create new account |
| `POST` | `/api/auth/logout` | Any | Clear session cookie |
| `GET` | `/api/auth/me` | Any | Get current session user |
| `POST` | `/api/auth/forgot-password` | Public | Request password reset email |
| `POST` | `/api/auth/reset-password` | Public | Reset with token (1hr expiry) |

### FIR Management

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/fir` | Citizen | File new FIR — rate limited 5/hr |
| `GET` | `/api/fir` | Any auth | List FIRs (role-scoped by server) |
| `GET` | `/api/fir/:id` | Any auth | FIR detail + integrity verification |
| `PATCH` | `/api/fir/:id` | Police/Admin | Update status (verify/reject/review) |
| `POST` | `/api/fir/:id/appeal` | Citizen | Appeal a rejected FIR |
| `GET` | `/api/fir/:id/deep-verify` | Any auth | IPFS + chain gold-standard verify |
| `POST` | `/api/fir/:id/evidence` | Citizen/Police | Upload evidence — rate limited 20/hr |
| `POST` | `/api/fir/:id/notes` | Police/Admin | Add investigation note |

### Admin & Other

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET/POST/PATCH/DELETE` | `/api/admin/users` | Admin | Full user management |
| `GET` | `/api/audit` | Admin | Immutable audit log |
| `GET` | `/api/blockchain-stats` | Any auth | On-chain statistics |
| `GET` | `/api/notifications` | Any auth | User notifications |
| `GET` | `/api/sse` | Any auth | Server-Sent Events stream |

---

## 🔒 Security

| Feature | Implementation |
|---|---|
| Session tokens | HMAC-SHA256, constant-time comparison, HTTP-only cookies |
| Password hashing | PBKDF2-SHA512 · 100,000 iterations · unique random salt |
| Role enforcement | Server-side on every API route, no client trust |
| Jurisdiction | Pincode read fresh from DB on every request — not from cookie |
| Data integrity | SHA-256 hash anchored on blockchain |
| File validation | Magic-byte checking prevents MIME type spoofing |
| Rate limiting | Login · FIR filing · evidence upload |
| Audit trail | Schema-level immutability — `updateOne` is blocked at model level |
| ReDoS prevention | All MongoDB regex inputs are escaped before query execution |

---

## 🗺 Roadmap

- [ ] Deploy to Ethereum Sepolia testnet
- [ ] Host on Vercel + MongoDB Atlas
- [ ] MetaMask wallet integration for citizens
- [ ] Multi-police-station support per pincode
- [ ] Admin pincode map visualisation
- [ ] Mobile PWA support
- [ ] Aadhaar-based identity verification
- [ ] Inter-station FIR transfer workflow
- [ ] Public FIR statistics dashboard

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome.

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature-name`
3. Commit your changes: `git commit -m 'feat: add some feature'`
4. Push to the branch: `git push origin feat/your-feature-name`
5. Open a Pull Request

Please follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">

Built with purpose — for transparent, tamper-proof law enforcement records.

**VeriFIR** · Blockchain · IPFS · Next.js · MongoDB · Solidity

</div>
