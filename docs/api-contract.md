# API Contract

## Common

- Base path: `/`
- Content type: `application/json`
- Validation: `zod`
- Error shape:

```json
{
  "error": {
    "code": "invalid_request",
    "message": "Request validation failed.",
    "details": {}
  }
}
```

## Public Endpoints

### `GET /brands`

- Returns active brands.
- Response `200`: `{ "brands": Brand[] }`

### `GET /brands/:slug`

- Returns brand detail.
- Response `200`: `{ "brand": Brand }`
- Response `404`: brand not found.

### `GET /sale-events`

- Query:
  - `month` (required): `YYYY-MM`
  - `brandIds` (optional): UUID CSV (`id1,id2,...`)
- Response `200`: `{ "saleEvents": SaleEvent[] }`
- Response `400`: invalid query values.

### `GET /sale-events/:id`

- Response `200`: `{ "saleEvent": SaleEvent }`
- Response `404`: event not found.

## Authenticated Endpoints

### `POST /subscriptions/brands/:brandId`

- Creates or enables a brand subscription.
- Body fields (all optional, defaults applied):
  - `isEnabled`
  - `notifyOnNewSale`
  - `notifyOnSaleStart`
  - `notifyBeforeEndHours` (0..168)
  - `notifyOnDiscountChange`
- Response `200`: `{ "subscription": UserBrandSubscription }`

### `PATCH /subscriptions/brands/:brandId`

- Partially updates subscription fields.
- Response `200`: `{ "subscription": UserBrandSubscription }`

### `GET /me/subscriptions`

- Response `200`: `{ "subscriptions": UserBrandSubscription[] }`

### `GET /notifications`

- Query:
  - `status` (optional): `queued | sent | failed | read`
  - `limit` (optional): `1..100`, default `20`
  - `offset` (optional): `>= 0`, default `0`
- Response `200`: `{ "notifications": NotificationRecord[] }`

### `POST /me/devices/expo-token`

- Registers or refreshes Expo push token.
- Body:
  - `platform`: `ios | android | web | unknown`
  - `expoPushToken`: `ExponentPushToken[...]` or `ExpoPushToken[...]`
  - `appVersion` (optional)
- Response `200`: `{ "userDevice": UserDevice }`

## Admin Endpoint

### `POST /admin/sync/run`

- Auth: admin
- Body:
  - `brandId` UUID (required)
  - `sourceId` UUID (optional)
- Response `201`: `{ "syncRun": SyncRun }`

## Source of Truth

- Contract list: `packages/domain/src/api/contract.ts`
- Router: `packages/domain/src/api/router.ts`
- Validation schemas: `packages/domain/src/api/schemas.ts`
