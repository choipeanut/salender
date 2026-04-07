import { describe, expect, it } from "@jest/globals";

import {
  adminSyncBodySchema,
  createSubscriptionBodySchema,
  notificationsQuerySchema,
  patchSubscriptionBodySchema,
  registerExpoPushTokenBodySchema,
  saleEventsQuerySchema
} from "../src/api/schemas";
import { testDataIds } from "../src/repositories/in-memory";

describe("STEP2 validation schemas", () => {
  it("parses sale-events query with brandIds CSV", () => {
    const parsed = saleEventsQuerySchema.parse({
      month: "2026-04",
      brandIds: `${testDataIds.brands.oliveyoung},${testDataIds.brands.musinsa}`
    });

    expect(parsed.month).toBe("2026-04");
    expect(parsed.brandIds).toEqual([testDataIds.brands.oliveyoung, testDataIds.brands.musinsa]);
  });

  it("applies default subscription settings for POST", () => {
    const parsed = createSubscriptionBodySchema.parse({});

    expect(parsed.isEnabled).toBe(true);
    expect(parsed.notifyOnNewSale).toBe(true);
    expect(parsed.notifyOnSaleStart).toBe(true);
    expect(parsed.notifyBeforeEndHours).toBe(24);
    expect(parsed.notifyOnDiscountChange).toBe(false);
  });

  it("rejects empty PATCH payload", () => {
    const result = patchSubscriptionBodySchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it("applies notifications query defaults", () => {
    const parsed = notificationsQuerySchema.parse({});

    expect(parsed.limit).toBe(20);
    expect(parsed.offset).toBe(0);
  });

  it("rejects invalid admin sync body", () => {
    const result = adminSyncBodySchema.safeParse({ brandId: "invalid" });

    expect(result.success).toBe(false);
  });

  it("validates expo push token registration body", () => {
    const valid = registerExpoPushTokenBodySchema.safeParse({
      platform: "ios",
      expoPushToken: "ExponentPushToken[step7token123]",
      appVersion: "0.2.0"
    });
    const invalid = registerExpoPushTokenBodySchema.safeParse({
      platform: "ios",
      expoPushToken: "not-expo-token"
    });

    expect(valid.success).toBe(true);
    expect(invalid.success).toBe(false);
  });
});
