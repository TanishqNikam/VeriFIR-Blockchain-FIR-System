<div align="center">


<picture>
  <source media="(prefers-color-scheme: dark)" srcset="public/icon.svg">
  <img src="public/icon.svg" alt="VeriFIR — Verified Shield" width="80" height="80" />
</picture>


# VeriFIR

### Blockchain-Integrated FIR Management System

**A tamper-proof, transparent, and cryptographically verifiable First Information Report platform for Indian law enforcement.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.19-363636?style=flat-square&logo=solidity)](https://soliditylang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_9-47A248?style=flat-square&logo=mongodb)](https://www.mongodb.com/)
[![IPFS](https://img.shields.io/badge/IPFS-Pinata-65C2CB?style=flat-square&logo=ipfs)](https://pinata.cloud/)
[![License](https://img.shields.io/badge/License-All%20Rights%20Reserved-red?style=flat-square)](LICENSE)
[![Live](https://img.shields.io/badge/Live-getverifir.vercel.app-00c853?style=flat-square&logo=vercel&logoColor=white)](https://getverifir.vercel.app/)

**Live Deployment:** [getverifir.vercel.app](https://getverifir.vercel.app/)

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
| **Blockchain** | Solidity 0.8.19, Ethers.js 6 | Smart contract & on-chain interaction (deployed on Sepolia) |
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
│                    │  (24 routes)   │                        │
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

> **Note:** `FIRRegistry.sol` is already deployed and live on Ethereum Sepolia — local development connects to that shared contract via RPC rather than deploying a fresh instance. The steps below get the Next.js app itself running locally.

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [MongoDB](https://www.mongodb.com/) (local or [Atlas](https://www.mongodb.com/atlas))
- [Pinata](https://pinata.cloud/) account (free tier sufficient)
- A Sepolia RPC endpoint (e.g. [Alchemy](https://www.alchemy.com/) or [Infura](https://www.infura.io/)) and Sepolia-funded signer wallets — required only for blockchain-write functionality
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/TanishqNikam/VeriFIR-Blockchain-FIR-System.git
cd VeriFIR-Blockchain-FIR-System
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in the required values — see `.env.local.example` in the repo for the full list (MongoDB, Pinata, Sepolia RPC + contract address, signer private keys, session secret, and optional SMTP settings).

> ⚠️ **Never commit `.env.local`** — it is gitignored by default.

### 4. Start the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔐 Demo Accounts

| Role | Email | Password | Jurisdiction |
|---|---|---|---|
| **Administrator** | `admin@verifir.in` | `admin123` | All jurisdictions |

> Only the admin demo account is currently active on the live deployment. Citizen and police accounts can be created via the registration flow (citizens self-register; police/admin accounts are created by an admin via `/api/admin/users`).

---

## 📁 Project Structure

```
VeriFIR-Blockchain-FIR-System/
│
├── app/                          # Next.js App Router
│   ├── api/                      # API route handlers
│   │   ├── auth/                 # login, logout, register, me, verify-email,
│   │   │                         # resend-otp, change-password, profile, password reset
│   │   ├── fir/                  # CRUD, appeal, evidence, notes, deep-verify
│   │   ├── admin/                # user management, retry-blockchain, backfill-officers
│   │   ├── blockchain-stats/     # on-chain statistics
│   │   ├── blockchain-events/    # on-chain event feed (with DB fallback)
│   │   ├── audit/                # audit log access
│   │   ├── notifications/        # in-app notifications
│   │   ├── health/               # service health check (db/blockchain/ipfs)
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
├── contracts/
│   └── FIRRegistry.sol           # Main smart contract (deployed on Sepolia)
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
│   ├── blockchain.ts             # Ethers.js contract interaction (Sepolia RPC)
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
└── tsconfig.json
```

---

## 🔌 API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Login — rate limited 10/15min/IP |
| `POST` | `/api/auth/register` | Public | Create new citizen account (unverified until OTP confirmed) |
| `POST` | `/api/auth/verify-email` | Public | Confirm registration OTP |
| `POST` | `/api/auth/resend-otp` | Public | Resend a new verification OTP |
| `POST` | `/api/auth/logout` | Any | Clear session cookie |
| `GET` | `/api/auth/me` | Any | Get current session user |
| `GET/PATCH` | `/api/auth/profile` | Any auth | View/update own profile fields |
| `POST` | `/api/auth/change-password` | Any auth | Change own password (requires current password) |
| `POST` | `/api/auth/forgot-password` | Public | Request password reset email |
| `POST` | `/api/auth/reset-password` | Public | Reset with token (1hr expiry) |

### FIR Management

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/fir` | Citizen | File new FIR — rate limited 5/hr |
| `GET` | `/api/fir` | Any auth | List FIRs (role-scoped by server) |
| `GET` | `/api/fir/:id` | Any auth | FIR detail — recomputes SHA-256 hash and compares against the stored value and on-chain record inline |
| `PATCH` | `/api/fir/:id` | Police/Admin | Update status (verify/reject/review) |
| `POST` | `/api/fir/:id/appeal` | Citizen | Appeal a rejected FIR |
| `POST` | `/api/fir/:id/evidence` | Citizen/Police | Upload evidence — rate limited 20/hr |
| `POST` | `/api/fir/:id/notes` | Police/Admin | Add investigation note |

### Admin & Other

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET/POST/PATCH/DELETE` | `/api/admin/users` | Admin | Full user management |
| `POST` | `/api/admin/retry-blockchain` | Admin | Retry on-chain registration for pending FIRs |
| `GET/POST` | `/api/admin/backfill-officers` | Admin | Diagnose/backfill missing police-verifier assignments |
| `GET` | `/api/audit` | Admin | Immutable audit log |
| `GET` | `/api/blockchain-stats` | Any auth | On-chain statistics |
| `GET` | `/api/blockchain-events` | Public | On-chain event feed (falls back to DB if chain is unavailable) |
| `GET` | `/api/health` | Public | Service health check (database, blockchain, IPFS) |
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

- [x] Deploy to Ethereum Sepolia testnet
- [x] Host on Vercel + MongoDB Atlas
- [ ] MetaMask wallet integration for citizens
- [ ] Multi-police-station support per pincode
- [ ] Admin pincode map visualisation
- [ ] Mobile PWA support
- [ ] Aadhaar-based identity verification
- [ ] Inter-station FIR transfer workflow
- [ ] Public FIR statistics dashboard

---

## 👤 Author

**Tanishq Nikam**

- Portfolio: [tanishqnikam.vercel.app](https://tanishqnikam.vercel.app)
- LinkedIn: [linkedin.com/in/tanishqnikam](https://linkedin.com/in/tanishqnikam)
- GitHub: [@TanishqNikam](https://github.com/TanishqNikam)
- Email: [tanishqnikam11@gmail.com](mailto:tanishqnikam11@gmail.com)

---

## 📄 License

All Rights Reserved. This repository is public for portfolio and demonstration purposes only — viewing or forking it does not grant permission to reuse, copy, or redistribute its contents. See [LICENSE](LICENSE) for details.

---

<div align="center">

Built with purpose — for transparent, tamper-proof law enforcement records.

**VeriFIR** · Blockchain · IPFS · Next.js · MongoDB · Solidity

</div>
