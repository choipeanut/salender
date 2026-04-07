# Connector Guidelines

## Source policy

- Prefer data sources in this order:
  1. Official API or official machine-readable feed
  2. Partner-approved API feed
  3. Public page endpoint that does not require login
- Always document source URL and source type (`official_api`, `partner_api`, `public_page`).

## Safety and compliance

- Do not implement login bypass.
- Do not implement anti-bot evasion.
- Do not automate around explicit access controls (captcha, challenge pages, blocked robots policy).
- Use plain HTTP requests only to endpoints that are publicly reachable without authentication.

## Resilience and graceful degradation

- Treat external I/O as unstable and fail safely.
- On connector/API failures, throw a clear error message with status/context so runtime can log `sync_error` records.
- Keep the worker process alive; runtime should mark run status as `failed` and continue with next job.
- Accept partial data and skip malformed records when possible.

## Dry-run expectations

- Dry-run must fetch + normalize + diff without mutating `sale_events`, snapshots, or sync tables.
- Dry-run output should include:
  - fetched/normalized counts
  - change summary (`created`, `updated`, `unchanged`, `ended`)
  - small sample records for quick inspection
- Current command:
  - `pnpm --filter @salecalendar/collector-worker dry-run -- --brandSlug steam`

## Current STEP 6 real connector

- Connector slug: `steam`
- Source type: `official_api`
- Endpoint: `https://store.steampowered.com/api/featuredcategories?cc=kr&l=koreana`
- Strategy:
  - Read `specials.items` only
  - Keep discounted items only
  - Normalize into shared `RawSaleRecord -> NormalizedSaleRecord` pipeline
