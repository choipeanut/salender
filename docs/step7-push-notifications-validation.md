# STEP 7 Push Notification Validation

## Goal

- Verify Expo push token registration
- Verify notification pipeline for:
  - `new_sale`
  - `sale_started`
  - `ending_soon`
  - `discount_changed`
- Verify duplicate-send prevention

## Automated Test Run

1. Build and test:
   - `.\.tools\node-v24.14.1-win-x64\pnpm.CMD build`
   - `.\.tools\node-v24.14.1-win-x64\pnpm.CMD test`
2. Confirm these suites pass:
   - `packages/domain/tests/push-notification-pipeline.service.test.ts`
   - `packages/domain/tests/api.integration.test.ts`
   - `packages/domain/tests/api.validation.test.ts`

## API-Level Device Registration Check

1. Call route:
   - `POST /me/devices/expo-token`
2. Example body:

```json
{
  "platform": "ios",
  "expoPushToken": "ExponentPushToken[test-device-token-001]",
  "appVersion": "0.2.0"
}
```

3. Expected result:
   - HTTP `200`
   - `userDevice.pushToken` stored
   - repeated same token call updates existing row (`user_id + push_token` upsert behavior)

## Notification Pipeline Check (Test Device Baseline)

1. Register at least one active Expo token for the test user.
2. Ensure brand subscription exists and is enabled.
3. Process event changes through `PushNotificationPipelineService`.
4. Confirm notification rows are created and status transitions from `queued` to `sent` (or `failed` if no valid device).

## Duplicate Prevention Check

1. Re-run the same event change input.
2. Confirm no additional notification row is created for the same dedupe key.
3. Confirm push send count does not increase on duplicate run.

## Optional DB Verification (Supabase SQL)

```sql
select id, user_id, push_token, is_active, updated_at
from public.user_devices
order by updated_at desc;

select id, user_id, notification_type, status, payload_json, created_at
from public.notifications
order by created_at desc
limit 50;
```

Expected:
- `payload_json.dedupeKey` present per notification row
- No duplicate rows for same user + dedupe key
