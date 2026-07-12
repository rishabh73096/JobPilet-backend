# YourApp Backend

Node.js + Express + TypeScript REST API.

## Stack
- Node.js + Express
- TypeScript (strict mode)
- MongoDB + Mongoose
- Redis (ioredis) + BullMQ (background jobs / scheduled email sending)
- JWT Auth
- Zod validation
- Pino logging + Sentry error tracking
- Gemini API (AI email generation)
- Resend (email sending)
- AWS S3 (resume uploads)
- Stripe (payments)
- Inngest (background jobs)

## Getting started

```bash
cp .env.example .env
npm install
npm run dev:all   # API + email worker together
# or run them separately: npm run dev / npm run dev:worker
```

Requires a running MongoDB instance (local `mongod` or a connection string in `MONGODB_URI`) and Redis.
The API (`server.ts`) and the scheduled-email worker (`worker.ts`) are separate processes
so one can restart or scale independently of the other in production.

## API Endpoints

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
POST   /api/auth/mfa/setup            (requires auth — initiates TOTP setup, returns QR code & secret)
POST   /api/auth/mfa/enable           (requires auth — verifies TOTP code, enables MFA)
POST   /api/auth/mfa/disable          (requires auth — disables MFA)
POST   /api/auth/mfa/verify           (public — resolves login challenge using tempToken + TOTP code)

GET    /api/users          (admin only)
GET    /api/users/:id
PATCH  /api/users/:id
DELETE /api/users/:id      (admin only)

GET    /api/companies
POST   /api/companies
GET    /api/companies/:id
PATCH  /api/companies/:id
DELETE /api/companies/:id

GET    /api/applications
POST   /api/applications
GET    /api/applications/:id
PATCH  /api/applications/:id
DELETE /api/applications/:id

POST   /api/emails/generate           (AI-draft an email from an application's JD)
GET    /api/emails                    (?status=draft|scheduled|sent|failed)
GET    /api/emails/stats
GET    /api/emails/application/:applicationId
GET    /api/emails/:id
PATCH  /api/emails/:id
POST   /api/emails/:id/send
POST   /api/emails/:id/schedule
DELETE /api/emails/:id/schedule       (cancel a scheduled send)
POST   /api/emails/bulk-schedule
GET    /api/emails/track/:trackingId  (public — 1x1 open-tracking pixel)

POST   /api/uploads/resume            (multipart, field name "file", PDF only, max 5MB)
GET    /api/uploads/resume/:id/url    (signed S3 URL, or CDN URL if RESUME_CDN_URL is set)
```

## Project structure

```
src/
  app.ts          Express app setup
  server.ts       API entry point
  worker.ts       Email worker entry point (separate process from the API)
  ai/             Gemini client + email generation
  email/          Resend client
  jobs/           BullMQ queue + worker (scheduled email sends)
  lib/            Client-safe 3rd-party inits (S3)
  config/         Env + CORS config
  models/         Mongoose schemas
  routes/         URL mapping only
  controllers/    req/res handling
  services/       Business logic + DB queries
  middleware/     Auth, validation, errors, rate limit
  db/             MongoDB + Redis clients
  cache/          Redis cache helpers
  events/         Inngest publishers + handlers
  validators/     Zod schemas
  monitoring/     Pino logger + Sentry
  types/          TypeScript types
```

## Request lifecycle

```
Request → Rate limit → CORS → Auth middleware
  → Route → Controller → Service → Repo → DB
    → Cache → Response
```

## Deployment

See `d:\Personal\NEW-Project\BUILD_PLAN.md` for the full Phase 4 deploy notes and the
manual setup checklist (AWS account, EC2, S3, CloudFront, Sentry, GitHub secrets — none
of that can be done from this repo). In short:

- `Dockerfile` + the root `docker-compose.yml` are for local dev/testing only.
- Production runs via PM2 directly on the EC2 box (`ecosystem.config.js`, two processes:
  `api` and `worker`) — see `deploy/setup-ec2.sh` for one-time provisioning and
  `deploy/deploy.sh` for what runs on every deploy.
- `.github/workflows/deploy.yml` SSHes into EC2 and runs `deploy/deploy.sh` on push to
  `main`, once `EC2_HOST` / `EC2_USER` / `EC2_SSH_KEY` secrets are set on the repo.

## Multi-Factor Authentication (MFA/TOTP)

This application supports Time-based One-Time Password (TOTP) Multi-Factor Authentication using `otplib` and QR code imaging via `qrcode`.

### Mechanism & Authentication flow:
1. **Initial Login**: User submits email/password.
   - If MFA is disabled: API returns `{ success: true, data: { user, token } }`.
   - If MFA is enabled: API returns `{ success: true, data: { mfaRequired: true, tempToken: "..." } }`. The `tempToken` is a JWT that only permits verification challenges and expires in 5 minutes.
2. **MFA Verification**: Client prompts user for their 6-digit authenticator code and sends it along with the `tempToken` to `POST /api/auth/mfa/verify`.
   - On success: API returns the final authentication session JWT.
3. **MFA Setup**:
   - Authorized user initiates setup by making a `POST` request to `/api/auth/mfa/setup`, which returns a base32 text secret and a base64 encoded QR code Data URL.
   - The user scans the QR code in their authenticator app (e.g. Google Authenticator) and submits their first 6-digit verification code to `POST /api/auth/mfa/enable`. On successful verification, the database flag `mfaEnabled` is flipped to `true`.

## Gmail OAuth Integration & Outreach Delivery

Users can connect their personal Google / Gmail account to send cold outreach emails directly from their own inbox.

### Setup
1. In [Google Cloud Console](https://console.cloud.google.com/), create an OAuth 2.0 Client ID (Web application type).
2. Set **Authorized redirect URIs** to: `http://localhost:4000/api/google/callback` (dev) or your production API URL.
3. Add the following to your `.env`:
```env
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_REDIRECT_URI=http://localhost:4000/api/google/callback
```

### How it works
- **Connect**: User clicks "Connect Gmail" in Settings — they are redirected to Google's consent screen (requesting `gmail.send` and `gmail.readonly` scopes).
- **Callback**: Google redirects back to `/api/google/callback?code=...&state=userId`. The backend exchanges the code for access/refresh tokens and stores them in MongoDB.
- **Delivery**: When a cold email is sent, `email.service.ts` checks if `user.googleRefreshToken` exists. If set, it constructs an RFC 5322 raw MIME message, base64url-encodes it, and sends it via `gmail.users.messages.send`. Otherwise, it falls back to the Resend API.
- **Disconnect**: `POST /api/google/disconnect` clears the tokens from the database.

## IMAP Reply Polling & AI Classification

The background worker (`worker.ts`) polls Gmail threads every **5 minutes** for all users with a connected Google account.

### How it works
1. Finds applications with status `applied` or `interview` that have a sent email with a `gmailThreadId`.
2. Fetches the Gmail thread via `gmail.users.threads.get`.
3. Identifies new messages (sender ≠ user's Google email) not yet processed.
4. Extracts the message body (plain text, or falls back to snippet).
5. Sends the body to the **Gemini AI Reply Classifier** (`src/ai/reply-classifier.ts`) which returns:
   - `classification`: `interview` | `rejection` | `follow_up` | `other`
   - `summary`: brief explanation of the email
   - `confidence`: 0–1 confidence score
6. If classified as `interview` or `rejection`, automatically updates the Kanban application status.
7. Marks the Gmail message ID as processed to prevent duplicate classifications.

#   J o b P i l e t - b a c k e n d