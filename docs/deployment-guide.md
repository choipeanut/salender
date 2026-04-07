# Deployment Guide (STEP 9)

## 1) Prerequisites

- Node.js 22+
- pnpm 10+
- Supabase project (URL, anon key, service role key)
- Expo access token for push delivery

## 2) Environment Setup

1. Copy root env:
   - `cp .env.example .env`
2. Copy admin env:
   - `cp apps/admin-web/.env.example apps/admin-web/.env.local`
3. Fill required values:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `EXPO_ACCESS_TOKEN`

## 3) Install + Verify

1. Install:
   - `pnpm install`
2. Build:
   - `pnpm build`
3. Test:
   - `pnpm test`

## 4) Deploy Components

### Admin Web (Next.js)

- Build:
  - `pnpm --filter @salecalendar/admin-web build:web`
- Start:
  - `pnpm --filter @salecalendar/admin-web start`
- Health check:
  - `GET /api/dashboard` should return JSON snapshot

### Collector Worker

- Build:
  - `pnpm --filter @salecalendar/collector-worker build`
- Dry-run:
  - `pnpm --filter @salecalendar/collector-worker dry-run -- --brandSlug steam`
- Runtime mode:
  - run scheduled/manual sync jobs from worker process manager

### Supabase

- Run migrations in order:
  - `supabase/migrations/*`
- Seed:
  - `supabase/seed.sql`

## 5) Runtime Hardening

- Enable retry/backoff policy for external calls:
  - collector real connector fetch
  - Expo push send
- Keep per-brand manual sync rate limit enabled
- Alert on:
  - sync failures
  - notification `failed` spike
  - repeated 429 or 5xx upstream responses
