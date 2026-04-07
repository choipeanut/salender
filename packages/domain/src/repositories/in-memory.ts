import type {
  Brand,
  NotificationRecord,
  SaleEvent,
  SyncRun,
  UserBrandSubscription,
  UserDevice,
  UUID
} from "@salecalendar/shared-types";

import type { SaleCalendarApiServiceDependencies } from "../services/sale-calendar-api-service";
import type {
  BrandRepository,
  CreateSyncRunInput,
  DeviceRegistrationInput,
  ListSaleEventsQuery,
  NotificationCreateInput,
  NotificationListQuery,
  NotificationStatusUpdateInput,
  NotificationRepository,
  SaleEventRepository,
  SubscriptionPatchInput,
  SubscriptionRepository,
  SubscriptionSettingsInput,
  SyncRunRepository,
  UserDeviceRepository
} from "./interfaces";

export interface InMemorySeedData {
  brands: Brand[];
  saleEvents: SaleEvent[];
  subscriptions: UserBrandSubscription[];
  notifications: NotificationRecord[];
  userDevices: UserDevice[];
}

const makeUuidFromNumber = (seed: number): UUID => {
  const right = String(seed).padStart(12, "0");
  return `00000000-0000-0000-0000-${right}`;
};

const defaultIsoDate = "2026-04-07T00:00:00.000Z";

const parseUuidSequence = (value: UUID): number => {
  const right = value.split("-").pop();
  const parsed = Number(right);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return parsed;
};

const parseNotificationDedupeKey = (payload: NotificationRecord["payloadJson"]): string | null => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const record = payload as Record<string, unknown>;
  const key = record.dedupeKey;
  if (typeof key !== "string" || key.trim() === "") {
    return null;
  }
  return key;
};

const defaultSeedData: InMemorySeedData = {
  brands: [
    {
      id: makeUuidFromNumber(101),
      slug: "oliveyoung",
      name: "올리브영",
      category: "beauty",
      logoUrl: null,
      websiteUrl: "https://www.oliveyoung.co.kr",
      isActive: true,
      createdAt: defaultIsoDate,
      updatedAt: defaultIsoDate
    },
    {
      id: makeUuidFromNumber(102),
      slug: "musinsa",
      name: "무신사",
      category: "fashion",
      logoUrl: null,
      websiteUrl: "https://www.musinsa.com",
      isActive: true,
      createdAt: defaultIsoDate,
      updatedAt: defaultIsoDate
    },
    {
      id: makeUuidFromNumber(103),
      slug: "zara",
      name: "ZARA",
      category: "fashion",
      logoUrl: null,
      websiteUrl: "https://www.zara.com/kr",
      isActive: true,
      createdAt: defaultIsoDate,
      updatedAt: defaultIsoDate
    },
    {
      id: makeUuidFromNumber(104),
      slug: "uniqlo",
      name: "UNIQLO",
      category: "lifestyle",
      logoUrl: null,
      websiteUrl: "https://www.uniqlo.com/kr",
      isActive: true,
      createdAt: defaultIsoDate,
      updatedAt: defaultIsoDate
    }
  ],
  saleEvents: [
    {
      id: makeUuidFromNumber(301),
      brandId: makeUuidFromNumber(101),
      sourceId: makeUuidFromNumber(201),
      externalId: "oliveyoung-2026-spring-week",
      title: "올리브영 봄 세일",
      summary: "최대 50%",
      saleUrl: "https://www.oliveyoung.co.kr/event/spring-sale",
      imageUrl: null,
      startAt: "2026-04-05T00:00:00+09:00",
      endAt: "2026-04-12T23:59:00+09:00",
      isAllDay: false,
      timezone: "Asia/Seoul",
      status: "active",
      discountPercent: 50,
      discountLabel: "최대 50% 할인",
      originalPriceMin: 120000,
      salePriceMin: 60000,
      categoriesJson: ["beauty"],
      tagsJson: ["spring"],
      normalizedHash: "hash-301",
      firstSeenAt: defaultIsoDate,
      lastSeenAt: defaultIsoDate,
      lastChangedAt: defaultIsoDate,
      createdAt: defaultIsoDate,
      updatedAt: defaultIsoDate
    },
    {
      id: makeUuidFromNumber(302),
      brandId: makeUuidFromNumber(102),
      sourceId: makeUuidFromNumber(202),
      externalId: "musinsa-2026-denim-fest",
      title: "무신사 데님 페스티벌",
      summary: "최대 35%",
      saleUrl: "https://www.musinsa.com/event/denim-festival",
      imageUrl: null,
      startAt: "2026-04-15T10:00:00+09:00",
      endAt: "2026-04-20T23:00:00+09:00",
      isAllDay: false,
      timezone: "Asia/Seoul",
      status: "upcoming",
      discountPercent: 35,
      discountLabel: "최대 35% 할인",
      originalPriceMin: 189000,
      salePriceMin: 122850,
      categoriesJson: ["fashion"],
      tagsJson: ["festival"],
      normalizedHash: "hash-302",
      firstSeenAt: defaultIsoDate,
      lastSeenAt: defaultIsoDate,
      lastChangedAt: defaultIsoDate,
      createdAt: defaultIsoDate,
      updatedAt: defaultIsoDate
    },
    {
      id: makeUuidFromNumber(304),
      brandId: makeUuidFromNumber(104),
      sourceId: makeUuidFromNumber(204),
      externalId: "uniqlo-2026-golden-week",
      title: "UNIQLO 골든 위크 특가",
      summary: "기간 미정",
      saleUrl: "https://www.uniqlo.com/kr/ko/special-feature/golden-week",
      imageUrl: null,
      startAt: null,
      endAt: null,
      isAllDay: false,
      timezone: "Asia/Seoul",
      status: "unknown",
      discountPercent: null,
      discountLabel: "기간 미정 특가",
      originalPriceMin: null,
      salePriceMin: null,
      categoriesJson: ["lifestyle"],
      tagsJson: ["unknown-period"],
      normalizedHash: "hash-304",
      firstSeenAt: defaultIsoDate,
      lastSeenAt: defaultIsoDate,
      lastChangedAt: defaultIsoDate,
      createdAt: defaultIsoDate,
      updatedAt: defaultIsoDate
    }
  ],
  subscriptions: [],
  notifications: [
    {
      id: makeUuidFromNumber(701),
      userId: makeUuidFromNumber(1),
      brandId: makeUuidFromNumber(101),
      saleEventId: makeUuidFromNumber(301),
      notificationType: "new_sale",
      title: "새 세일 알림",
      body: "올리브영 봄 세일이 시작되었습니다.",
      payloadJson: { deepLink: "/sale-events/301" },
      sentAt: defaultIsoDate,
      readAt: null,
      status: "sent",
      createdAt: "2026-04-07T01:00:00.000Z"
    },
    {
      id: makeUuidFromNumber(702),
      userId: makeUuidFromNumber(1),
      brandId: makeUuidFromNumber(102),
      saleEventId: makeUuidFromNumber(302),
      notificationType: "ending_soon",
      title: "종료 임박",
      body: "무신사 데님 페스티벌이 곧 종료됩니다.",
      payloadJson: { deepLink: "/sale-events/302" },
      sentAt: defaultIsoDate,
      readAt: null,
      status: "queued",
      createdAt: "2026-04-07T02:00:00.000Z"
    }
  ],
  userDevices: []
};

const cloneSeedData = (seed: InMemorySeedData): InMemorySeedData => ({
  brands: seed.brands.map((item) => ({ ...item })),
  saleEvents: seed.saleEvents.map((item) => ({ ...item })),
  subscriptions: seed.subscriptions.map((item) => ({ ...item })),
  notifications: seed.notifications.map((item) => ({ ...item })),
  userDevices: seed.userDevices.map((item) => ({ ...item }))
});

const parseMonthRange = (month: string): { start: Date; end: Date } => {
  const [yearString, monthString] = month.split("-");
  const year = Number(yearString);
  const monthIndex = Number(monthString) - 1;
  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));
  return { start, end };
};

const isEventInMonthRange = (event: SaleEvent, month: string): boolean => {
  const { start, end } = parseMonthRange(month);
  const eventStart = event.startAt ? new Date(event.startAt) : null;
  const eventEnd = event.endAt ? new Date(event.endAt) : null;

  if (!eventStart && !eventEnd) {
    return false;
  }
  if (eventStart && eventEnd) {
    return eventStart <= end && eventEnd >= start;
  }
  if (eventStart) {
    return eventStart >= start && eventStart <= end;
  }
  if (eventEnd) {
    return eventEnd >= start && eventEnd <= end;
  }
  return false;
};

class InMemoryRepository
  implements
    BrandRepository,
    SaleEventRepository,
    SubscriptionRepository,
    NotificationRepository,
    SyncRunRepository,
    UserDeviceRepository
{
  private readonly brands: Brand[];
  private readonly saleEvents: SaleEvent[];
  private readonly subscriptions: UserBrandSubscription[];
  private readonly notifications: NotificationRecord[];
  private readonly userDevices: UserDevice[];
  private syncRunSequence: number;
  private notificationSequence: number;

  constructor(seed: InMemorySeedData) {
    this.brands = seed.brands;
    this.saleEvents = seed.saleEvents;
    this.subscriptions = seed.subscriptions;
    this.notifications = seed.notifications;
    this.userDevices = seed.userDevices;
    this.syncRunSequence = 800;
    const existingNotificationMax = this.notifications.reduce(
      (max, notification) => Math.max(max, parseUuidSequence(notification.id)),
      700
    );
    this.notificationSequence = Math.max(existingNotificationMax, 700);
  }

  async listBrands(): Promise<Brand[]> {
    return this.brands.map((brand) => ({ ...brand }));
  }

  async findBrandById(id: UUID): Promise<Brand | null> {
    const brand = this.brands.find((item) => item.id === id);
    return brand ? { ...brand } : null;
  }

  async findBrandBySlug(slug: string): Promise<Brand | null> {
    const brand = this.brands.find((item) => item.slug === slug);
    return brand ? { ...brand } : null;
  }

  async listSaleEvents(query: ListSaleEventsQuery): Promise<SaleEvent[]> {
    const result = this.saleEvents
      .filter((event) => isEventInMonthRange(event, query.month))
      .filter((event) => (query.brandIds ? query.brandIds.includes(event.brandId) : true))
      .sort((left, right) => {
        const leftStart = left.startAt ?? "";
        const rightStart = right.startAt ?? "";
        return leftStart.localeCompare(rightStart);
      });

    return result.map((event) => ({ ...event }));
  }

  async findSaleEventById(id: UUID): Promise<SaleEvent | null> {
    const event = this.saleEvents.find((item) => item.id === id);
    return event ? { ...event } : null;
  }

  async findSubscription(userId: UUID, brandId: UUID): Promise<UserBrandSubscription | null> {
    const subscription = this.subscriptions.find(
      (item) => item.userId === userId && item.brandId === brandId
    );
    return subscription ? { ...subscription } : null;
  }

  async listSubscriptionsByBrand(brandId: UUID): Promise<UserBrandSubscription[]> {
    return this.subscriptions
      .filter((item) => item.brandId === brandId)
      .map((item) => ({ ...item }))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  async upsertSubscription(
    userId: UUID,
    brandId: UUID,
    settings: SubscriptionSettingsInput
  ): Promise<UserBrandSubscription> {
    const now = new Date().toISOString();
    const existingIndex = this.subscriptions.findIndex(
      (item) => item.userId === userId && item.brandId === brandId
    );

    if (existingIndex >= 0) {
      const existing = this.subscriptions[existingIndex];
      if (!existing) {
        return Promise.reject(new Error("Subscription index out of bounds."));
      }
      const updated: UserBrandSubscription = {
        ...existing,
        ...settings,
        updatedAt: now
      };
      this.subscriptions[existingIndex] = updated;
      return { ...updated };
    }

    const created: UserBrandSubscription = {
      id: makeUuidFromNumber(this.subscriptions.length + 500),
      userId,
      brandId,
      ...settings,
      createdAt: now,
      updatedAt: now
    };
    this.subscriptions.push(created);
    return { ...created };
  }

  async patchSubscription(
    userId: UUID,
    brandId: UUID,
    patch: SubscriptionPatchInput
  ): Promise<UserBrandSubscription | null> {
    const existingIndex = this.subscriptions.findIndex(
      (item) => item.userId === userId && item.brandId === brandId
    );
    if (existingIndex < 0) {
      return null;
    }
    const existing = this.subscriptions[existingIndex];
    if (!existing) {
      return null;
    }

    const updated: UserBrandSubscription = {
      ...existing,
      isEnabled: patch.isEnabled ?? existing.isEnabled,
      notifyOnNewSale: patch.notifyOnNewSale ?? existing.notifyOnNewSale,
      notifyOnSaleStart: patch.notifyOnSaleStart ?? existing.notifyOnSaleStart,
      notifyBeforeEndHours: patch.notifyBeforeEndHours ?? existing.notifyBeforeEndHours,
      notifyOnDiscountChange: patch.notifyOnDiscountChange ?? existing.notifyOnDiscountChange,
      updatedAt: new Date().toISOString()
    };
    this.subscriptions[existingIndex] = updated;
    return { ...updated };
  }

  async listSubscriptionsByUser(userId: UUID): Promise<UserBrandSubscription[]> {
    return this.subscriptions
      .filter((item) => item.userId === userId)
      .map((item) => ({ ...item }))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  async listNotificationsByUser(
    userId: UUID,
    query: NotificationListQuery
  ): Promise<NotificationRecord[]> {
    return this.notifications
      .filter((item) => item.userId === userId)
      .filter((item) => (query.status ? item.status === query.status : true))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(query.offset, query.offset + query.limit)
      .map((item) => ({ ...item }));
  }

  async findNotificationByDedupeKey(
    userId: UUID,
    dedupeKey: string
  ): Promise<NotificationRecord | null> {
    const found = this.notifications.find((item) => {
      if (item.userId !== userId) {
        return false;
      }
      return parseNotificationDedupeKey(item.payloadJson) === dedupeKey;
    });
    return found ? { ...found } : null;
  }

  async createNotification(input: NotificationCreateInput): Promise<NotificationRecord> {
    this.notificationSequence += 1;
    const createdAt = input.createdAt ?? new Date().toISOString();
    const created: NotificationRecord = {
      id: makeUuidFromNumber(this.notificationSequence),
      userId: input.userId,
      brandId: input.brandId,
      saleEventId: input.saleEventId,
      notificationType: input.notificationType,
      title: input.title,
      body: input.body,
      payloadJson: input.payloadJson,
      sentAt: input.sentAt ?? null,
      readAt: null,
      status: input.status ?? "queued",
      createdAt
    };
    this.notifications.push(created);
    return { ...created };
  }

  async updateNotificationStatus(
    input: NotificationStatusUpdateInput
  ): Promise<NotificationRecord | null> {
    const index = this.notifications.findIndex((item) => item.id === input.notificationId);
    if (index < 0) {
      return null;
    }
    const existing = this.notifications[index];
    if (!existing) {
      return null;
    }

    const updated: NotificationRecord = {
      ...existing,
      status: input.status,
      sentAt: input.sentAt !== undefined ? input.sentAt : existing.sentAt
    };
    this.notifications[index] = updated;
    return { ...updated };
  }

  async createManualSyncRun(input: CreateSyncRunInput): Promise<SyncRun> {
    this.syncRunSequence += 1;
    const now = new Date().toISOString();
    return {
      id: makeUuidFromNumber(this.syncRunSequence),
      brandId: input.brandId,
      sourceId: input.sourceId ?? null,
      runType: "manual",
      startedAt: now,
      finishedAt: null,
      status: "running",
      fetchedCount: 0,
      normalizedCount: 0,
      changedCount: 0,
      errorSummary: null,
      createdAt: now
    };
  }

  async upsertUserDevice(userId: UUID, input: DeviceRegistrationInput): Promise<UserDevice> {
    const now = new Date().toISOString();
    const existingIndex = this.userDevices.findIndex(
      (item) => item.userId === userId && item.pushToken === input.pushToken
    );

    if (existingIndex >= 0) {
      const existing = this.userDevices[existingIndex];
      if (!existing) {
        return Promise.reject(new Error("User device index out of bounds."));
      }
      const updated: UserDevice = {
        ...existing,
        platform: input.platform,
        appVersion: input.appVersion ?? existing.appVersion,
        isActive: true,
        lastSeenAt: now,
        updatedAt: now
      };
      this.userDevices[existingIndex] = updated;
      return { ...updated };
    }

    const created: UserDevice = {
      id: makeUuidFromNumber(this.userDevices.length + 900),
      userId,
      platform: input.platform,
      pushToken: input.pushToken,
      appVersion: input.appVersion ?? null,
      lastSeenAt: now,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };
    this.userDevices.push(created);
    return { ...created };
  }

  async listUserDevicesByUser(userId: UUID): Promise<UserDevice[]> {
    return this.userDevices
      .filter((item) => item.userId === userId)
      .map((item) => ({ ...item }))
      .sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt));
  }
}

export const createInMemoryRepositories = (
  seed?: Partial<InMemorySeedData>
): SaleCalendarApiServiceDependencies & { userDeviceRepository: UserDeviceRepository } => {
  const repository = new InMemoryRepository(
    cloneSeedData({
      brands: seed?.brands ?? defaultSeedData.brands,
      saleEvents: seed?.saleEvents ?? defaultSeedData.saleEvents,
      subscriptions: seed?.subscriptions ?? defaultSeedData.subscriptions,
      notifications: seed?.notifications ?? defaultSeedData.notifications,
      userDevices: seed?.userDevices ?? defaultSeedData.userDevices
    })
  );

  return {
    brandRepository: repository,
    saleEventRepository: repository,
    subscriptionRepository: repository,
    notificationRepository: repository,
    syncRunRepository: repository,
    userDeviceRepository: repository
  };
};

export const testDataIds = {
  users: {
    defaultUserId: makeUuidFromNumber(1),
    adminUserId: makeUuidFromNumber(2)
  },
  brands: {
    oliveyoung: makeUuidFromNumber(101),
    musinsa: makeUuidFromNumber(102),
    zara: makeUuidFromNumber(103),
    uniqlo: makeUuidFromNumber(104)
  },
  saleEvents: {
    oliveyoungSpring: makeUuidFromNumber(301),
    musinsaDenim: makeUuidFromNumber(302),
    uniqloGoldenWeek: makeUuidFromNumber(304)
  }
} as const;
