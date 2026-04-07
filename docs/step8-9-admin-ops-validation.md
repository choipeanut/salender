# STEP 8 + 9 Admin/Ops Validation

## Start Admin Web

1. Install dependencies:
   - `pnpm install`
2. Run admin web:
   - `pnpm --filter @salecalendar/admin-web dev`
3. Open:
   - `http://localhost:3100`

## Validate Dashboard Widgets

1. Confirm page shows:
   - sync runs table
   - sync errors table
   - recent changes table
2. Click `Refresh` and confirm timestamp updates.

## Validate Manual Sync

1. Select a brand and click `Run Manual Sync`.
2. Confirm:
   - new row appears in sync runs
   - recent changes table gets a new entry
3. Enable `Dry-run`, run again, and confirm:
   - dry-run log appears
   - no persistent mutation from dry-run path

## Validate Rate Limit

1. Trigger manual sync for the same brand twice within 15 seconds.
2. Confirm second request returns rate-limited result (`429` from API).
3. Confirm sync errors table records a `rate_limited` item.

## Validate Retry/Backoff (Code-Level)

1. Run:
   - `pnpm test`
2. Confirm retry tests pass:
   - `packages/brand-connectors/tests/real-steam-connector.test.ts`
   - `packages/domain/tests/expo-push-gateway.test.ts`

## Validate Release Readiness Docs

- `.env.example`
- `docs/deployment-guide.md`
- `docs/runbook.md`
- `docs/production-checklist.md`
- `docs/mvp-checklist.md`
