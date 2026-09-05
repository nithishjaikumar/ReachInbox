# ReachInbox Email Scheduling & Sending System

A production-grade, distributed email scheduling and delivery platform designed for high throughput, strict multi-worker rate limiting, fault tolerance, and restart persistence.

> **CRITICAL ARCHITECTURAL STATEMENT: NO CRON IS USED.**
> The system strictly uses **BullMQ delayed jobs** backed by **Redis** as the single source of truth for all scheduling. There are zero cron jobs, node-cron triggers, or interval polling schedulers.

---

## 1. Project Overview

ReachInbox provides an intelligent outbound email infrastructure capable of scheduling thousands of personalized emails with:
- Deterministic delay between individual sends
- Safe distributed hourly rate limiting per sender across multiple concurrent workers
- Automatic delayed rescheduling when rate limits are exhausted
- Real-time Slack notifications on rate limit encounters
- Full-text search over scheduled, sent, and failed emails via Elasticsearch
- Real Google OAuth 2.0 authentication and Slack OAuth integration
- Clean, minimal UI closely adhering to ReachInbox/Figma specifications

---

## 2. Architecture Diagram

```
+-------------------------------------------------------------+
|                     Next.js 14 Frontend                     |
|         (React + TypeScript + Tailwind CSS + Query)         |
+-------------------------------------------------------------+
                               |
                        HTTP REST / Cookies
                               |
                               v
+-------------------------------------------------------------+
|                     Express.js Backend                      |
|  - Google OAuth / Session Management (Redis Store)          |
|  - Campaign & Email Scheduling Service                     |
|  - Bull Board Dashboard (/admin/queues)                    |
+-------------------------------------------------------------+
        |                      |                     |
        v                      v                     v
+---------------+      +---------------+     +---------------+
|  PostgreSQL   |      |  Redis 7.x    |     | Elasticsearch |
| (Prisma ORM)  |      | - BullMQ Queue|     | 8.x Indexing  |
| Source of     |      | - Rate Limits |     | & Search      |
| Truth         |      | - Sessions    |     |               |
+---------------+      +---------------+     +---------------+
                               ^
                               |
+-------------------------------------------------------------+
|                      BullMQ Worker Pool                     |
|  1. Idempotency check (Status guard + DB lock)              |
|  2. Atomic rate-limit check (Redis Lua Script)              |
|  3. Reschedule to next hour window if limit hit             |
|  4. Trigger idempotent Slack Notification                   |
|  5. SMTP Delivery via Ethereal Email (Nodemailer)          |
|  6. Atomic DB Status Update & Elasticsearch Indexing        |
+-------------------------------------------------------------+
```

---

## 3. Technology Stack

### Backend
- **Runtime**: Node.js (>= 18), TypeScript
- **Framework**: Express.js, Helmet, CORS, Cookie-Parser
- **ORM / Database**: Prisma ORM, PostgreSQL 15
- **Queue / Scheduler**: BullMQ, Redis 7 (ioredis)
- **Search Engine**: Elasticsearch 8 (Official `@elastic/elasticsearch` client)
- **Email Delivery**: Nodemailer, Ethereal Email SMTP
- **Auth & Integrations**: Passport.js (Google OAuth 2.0), `@slack/web-api` (Slack OAuth)
- **Queue Dashboard**: Bull Board (`@bull-board/express`)

### Frontend
- **Framework**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS
- **State & Data Fetching**: TanStack React Query v5, Axios
- **Rich Text Editor**: Tiptap (`@tiptap/react`, `@tiptap/starter-kit`)
- **Icons & Notifications**: Lucide React, `react-hot-toast`
- **Validation**: Zod

---

## 4. Folder Structure

```
reachinbox/
├── apps/
│   ├── backend/
│   │   ├── prisma/
│   │   │   └── schema.prisma         # Database schema
│   │   ├── src/
│   │   │   ├── auth/                 # Google & Slack OAuth strategies
│   │   │   ├── config/               # Env, DB, Redis, ES, Session configs
│   │   │   ├── integrations/         # Ethereal SMTP transport
│   │   │   ├── middleware/           # Auth guard, validation, error handler
│   │   │   ├── queue/                # BullMQ queue & worker processor
│   │   │   ├── routes/               # Express REST route controllers
│   │   │   ├── services/             # Email, RateLimit, ES, Slack, Sender services
│   │   │   ├── utils/                # AES-256 encryption, logger, error types
│   │   │   ├── __tests__/            # Automated test suite
│   │   │   ├── app.ts                # Express app setup & Bull Board mounting
│   │   │   ├── server.ts             # API server entrypoint
│   │   │   └── worker.ts             # Dedicated BullMQ worker process
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── frontend/
│       ├── src/
│       │   ├── app/                  # Next.js App Router (login, dashboard)
│       │   ├── components/
│       │   │   ├── auth/             # AuthGuard wrapper
│       │   │   ├── compose/          # Compose form, Recipient chips, CSV upload, Editor
│       │   │   ├── email/            # Email rows, list, status badge, search bar
│       │   │   ├── layout/           # Sidebar, Header
│       │   │   └── ui/               # Button, Input, Modal, Badge, Dropdown, Skeleton
│       │   ├── hooks/                # React Query hooks for emails, auth, slack
│       │   └── lib/                  # Axios instance & QueryClient
│       ├── package.json
│       └── tailwind.config.ts
├── packages/
│   └── shared/                       # Shared TypeScript interfaces, enums, Zod schemas
├── docker-compose.yml                # PostgreSQL, Redis, Elasticsearch
├── .env.example                      # Root configuration template
└── README.md
```

---

## 5. Prerequisites

- **Node.js**: >= 18.x
- **npm** or **pnpm**
- **Docker & Docker Compose** (for PostgreSQL, Redis, Elasticsearch)
- Google Cloud OAuth Credentials (Client ID & Client Secret)
- Slack App Credentials (Client ID & Client Secret, optional for Slack notifications)

---

## 6. Docker Setup

Spin up the infrastructure dependencies:

```bash
docker compose up -d
```

This launches:
- **PostgreSQL 15**: `localhost:5432` (`reachinbox` / `reachinbox_pass`)
- **Redis 7**: `localhost:6379` (with AOF persistence enabled)
- **Elasticsearch 8**: `localhost:9200` (single-node, security disabled for local dev)

---

## 7. Environment Variables Configuration

Copy the template:

```bash
cp .env.example .env
```

Populate the `.env` values:

```env
# Application
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:3000

# Database & Cache
DATABASE_URL=postgresql://reachinbox:reachinbox_pass@localhost:5432/reachinbox
REDIS_URL=redis://localhost:6379
ELASTICSEARCH_URL=http://localhost:9200

# Google OAuth 2.0
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback

# Slack OAuth & Notifications
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
SLACK_REDIRECT_URI=http://localhost:4000/api/slack/callback

# Ethereal Email SMTP
ETHEREAL_HOST=smtp.ethereal.email
ETHEREAL_PORT=587
ETHEREAL_USER=your_ethereal_user@ethereal.email
ETHEREAL_PASSWORD=your_ethereal_password

# Security & Concurrency
SESSION_SECRET=a_very_secure_random_session_secret_32_chars
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
WORKER_CONCURRENCY=5
MIN_DELAY_BETWEEN_EMAILS_MS=2000
MAX_EMAILS_PER_HOUR_PER_SENDER=200
```

---

## 8. Google OAuth Setup Guide

1. Navigate to the [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Create an **OAuth 2.0 Client ID** (Application type: *Web application*).
3. Set **Authorized JavaScript origins**: `http://localhost:3000`, `http://localhost:4000`.
4. Set **Authorized redirect URIs**: `http://localhost:4000/api/auth/google/callback`.
5. Copy the generated **Client ID** and **Client Secret** into `.env`.

---

## 9. Slack OAuth & Notification Setup

1. Create an app in [Slack API Portal](https://api.slack.com/apps).
2. Under **OAuth & Permissions**, add Redirect URL: `http://localhost:4000/api/slack/callback`.
3. Add User Scopes: `chat:write`, `channels:read`, `users:read`.
4. Copy **Client ID** and **Client Secret** into `.env`.

---

## 10. Ethereal Email Setup

Generate a free test mailbox on [Ethereal Email](https://ethereal.email/create) or let the sender service auto-provision credentials upon sender creation. All emails sent will generate a live Ethereal web preview URL stored in PostgreSQL and viewable in the UI.

---

## 11. Database Setup & Migrations

```bash
cd apps/backend
npm install
npx prisma generate
npx prisma migrate dev --name init
```

---

## 12. Running the Application

### Option 1: Monorepo Root (All together)

```bash
# Install all dependencies across workspaces
npm install

# Start Backend API server
npm run dev:backend

# Start Dedicated BullMQ Worker
npm run dev:worker

# Start Frontend Next.js app
npm run dev:frontend
```

### Option 2: Individual Terminals

**Terminal 1 (Backend API):**
```bash
cd apps/backend
npm run dev
# Running at http://localhost:4000
```

**Terminal 2 (BullMQ Worker):**
```bash
cd apps/backend
npm run worker
# Concurrency: 5 workers listening on 'email-queue'
```

**Terminal 3 (Next.js Frontend):**
```bash
cd apps/frontend
npm run dev
# Running at http://localhost:3000
```

---

## 13. Queue Dashboard (Bull Board)

Visit the live BullMQ monitoring dashboard:
**`http://localhost:4000/admin/queues`**

Inspect:
- **Delayed Jobs**: Scheduled emails awaiting their exact execution timestamp
- **Active Jobs**: Currently processing through Nodemailer/Ethereal
- **Completed Jobs**: Successfully delivered
- **Failed Jobs**: Errored jobs with full stack traces and automatic retry timers

---

## 14. Core Architecture Details

### A. Scheduling Without Cron (BullMQ Delayed Jobs)
When a campaign with $N$ recipients is submitted at start time $T_0$ with spacing $D$:
1. $N$ rows are written to PostgreSQL in `scheduled` status.
2. For recipient $i$, scheduled timestamp $T_i = \max(\text{now}, T_0) + (i \times D)$.
3. A BullMQ job is enqueued with delay `delay = Ti - now` and `jobId = email.id`.
4. Redis stores the job in a sorted set keyed by timestamp.
5. On exact expiration, BullMQ moves the job to the active set without polling overhead.

### B. Restart Persistence & Crash Recovery
- **BullMQ + Redis AOF**: All delayed jobs persist in Redis disk storage. Stopping or restarting Node.js backend or worker processes does **not** lose any scheduled jobs.
- On worker boot, BullMQ reconnects to Redis and immediately continues timer evaluation for future timestamps.

### C. Strict Multi-Worker Idempotency
To prevent duplicate sends across concurrent workers:
1. **Deterministic Idempotency Key**: `${campaignId}:${recipientEmail}:${sequenceIndex}` enforced with a `UNIQUE` constraint in PostgreSQL.
2. **Database Status Guard**: Workers execute an atomic `UPDATE "Email" SET status = 'processing' WHERE id = emailId AND status = 'scheduled'`.
3. If `affected_rows === 0`, another worker has claimed the job; the current execution terminates immediately.

### D. Distributed Redis Lua Rate Limiting
To ensure multiple workers never exceed sender hourly limits:
- Atomic Lua script executed directly inside Redis:

```lua
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])
local current = redis.call('INCR', key)
if current == 1 then
  redis.call('EXPIRE', key, ttl)
end
if current > limit then
  redis.call('DECR', key)
  return {0, limit - current + 1}
end
return {1, limit - current}
```

- **Rescheduling on Limit Hit**:
  1. If `allowed === 0`, calculate `nextHourStart = ceil(now to next UTC hour boundary)`.
  2. The job is rescheduled using `job.moveToDelayed(nextHourStart.getTime())`.
  3. The database record `scheduledAt` is updated and status reset to `scheduled`.
  4. An **idempotent Slack notification** is sent via Redis `SETNX slack-notif:{userId}:{senderEmail}:{hourWindow}` with a 1-hour TTL to prevent notification spam across workers.

### E. 1,000+ Email Load Handling
- Recipient creation is batched in chunks of 100 to prevent database connection exhaustion.
- Enqueueing uses asynchronous non-blocking BullMQ operations.
- Worker concurrency is strictly bounded by `WORKER_CONCURRENCY` to ensure node event-loop responsiveness.

---

## 15. REST API Endpoints

### Authentication (`/api/auth`)
- `GET /api/auth/google` - Initiate Google OAuth 2.0 flow
- `GET /api/auth/google/callback` - OAuth callback handler & session creator
- `POST /api/auth/logout` - Destroy authenticated session
- `GET /api/auth/me` - Get current authenticated user profile

### Emails (`/api/emails`)
- `POST /api/emails/schedule` - Schedule a new batch email campaign
- `GET /api/emails/scheduled?page=1&limit=20` - Fetch paginated scheduled emails
- `GET /api/emails/sent?page=1&limit=20` - Fetch paginated sent emails
- `GET /api/emails/search?q=&status=` - Full-text search via Elasticsearch
- `GET /api/emails/:id` - Fetch email detail with sender and campaign info
- `POST /api/emails/:id/cancel` - Cancel a scheduled email & remove BullMQ job

### Senders & Slack (`/api/senders`, `/api/slack`)
- `GET /api/senders` - List user's verified sender identities
- `POST /api/senders` - Create sender (supports auto Ethereal test mailbox)
- `GET /api/slack/connect` - Initiate Slack OAuth connection
- `GET /api/slack/callback` - Slack OAuth token exchange
- `POST /api/slack/disconnect` - Disconnect Slack integration
- `GET /api/slack/status` - Check Slack connection status

### Health Check (`/api/health`)
- `GET /api/health` - Health inspection of PostgreSQL, Redis, and Elasticsearch

---

## 16. Automated Test Suite

Run the Vitest test suite:

```bash
cd apps/backend
npm test
```

Tests cover:
- Scheduling delay and sequence timestamp calculations
- Deterministic idempotency key format verification
- Redis rate limit hourly windowing & UTC boundary calculations
- AES-256-GCM OAuth token encryption / decryption round-trip
- Zod request body validation & error catching

---

## 17. Step-by-Step Demo Verification Flow

1. **Login**: Navigate to `http://localhost:3000`. Click **Login with Google**.
2. **Dashboard**: Verify the sidebar displays your Google avatar, name, and email.
3. **Compose**: Click **Compose** in the sidebar.
4. **Recipients & CSV Upload**:
   - Manually enter email addresses (press Enter).
   - Or click **Upload List** and upload a `.csv` / `.txt` file with leads. Verify recipient chips and detected count.
5. **Schedule Parameters**:
   - Set **Delay between 2 emails**: e.g., `2` seconds.
   - Set **Hourly Limit**: e.g., `200`.
   - Click **Send Later** and pick a time or preset ("Tomorrow, 10:00 AM").
   - Click **Send Now** or **Done**.
6. **Queue Verification**:
   - Open `http://localhost:4000/admin/queues`. See delayed jobs registered in BullMQ.
7. **Delivery & Status Transition**:
   - Observe jobs transitioning from **Scheduled** -> **Processing** -> **Sent**.
   - Open email detail to inspect the live **Ethereal preview link**.
8. **Rate Limit & Slack Alert Demonstration**:
   - Set hourly limit to `2` and schedule 5 emails.
   - First 2 send immediately; the remaining 3 are rescheduled to the next hour window.
   - A real Slack alert is dispatched to your connected Slack account.
9. **Server Restart Persistence Test**:
   - Schedule emails 10 minutes into the future.
   - Stop backend (`Ctrl+C`) and restart it.
   - Verify delayed jobs remain in Bull Board and execute on time.
