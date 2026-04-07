import { describe, expect, it } from "@jest/globals";

import type { SaleEvent } from "@salecalendar/shared-types";

import { createInMemoryRepositories, testDataIds } from "../src/repositories/in-memory";
import {
  PushNotificationPipelineService,
  type PushGateway,
  type PushMessage,
  type PushSendResult
} from "../src/services/push-notification-pipeline-service";

class MockPushGateway implements PushGateway {
  private readonly sentMessages: PushMessage[] = [];

  async send(messages: PushMessage[]): Promise<PushSendResult[]> {
    this.sentMessages.push(...messages);
    return messages.map((message, index) => ({
      to: message.to,
      success: true,
      ticketId: `ticket-${this.sentMessages.length + index}`
    }));
  }

  getSentMessages(): PushMessage[] {
    return [...this.sentMessages];
  }
}

const createSaleEvent = (overrides?: Partial<SaleEvent>): SaleEvent => ({
  id: testDataIds.saleEvents.oliveyoungSpring,
  brandId: testDataIds.brands.oliveyoung,
  sourceId: "00000000-0000-0000-0000-000000000201",
  externalId: "oliveyoung-step7-test",
  title: "Oliveyoung Step7 Event",
  summary: "Step7 test event",
  saleUrl: "https://www.oliveyoung.co.kr/event/step7",
  imageUrl: null,
  startAt: "2026-04-01T00:00:00.000Z",
  endAt: "2026-04-10T00:00:00.000Z",
  isAllDay: false,
  timezone: "Asia/Seoul",
  status: "upcoming",
  discountPercent: 20,
  discountLabel: "20% OFF",
  originalPriceMin: null,
  salePriceMin: null,
  categoriesJson: ["beauty"],
  tagsJson: ["step7"],
  normalizedHash: "step7-hash-a",
  firstSeenAt: "2026-04-01T00:00:00.000Z",
  lastSeenAt: "2026-04-01T00:00:00.000Z",
  lastChangedAt: "2026-04-01T00:00:00.000Z",
  createdAt: "2026-04-01T00:00:00.000Z",
  updatedAt: "2026-04-01T00:00:00.000Z",
  ...overrides
});

describe("STEP7 push notification pipeline", () => {
  it("dispatches all four notification types and records sent notifications", async () => {
    const repositories = createInMemoryRepositories({
      notifications: [],
      subscriptions: [
        {
          id: "00000000-0000-0000-0000-000000008001",
          userId: testDataIds.users.defaultUserId,
          brandId: testDataIds.brands.oliveyoung,
          isEnabled: true,
          notifyOnNewSale: true,
          notifyOnSaleStart: true,
          notifyBeforeEndHours: 24,
          notifyOnDiscountChange: true,
          createdAt: "2026-04-01T00:00:00.000Z",
          updatedAt: "2026-04-01T00:00:00.000Z"
        }
      ],
      userDevices: [
        {
          id: "00000000-0000-0000-0000-000000009001",
          userId: testDataIds.users.defaultUserId,
          platform: "ios",
          pushToken: "ExponentPushToken[pipeline-step7-device]",
          appVersion: "0.2.0",
          lastSeenAt: "2026-04-07T00:00:00.000Z",
          isActive: true,
          createdAt: "2026-04-07T00:00:00.000Z",
          updatedAt: "2026-04-07T00:00:00.000Z"
        }
      ]
    });

    const gateway = new MockPushGateway();
    const service = new PushNotificationPipelineService({
      brandRepository: repositories.brandRepository,
      subscriptionRepository: repositories.subscriptionRepository,
      notificationRepository: repositories.notificationRepository,
      userDeviceRepository: repositories.userDeviceRepository,
      pushGateway: gateway
    });

    const runNow = new Date("2026-04-07T00:00:00.000Z");

    await service.processSaleEventChange({
      previousEvent: null,
      currentEvent: createSaleEvent({
        status: "upcoming",
        endAt: "2026-04-10T00:00:00.000Z",
        normalizedHash: "step7-new-sale"
      }),
      now: runNow
    });

    await service.processSaleEventChange({
      previousEvent: createSaleEvent({
        status: "upcoming",
        normalizedHash: "step7-before-start"
      }),
      currentEvent: createSaleEvent({
        status: "active",
        normalizedHash: "step7-after-start"
      }),
      now: runNow
    });

    await service.processSaleEventChange({
      previousEvent: createSaleEvent({
        status: "active",
        endAt: "2026-04-10T00:00:00.000Z",
        normalizedHash: "step7-before-ending-soon"
      }),
      currentEvent: createSaleEvent({
        status: "active",
        endAt: "2026-04-07T08:00:00.000Z",
        normalizedHash: "step7-ending-soon"
      }),
      now: runNow
    });

    await service.processSaleEventChange({
      previousEvent: createSaleEvent({
        status: "active",
        discountPercent: 20,
        normalizedHash: "step7-before-discount"
      }),
      currentEvent: createSaleEvent({
        status: "active",
        discountPercent: 35,
        normalizedHash: "step7-after-discount",
        endAt: "2026-04-10T00:00:00.000Z"
      }),
      now: runNow
    });

    const notifications = await repositories.notificationRepository.listNotificationsByUser(
      testDataIds.users.defaultUserId,
      {
        limit: 50,
        offset: 0
      }
    );
    const sentStatuses = notifications.map((item) => item.status);
    const notificationTypes = notifications.map((item) => item.notificationType).sort();

    expect(notifications.length).toBe(4);
    expect(sentStatuses.every((status) => status === "sent")).toBe(true);
    expect(notificationTypes).toEqual([
      "discount_changed",
      "ending_soon",
      "new_sale",
      "sale_started"
    ]);
    expect(gateway.getSentMessages().length).toBe(4);
  });

  it("prevents duplicate sends using dedupe key lookup", async () => {
    const repositories = createInMemoryRepositories({
      notifications: [],
      subscriptions: [
        {
          id: "00000000-0000-0000-0000-000000008002",
          userId: testDataIds.users.defaultUserId,
          brandId: testDataIds.brands.oliveyoung,
          isEnabled: true,
          notifyOnNewSale: true,
          notifyOnSaleStart: true,
          notifyBeforeEndHours: 24,
          notifyOnDiscountChange: true,
          createdAt: "2026-04-01T00:00:00.000Z",
          updatedAt: "2026-04-01T00:00:00.000Z"
        }
      ],
      userDevices: [
        {
          id: "00000000-0000-0000-0000-000000009002",
          userId: testDataIds.users.defaultUserId,
          platform: "android",
          pushToken: "ExponentPushToken[pipeline-step7-dedupe]",
          appVersion: "0.2.0",
          lastSeenAt: "2026-04-07T00:00:00.000Z",
          isActive: true,
          createdAt: "2026-04-07T00:00:00.000Z",
          updatedAt: "2026-04-07T00:00:00.000Z"
        }
      ]
    });

    const gateway = new MockPushGateway();
    const service = new PushNotificationPipelineService({
      brandRepository: repositories.brandRepository,
      subscriptionRepository: repositories.subscriptionRepository,
      notificationRepository: repositories.notificationRepository,
      userDeviceRepository: repositories.userDeviceRepository,
      pushGateway: gateway
    });

    const first = await service.processSaleEventChange({
      previousEvent: null,
      currentEvent: createSaleEvent({
        status: "upcoming",
        normalizedHash: "step7-dedupe-event"
      }),
      now: new Date("2026-04-07T00:00:00.000Z")
    });

    const second = await service.processSaleEventChange({
      previousEvent: null,
      currentEvent: createSaleEvent({
        status: "upcoming",
        normalizedHash: "step7-dedupe-event"
      }),
      now: new Date("2026-04-07T00:05:00.000Z")
    });

    const notifications = await repositories.notificationRepository.listNotificationsByUser(
      testDataIds.users.defaultUserId,
      {
        limit: 20,
        offset: 0
      }
    );

    expect(first.createdCount).toBe(1);
    expect(first.dedupedCount).toBe(0);
    expect(second.createdCount).toBe(0);
    expect(second.dedupedCount).toBe(1);
    expect(notifications.length).toBe(1);
    expect(gateway.getSentMessages().length).toBe(1);
  });
});
