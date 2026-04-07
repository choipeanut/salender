import { describe, expect, it } from "@jest/globals";

import { AuthSubscriptionService } from "../src/services/auth-subscription-service";
import { createInMemoryRepositories, testDataIds } from "../src/repositories/in-memory";
import type { AuthGateway } from "../src/auth/interfaces";
import type { AuthSession, AuthUser, SignInWithPasswordInput } from "../src/auth/types";
import type { SubscriptionSettingsInput } from "../src/repositories/interfaces";

const baseSettings: SubscriptionSettingsInput = {
  isEnabled: true,
  notifyOnNewSale: true,
  notifyOnSaleStart: true,
  notifyBeforeEndHours: 24,
  notifyOnDiscountChange: false
};

class MockAuthGateway implements AuthGateway {
  private readonly signedOutTokens: string[] = [];

  async signInWithPassword(input: SignInWithPasswordInput): Promise<AuthSession> {
    return {
      userId: testDataIds.users.defaultUserId,
      email: input.email,
      accessToken: "mock-access-token",
      refreshToken: "mock-refresh-token",
      expiresAt: 1_700_000_000
    };
  }

  async signOut(accessToken: string): Promise<void> {
    this.signedOutTokens.push(accessToken);
  }

  async getUserFromAccessToken(accessToken: string): Promise<AuthUser | null> {
    if (accessToken === "mock-access-token") {
      return {
        userId: testDataIds.users.defaultUserId,
        email: "member@example.com"
      };
    }
    return null;
  }

  getSignedOutTokens(): string[] {
    return [...this.signedOutTokens];
  }
}

describe("STEP4 auth/subscription service", () => {
  it("signs in and merges guest subscriptions with smartUnion strategy", async () => {
    const repositories = createInMemoryRepositories({
      subscriptions: [
        {
          id: "00000000-0000-0000-0000-000000009991",
          userId: testDataIds.users.defaultUserId,
          brandId: testDataIds.brands.musinsa,
          isEnabled: true,
          notifyOnNewSale: false,
          notifyOnSaleStart: true,
          notifyBeforeEndHours: 36,
          notifyOnDiscountChange: false,
          createdAt: "2026-04-07T00:00:00.000Z",
          updatedAt: "2026-04-07T00:00:00.000Z"
        }
      ]
    });
    const authGateway = new MockAuthGateway();
    const service = new AuthSubscriptionService({
      authGateway,
      brandRepository: repositories.brandRepository,
      subscriptionRepository: repositories.subscriptionRepository,
      userDeviceRepository: repositories.userDeviceRepository
    });

    const result = await service.signInAndMergeGuestState({
      email: "member@example.com",
      password: "password123",
      mergeStrategy: "smartUnion",
      guestSubscriptions: [
        {
          brandId: testDataIds.brands.oliveyoung,
          settings: {
            ...baseSettings,
            notifyBeforeEndHours: 12
          }
        },
        {
          brandId: testDataIds.brands.musinsa,
          settings: {
            ...baseSettings,
            notifyOnDiscountChange: true,
            notifyBeforeEndHours: 10
          }
        }
      ]
    });

    expect(result.session.userId).toBe(testDataIds.users.defaultUserId);
    expect(result.mergeSummary).toEqual({
      createdCount: 1,
      updatedCount: 1,
      skippedCount: 0
    });

    const subscriptions = await repositories.subscriptionRepository.listSubscriptionsByUser(
      testDataIds.users.defaultUserId
    );
    expect(subscriptions.length).toBe(2);
    const musinsa = subscriptions.find((item) => item.brandId === testDataIds.brands.musinsa);
    expect(musinsa?.notifyOnDiscountChange).toBe(true);
    expect(musinsa?.notifyBeforeEndHours).toBe(10);
  });

  it("supports explicit sign-out flow", async () => {
    const repositories = createInMemoryRepositories();
    const authGateway = new MockAuthGateway();
    const service = new AuthSubscriptionService({
      authGateway,
      brandRepository: repositories.brandRepository,
      subscriptionRepository: repositories.subscriptionRepository,
      userDeviceRepository: repositories.userDeviceRepository
    });

    await service.signOut({
      userId: testDataIds.users.defaultUserId,
      email: "member@example.com",
      accessToken: "mock-access-token",
      refreshToken: "mock-refresh-token",
      expiresAt: 1_700_000_000
    });

    expect(authGateway.getSignedOutTokens()).toEqual(["mock-access-token"]);
  });

  it("stores subscription and device registration for authenticated user", async () => {
    const repositories = createInMemoryRepositories();
    const service = new AuthSubscriptionService({
      authGateway: new MockAuthGateway(),
      brandRepository: repositories.brandRepository,
      subscriptionRepository: repositories.subscriptionRepository,
      userDeviceRepository: repositories.userDeviceRepository
    });

    const subscription = await service.saveBrandSubscription(
      testDataIds.users.defaultUserId,
      testDataIds.brands.oliveyoung,
      baseSettings
    );
    const device = await service.registerUserDevice(testDataIds.users.defaultUserId, {
      platform: "android",
      pushToken: "ExponentPushToken[local-step4-token]",
      appVersion: "0.1.0"
    });

    expect(subscription.brandId).toBe(testDataIds.brands.oliveyoung);
    expect(device.platform).toBe("android");
    expect(device.pushToken).toContain("ExponentPushToken");
  });

  it("keeps account settings when merge strategy is preferAccount", async () => {
    const repositories = createInMemoryRepositories({
      subscriptions: [
        {
          id: "00000000-0000-0000-0000-000000009992",
          userId: testDataIds.users.defaultUserId,
          brandId: testDataIds.brands.oliveyoung,
          isEnabled: true,
          notifyOnNewSale: true,
          notifyOnSaleStart: true,
          notifyBeforeEndHours: 24,
          notifyOnDiscountChange: false,
          createdAt: "2026-04-07T00:00:00.000Z",
          updatedAt: "2026-04-07T00:00:00.000Z"
        }
      ]
    });
    const service = new AuthSubscriptionService({
      authGateway: new MockAuthGateway(),
      brandRepository: repositories.brandRepository,
      subscriptionRepository: repositories.subscriptionRepository,
      userDeviceRepository: repositories.userDeviceRepository
    });

    const summary = await service.mergeGuestSubscriptions(
      testDataIds.users.defaultUserId,
      [
        {
          brandId: testDataIds.brands.oliveyoung,
          settings: {
            ...baseSettings,
            notifyOnDiscountChange: true,
            notifyBeforeEndHours: 8
          }
        }
      ],
      "preferAccount"
    );

    expect(summary).toEqual({ createdCount: 0, updatedCount: 0, skippedCount: 1 });
    const updated = await repositories.subscriptionRepository.findSubscription(
      testDataIds.users.defaultUserId,
      testDataIds.brands.oliveyoung
    );
    expect(updated?.notifyOnDiscountChange).toBe(false);
    expect(updated?.notifyBeforeEndHours).toBe(24);
  });
});
