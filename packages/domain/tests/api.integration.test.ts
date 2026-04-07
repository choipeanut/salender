import { describe, expect, it } from "@jest/globals";

import { createApiRouter } from "../src/api/router";
import { createInMemoryRepositories, testDataIds } from "../src/repositories/in-memory";

const createTestRouter = () => createApiRouter(createInMemoryRepositories());

describe("STEP2 API integration", () => {
  it("GET /brands returns active brand list", async () => {
    const router = createTestRouter();
    const response = await router.handle({ method: "GET", path: "/brands" });
    const body = response.body as { brands: Array<{ id: string }> };

    expect(response.status).toBe(200);
    expect(body.brands.length).toBe(4);
  });

  it("GET /brands/:slug returns brand detail", async () => {
    const router = createTestRouter();
    const response = await router.handle({ method: "GET", path: "/brands/oliveyoung" });
    const body = response.body as { brand: { slug: string } };

    expect(response.status).toBe(200);
    expect(body.brand.slug).toBe("oliveyoung");
  });

  it("GET /brands/:slug returns 404 when missing", async () => {
    const router = createTestRouter();
    const response = await router.handle({ method: "GET", path: "/brands/not-exists" });

    expect(response.status).toBe(404);
  });

  it("GET /sale-events validates month format", async () => {
    const router = createTestRouter();
    const response = await router.handle({
      method: "GET",
      path: "/sale-events",
      query: { month: "2026/04" }
    });

    expect(response.status).toBe(400);
  });

  it("GET /sale-events filters by month and brandIds", async () => {
    const router = createTestRouter();
    const response = await router.handle({
      method: "GET",
      path: "/sale-events",
      query: {
        month: "2026-04",
        brandIds: testDataIds.brands.oliveyoung
      }
    });
    const body = response.body as { saleEvents: Array<{ brandId: string }> };

    expect(response.status).toBe(200);
    expect(body.saleEvents.length).toBe(1);
    expect(body.saleEvents[0]?.brandId).toBe(testDataIds.brands.oliveyoung);
  });

  it("GET /sale-events/:id returns event detail", async () => {
    const router = createTestRouter();
    const response = await router.handle({
      method: "GET",
      path: `/sale-events/${testDataIds.saleEvents.musinsaDenim}`
    });
    const body = response.body as { saleEvent: { id: string } };

    expect(response.status).toBe(200);
    expect(body.saleEvent.id).toBe(testDataIds.saleEvents.musinsaDenim);
  });

  it("POST /subscriptions/brands/:brandId requires authentication", async () => {
    const router = createTestRouter();
    const response = await router.handle({
      method: "POST",
      path: `/subscriptions/brands/${testDataIds.brands.oliveyoung}`,
      body: {}
    });

    expect(response.status).toBe(401);
  });

  it("POST /subscriptions/brands/:brandId creates subscription", async () => {
    const router = createTestRouter();
    const response = await router.handle({
      method: "POST",
      path: `/subscriptions/brands/${testDataIds.brands.oliveyoung}`,
      auth: { userId: testDataIds.users.defaultUserId },
      body: { notifyBeforeEndHours: 12 }
    });
    const body = response.body as { subscription: { notifyBeforeEndHours: number; userId: string } };

    expect(response.status).toBe(200);
    expect(body.subscription.notifyBeforeEndHours).toBe(12);
    expect(body.subscription.userId).toBe(testDataIds.users.defaultUserId);
  });

  it("PATCH /subscriptions/brands/:brandId validates body", async () => {
    const router = createTestRouter();
    const response = await router.handle({
      method: "PATCH",
      path: `/subscriptions/brands/${testDataIds.brands.oliveyoung}`,
      auth: { userId: testDataIds.users.defaultUserId },
      body: {}
    });

    expect(response.status).toBe(400);
  });

  it("PATCH /subscriptions/brands/:brandId updates existing subscription", async () => {
    const router = createTestRouter();
    await router.handle({
      method: "POST",
      path: `/subscriptions/brands/${testDataIds.brands.musinsa}`,
      auth: { userId: testDataIds.users.defaultUserId },
      body: {}
    });

    const response = await router.handle({
      method: "PATCH",
      path: `/subscriptions/brands/${testDataIds.brands.musinsa}`,
      auth: { userId: testDataIds.users.defaultUserId },
      body: { notifyOnDiscountChange: true }
    });
    const body = response.body as { subscription: { notifyOnDiscountChange: boolean } };

    expect(response.status).toBe(200);
    expect(body.subscription.notifyOnDiscountChange).toBe(true);
  });

  it("GET /me/subscriptions returns current user subscriptions", async () => {
    const router = createTestRouter();
    await router.handle({
      method: "POST",
      path: `/subscriptions/brands/${testDataIds.brands.oliveyoung}`,
      auth: { userId: testDataIds.users.defaultUserId },
      body: {}
    });

    const response = await router.handle({
      method: "GET",
      path: "/me/subscriptions",
      auth: { userId: testDataIds.users.defaultUserId }
    });
    const body = response.body as { subscriptions: Array<{ id: string }> };

    expect(response.status).toBe(200);
    expect(body.subscriptions.length).toBe(1);
  });

  it("GET /notifications supports status filter", async () => {
    const router = createTestRouter();
    const response = await router.handle({
      method: "GET",
      path: "/notifications",
      auth: { userId: testDataIds.users.defaultUserId },
      query: { status: "queued", limit: "10", offset: "0" }
    });
    const body = response.body as { notifications: Array<{ status: string }> };

    expect(response.status).toBe(200);
    expect(body.notifications.length).toBe(1);
    expect(body.notifications[0]?.status).toBe("queued");
  });

  it("POST /me/devices/expo-token requires authentication", async () => {
    const router = createTestRouter();
    const response = await router.handle({
      method: "POST",
      path: "/me/devices/expo-token",
      body: {
        platform: "ios",
        expoPushToken: "ExponentPushToken[api-step7-unauth]"
      }
    });

    expect(response.status).toBe(401);
  });

  it("POST /me/devices/expo-token registers device token", async () => {
    const router = createTestRouter();
    const response = await router.handle({
      method: "POST",
      path: "/me/devices/expo-token",
      auth: { userId: testDataIds.users.defaultUserId },
      body: {
        platform: "android",
        expoPushToken: "ExponentPushToken[api-step7-valid-token]",
        appVersion: "0.2.0"
      }
    });
    const body = response.body as {
      userDevice: { userId: string; pushToken: string; platform: string };
    };

    expect(response.status).toBe(200);
    expect(body.userDevice.userId).toBe(testDataIds.users.defaultUserId);
    expect(body.userDevice.platform).toBe("android");
    expect(body.userDevice.pushToken).toContain("ExponentPushToken");
  });

  it("POST /admin/sync/run enforces admin role", async () => {
    const router = createTestRouter();
    const forbiddenResponse = await router.handle({
      method: "POST",
      path: "/admin/sync/run",
      auth: { userId: testDataIds.users.defaultUserId, isAdmin: false },
      body: { brandId: testDataIds.brands.oliveyoung }
    });
    const successResponse = await router.handle({
      method: "POST",
      path: "/admin/sync/run",
      auth: { userId: testDataIds.users.adminUserId, isAdmin: true },
      body: { brandId: testDataIds.brands.oliveyoung }
    });
    const body = successResponse.body as { syncRun: { runType: string } };

    expect(forbiddenResponse.status).toBe(403);
    expect(successResponse.status).toBe(201);
    expect(body.syncRun.runType).toBe("manual");
  });
});
