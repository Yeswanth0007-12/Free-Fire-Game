# Free Fire Competitive Tournament Platform

A production-grade, modular, fintech-oriented competitive gaming tournament platform designed for scheduled Free Fire tournaments. 

Built with **FastAPI**, **SQLAlchemy 2.0**, **PostgreSQL (Supabase)**, **Redis**, **Next.js 16+ (App Router, TypeScript, Tailwind CSS)**, and **Razorpay**.

---

## Architecture Overview

```
[ Player Mobile App (React Native/Expo) ] ──HTTPS/WS──┐
[ Admin Web Panel (Next.js 16+) ] ─────────HTTPS/WS──┼──> [ FastAPI Authoritative Backend ]
[ Marketing Landing Website ] ─────────────HTTPS/WS──┘              │
                                                                    ├──> [ PostgreSQL / Supabase Ledger ]
                                                                    ├──> [ Redis (Broker & Cache) ]
                                                                    ├──> [ Autonomous Background Tracker ]
                                                                    ├──> [ Firebase Admin SDK (Google/FB) ]
                                                                    └──> [ Razorpay Payment Gateway ]
```

### Core Tenets & Safeguards
1. **Legitimate Tournament Management**: No game memory reading, packet manipulation, injection, or hacks.
2. **Authoritative Backend**: Mobile and web apps are thin clients; the backend is strictly authoritative for balances, slot locks, room passwords, and results.
3. **No Player Screenshot Uploads (V1)**: Result verification is structured and operator-driven with immutable audit logs and duplicate settlement locks.
4. **Double-Entry Financial Ledger**: 
   - All currency stored in **integer minor units (paise)**. ₹50.00 = `5000` paise.
   - Non-negative balance constraints enforced at database level.
   - Every balance modification generates an immutable `WalletTransaction` with unique idempotency keys (`MATCH_PRIZE:{match_id}:{user_id}`, `MATCH_ENTRY:{match_id}:{user_id}`).
   - Double-settlement prevention: Repeated approvals of the same result will never disburse duplicate prize pools.
5. **Concurrency & Slot Locking**:
   - `SELECT FOR UPDATE` and unique database constraints ensure simultaneous registrations cannot exceed match slot capacity.
   - Temporary 5-minute reservation timeout releases unconfirmed slots automatically.
6. **Encrypted Room Credentials**:
   - Free Fire Custom Room ID & Password are encrypted at rest with AES-256-GCM.
   - Credentials remain locked until the configured `room_release_at` timestamp and are only accessible to confirmed participants.
7. **Free Fire UID Management**:
   - Explicit `GamingIdentity` model decoupled from platform user identity.
   - Guard against duplicate UID reuse across different accounts (`FREE_FIRE_UID_ALREADY_LINKED`).
   - Admin-verified status workflow prevents unauthorized UID changes.

---

## Directory Structure

```
d:/Free Fire/
├── apps/
│   ├── mobile/              # React Native + Expo + TypeScript Mobile App (Android/iOS)
│   │   ├── app/             # Expo Router screens (Tabs, Auth, Match Lobby, Slot Booking, Wallet)
│   │   ├── src/services/    # Centralized Mobile API Client with SecureStore
│   │   └── src/store/       # Zustand lightweight session & auth store
│   ├── admin/               # Admin Web Panel (Dedicated Control Center)
│   └── website/             # Public Marketing & Android APK Download Portal
├── backend/
│   ├── app/
│   │   ├── api/v1/          # Modular API routes (auth, gaming-identities, matches, wallet, admin)
│   │   ├── core/            # Config, security (Argon2id, AES Fernet, JWT), database, exceptions
│   │   ├── models/          # SQLAlchemy 2.0 models (User, GamingIdentity, MatchSlot, Ledger, etc.)
│   │   ├── schemas/         # Pydantic v2 validation schemas
│   │   ├── services/        # Business logic (wallet, settlement, payment, matchmaking, results)
│   │   └── workers/         # Background scheduler (room release & slot reservation expiry)
│   ├── tests/               # Pytest suite (concurrency race, double-settlement, room cryptography)
│   └── seed.py              # Development seed script
├── packages/
│   └── types/               # Shared TypeScript domain contracts
├── frontend/                # Next.js web application (Landing + Admin Control Center)
├── docker-compose.yml       # Orchestrates Postgres, Redis, Backend, Worker, Frontend
└── .env.example             # Documented environment variables
```

---

## Quickstart & Local Setup

### Prerequisites
- **Python 3.12+**
- **Node.js 20+**
- **PostgreSQL / Supabase** account or local Docker

### 1. Database Configuration (Supabase or Local)
Copy the `.env.example` to `backend/.env`:
```bash
cp .env.example backend/.env
```
For **Supabase PostgreSQL**, set your connection string in `backend/.env`:
```env
DATABASE_URL=postgresql+asyncpg://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?ssl=require
```
*(For offline local development, SQLite fallback `sqlite+aiosqlite:///./tournament.db` is also supported).*

### 2. Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate      # Windows (or source venv/bin/activate on Linux/Mac)
pip install -r requirements.txt

# Run initial database migrations
alembic upgrade head

# Seed development data (Free Fire game, 6 modes, admin, test matches)
python seed.py
```

### 3. Start Backend & Worker
In Terminal 1 (API Server):
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
In Terminal 2 (Background State Worker):
```bash
python -m app.workers.scheduler
```

Interactive API documentation will be available at:
`http://localhost:8000/docs`

### 4. Frontend Setup
In Terminal 3:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## Seed Accounts (Development)

| Role | Email | Password | Free Fire UID | Initial Balance |
| :--- | :--- | :--- | :--- | :--- |
| **SUPER_ADMIN** | `admin@freefiretournaments.com` | `Admin@123456` | `ADMIN_FF_001` | ₹10,000.00 |
| **PLAYER** | `player1@test.com` | `Player@123456` | `FF_UID_10001` | ₹500.00 |
| **PLAYER** | `player2@test.com` | `Player@123456` | `FF_UID_10002` | ₹500.00 |

---

## Automated Test Suite

Run the backend test suite covering slot race conditions, idempotent webhooks, double settlements, ledger balance bounds, and RBAC:
```bash
cd backend
pytest -v
```

### Verified Scenarios
1. **User Authentication & Profile**: Registration, password Argon2id hashing, and Free Fire UID uniqueness.
2. **Match Slot Concurrency**: Simultaneous join requests on the final slot correctly trigger row locking (`SELECT FOR UPDATE`), preventing double bookings.
3. **Encrypted Room Credentials**: Sealed and inaccessible to players until release time.
4. **Structured Result Submission**: Host/Admin records rankings without player screenshot dependencies.
5. **Double Settlement Guard**: Settling a match twice will not duplicate transactions or ledger entries.
6. **Double-Entry Wallet Bounds**: Available balance cannot drop below zero.
7. **Emergency Cancellation & Refunds**: Admin match cancellation automatically refunds entry fees.
8. **RBAC Authorization**: Non-admins receive 403 Forbidden on privileged endpoints.
9. **Razorpay Webhook Anti-Replay**: Duplicate webhook delivery is caught via unique event logs and processed idempotently.

---

## Production Docker Deployment

To launch the complete containerized stack:
```bash
docker-compose up --build -d
```
Services spun up:
- `freefire_postgres`: Port 5432 (PostgreSQL 16)
- `freefire_redis`: Port 6379 (Redis 7)
- `freefire_backend`: Port 8000 (FastAPI API server)
- `freefire_worker`: Background tournament scheduler
- `freefire_frontend`: Port 3000 (Next.js 16+ Production)

---

## API Summary

- `POST /api/v1/auth/register` - Create account & link Free Fire UID
- `POST /api/v1/auth/login` - Authenticate & obtain JWT access token
- `GET /api/v1/matches` - Discover tournaments with filter by mode & format
- `POST /api/v1/matches/{id}/join` - Atomic slot reservation & fee debit
- `GET /api/v1/matches/{id}` - Tournament details with real-time countdown & room release
- `GET /api/v1/wallet` - Ledger balances (available, winning, locked)
- `POST /api/v1/payments/create-order` - Create Razorpay order
- `POST /api/v1/payments/verify` - Verify signature server-side
- `POST /api/v1/payments/webhook` - Idempotent replay-safe webhook receiver
- `POST /api/v1/admin/matches/{id}/result` - Structured result submission
- `POST /api/v1/admin/matches/{id}/approve` - Atomic prize settlement & match completion
- `POST /api/v1/admin/matches/{id}/cancel` - Cancel match & execute automatic refunds
- `GET /api/v1/admin/stats` - Operational & financial metrics
- `GET /api/v1/health` - Liveness & readiness probes
