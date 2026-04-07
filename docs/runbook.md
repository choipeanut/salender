# Runbook (Admin Ops + Collector)

## Incident: Manual Sync Returns `429 rate_limited`

1. Check the most recent request time for the same brand.
2. Wait until `retryAfterMs` passes.
3. Re-run manual sync once.
4. If repeated:
   - increase interval between operator-triggered syncs
   - verify no automation loop is calling manual sync endpoint

## Incident: Sync Run Failed

1. Open admin dashboard:
   - `sync runs`
   - `sync errors`
2. Identify:
   - error type
   - message
   - attempts used
3. For upstream/network errors:
   - confirm retry/backoff happened (attempts > 1)
   - perform dry-run first
   - then manual sync
4. Escalate if:
   - same brand fails for 3+ consecutive runs
   - all brands fail simultaneously

## Incident: Push Notification Failure Spike

1. Verify Expo endpoint/access token configuration.
2. Confirm device tokens are valid Expo tokens.
3. Check `notifications` status split:
   - `queued`
   - `sent`
   - `failed`
4. Reprocess only failed triggers after root cause is fixed.

## Duplicate Notification Concern

1. Inspect `payload_json.dedupeKey` for repeated rows.
2. Confirm pipeline checks dedupe key before insert/send.
3. If duplicates appear:
   - verify dedupe key composition per notification type
   - verify repository query path for dedupe lookup

## Safe Recovery Sequence

1. `dry-run` for target brand
2. Manual sync for the same brand
3. Validate recent changes and sync errors panel
4. Validate notification send ratio (`sent` vs `failed`)
