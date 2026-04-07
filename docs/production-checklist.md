# Production Checklist (STEP 9)

## Config

- [ ] `.env` values set in runtime secret store
- [ ] Supabase keys scoped correctly (anon vs service role)
- [ ] Expo push token configured and rotated policy documented

## Reliability

- [ ] Retry/backoff enabled for real connector fetch calls
- [ ] Retry/backoff enabled for Expo push delivery calls
- [ ] Manual sync rate limit enabled to reduce upstream pressure
- [ ] Operator path supports dry-run before write mode

## Observability

- [ ] Sync run history visible
- [ ] Sync error history visible
- [ ] Recent sale-event changes visible
- [ ] Notification status metrics (`queued/sent/failed`) tracked

## Data Safety

- [ ] Notification dedupe key check enabled
- [ ] Idempotent upsert path verified for devices/subscriptions/events
- [ ] Failed states are persisted with actionable error detail

## Release Gate

- [ ] `pnpm build` passes
- [ ] `pnpm test` passes
- [ ] Admin manual sync happy path validated
- [ ] Admin rate-limit path validated
