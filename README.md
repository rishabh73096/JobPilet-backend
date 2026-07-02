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
