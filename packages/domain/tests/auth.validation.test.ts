import { describe, expect, it } from "@jest/globals";

import {
  authCredentialsSchema,
  deviceRegistrationSchema,
  guestSubscriptionDraftListSchema
} from "../src/auth/schemas";
import { testDataIds } from "../src/repositories/in-memory";

describe("STEP4 auth validation", () => {
  it("accepts valid sign-in credentials", () => {
    const parsed = authCredentialsSchema.parse({
      email: "member@example.com",
      password: "password123"
    });

    expect(parsed.email).toBe("member@example.com");
  });

  it("rejects invalid credentials", () => {
    const result = authCredentialsSchema.safeParse({
      email: "not-email",
      password: "short"
    });

    expect(result.success).toBe(false);
  });

  it("accepts guest subscription draft list", () => {
    const parsed = guestSubscriptionDraftListSchema.parse([
      {
        brandId: testDataIds.brands.oliveyoung,
        settings: {
          isEnabled: true,
          notifyOnNewSale: true,
          notifyOnSaleStart: true,
          notifyBeforeEndHours: 24,
          notifyOnDiscountChange: false
        }
      }
    ]);

    expect(parsed.length).toBe(1);
  });

  it("validates device registration shape", () => {
    const parsed = deviceRegistrationSchema.parse({
      platform: "ios",
      pushToken: "ExponentPushToken[step4-validation]",
      appVersion: "0.1.0"
    });

    expect(parsed.platform).toBe("ios");
  });
});
