import type {
  Brand,
  DevicePlatform,
  ISODateTimeString,
  JsonValue,
  NotificationRecord,
  NotificationStatus,
  NotificationType,
  SaleEvent,
  SyncRun,
  UserBrandSubscription,
  UserDevice,
  UUID
} from "@salecalendar/shared-types";

export interface ListSaleEventsQuery {
  month: string;
  brandIds?: UUID[] | undefined;
}

export interface NotificationListQuery {
  status?: NotificationStatus | undefined;
  limit: number;
  offset: number;
}

export interface SubscriptionSettingsInput {
  isEnabled: boolean;
  notifyOnNewSale: boolean;
  notifyOnSaleStart: boolean;
  notifyBeforeEndHours: number;
  notifyOnDiscountChange: boolean;
}

export interface SubscriptionPatchInput {
  isEnabled?: boolean | undefined;
  notifyOnNewSale?: boolean | undefined;
  notifyOnSaleStart?: boolean | undefined;
  notifyBeforeEndHours?: number | undefined;
  notifyOnDiscountChange?: boolean | undefined;
}

export interface CreateSyncRunInput {
  brandId: UUID;
  sourceId?: UUID | undefined;
}

export interface DeviceRegistrationInput {
  platform: DevicePlatform;
  pushToken: string;
  appVersion?: string | undefined;
}

export interface NotificationCreateInput {
  userId: UUID;
  brandId: UUID;
  saleEventId: UUID | null;
  notificationType: NotificationType;
  title: string;
  body: string;
  payloadJson: JsonValue;
  status?: NotificationStatus | undefined;
  sentAt?: ISODateTimeString | null | undefined;
  createdAt?: ISODateTimeString | undefined;
}

export interface NotificationStatusUpdateInput {
  notificationId: UUID;
  status: NotificationStatus;
  sentAt?: ISODateTimeString | null | undefined;
}

export interface BrandRepository {
  listBrands(): Promise<Brand[]>;
  findBrandById(id: UUID): Promise<Brand | null>;
  findBrandBySlug(slug: string): Promise<Brand | null>;
}

export interface SaleEventRepository {
  listSaleEvents(query: ListSaleEventsQuery): Promise<SaleEvent[]>;
  findSaleEventById(id: UUID): Promise<SaleEvent | null>;
}

export interface SubscriptionRepository {
  findSubscription(userId: UUID, brandId: UUID): Promise<UserBrandSubscription | null>;
  listSubscriptionsByBrand(brandId: UUID): Promise<UserBrandSubscription[]>;
  upsertSubscription(
    userId: UUID,
    brandId: UUID,
    settings: SubscriptionSettingsInput
  ): Promise<UserBrandSubscription>;
  patchSubscription(
    userId: UUID,
    brandId: UUID,
    patch: SubscriptionPatchInput
  ): Promise<UserBrandSubscription | null>;
  listSubscriptionsByUser(userId: UUID): Promise<UserBrandSubscription[]>;
}

export interface NotificationRepository {
  listNotificationsByUser(userId: UUID, query: NotificationListQuery): Promise<NotificationRecord[]>;
  findNotificationByDedupeKey(userId: UUID, dedupeKey: string): Promise<NotificationRecord | null>;
  createNotification(input: NotificationCreateInput): Promise<NotificationRecord>;
  updateNotificationStatus(input: NotificationStatusUpdateInput): Promise<NotificationRecord | null>;
}

export interface SyncRunRepository {
  createManualSyncRun(input: CreateSyncRunInput): Promise<SyncRun>;
}

export interface UserDeviceRepository {
  upsertUserDevice(userId: UUID, input: DeviceRegistrationInput): Promise<UserDevice>;
  listUserDevicesByUser(userId: UUID): Promise<UserDevice[]>;
}
