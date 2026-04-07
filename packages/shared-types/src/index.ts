export type UUID = string;
export type ISODateTimeString = string;

export type BrandCategory = "fashion" | "beauty" | "lifestyle" | "mixed";
export type BrandSourceType = "official_api" | "partner_api" | "public_page" | "manual_feed";
export type SaleEventStatus = "upcoming" | "active" | "ended" | "unknown";
export type NotificationType = "new_sale" | "sale_started" | "ending_soon" | "discount_changed";
export type NotificationStatus = "queued" | "sent" | "failed" | "read";
export type SyncRunType = "scheduled" | "manual" | "retry";
export type SyncRunStatus = "running" | "success" | "partial" | "failed";
export type DevicePlatform = "ios" | "android" | "web" | "unknown";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface Brand {
  id: UUID;
  slug: string;
  name: string;
  category: BrandCategory;
  logoUrl: string | null;
  websiteUrl: string | null;
  isActive: boolean;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface BrandSource {
  id: UUID;
  brandId: UUID;
  sourceType: BrandSourceType;
  sourceName: string;
  baseUrl: string;
  scheduleCron: string | null;
  pollIntervalMinutes: number;
  isEnabled: boolean;
  configJson: JsonValue;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface SaleEvent {
  id: UUID;
  brandId: UUID;
  sourceId: UUID;
  externalId: string;
  title: string;
  summary: string | null;
  saleUrl: string | null;
  imageUrl: string | null;
  startAt: ISODateTimeString | null;
  endAt: ISODateTimeString | null;
  isAllDay: boolean;
  timezone: string;
  status: SaleEventStatus;
  discountPercent: number | null;
  discountLabel: string | null;
  originalPriceMin: number | null;
  salePriceMin: number | null;
  categoriesJson: JsonValue;
  tagsJson: JsonValue;
  normalizedHash: string;
  firstSeenAt: ISODateTimeString;
  lastSeenAt: ISODateTimeString;
  lastChangedAt: ISODateTimeString;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface SaleEventSnapshot {
  id: UUID;
  saleEventId: UUID;
  rawPayloadJson: JsonValue;
  normalizedPayloadJson: JsonValue;
  snapshotHash: string;
  detectedAt: ISODateTimeString;
}

export interface UserBrandSubscription {
  id: UUID;
  userId: UUID;
  brandId: UUID;
  isEnabled: boolean;
  notifyOnNewSale: boolean;
  notifyOnSaleStart: boolean;
  notifyBeforeEndHours: number;
  notifyOnDiscountChange: boolean;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface UserDevice {
  id: UUID;
  userId: UUID;
  platform: DevicePlatform;
  pushToken: string;
  appVersion: string | null;
  lastSeenAt: ISODateTimeString;
  isActive: boolean;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface NotificationRecord {
  id: UUID;
  userId: UUID;
  brandId: UUID;
  saleEventId: UUID | null;
  notificationType: NotificationType;
  title: string;
  body: string;
  payloadJson: JsonValue;
  sentAt: ISODateTimeString | null;
  readAt: ISODateTimeString | null;
  status: NotificationStatus;
  createdAt: ISODateTimeString;
}

export interface SyncRun {
  id: UUID;
  brandId: UUID;
  sourceId: UUID | null;
  runType: SyncRunType;
  startedAt: ISODateTimeString;
  finishedAt: ISODateTimeString | null;
  status: SyncRunStatus;
  fetchedCount: number;
  normalizedCount: number;
  changedCount: number;
  errorSummary: string | null;
  createdAt: ISODateTimeString;
}

export interface SyncError {
  id: UUID;
  syncRunId: UUID;
  brandId: UUID | null;
  sourceId: UUID | null;
  errorType: string;
  message: string;
  detailJson: JsonValue;
  createdAt: ISODateTimeString;
}

export interface SaleCalendarSchema {
  brands: Brand;
  brandSources: BrandSource;
  saleEvents: SaleEvent;
  saleEventSnapshots: SaleEventSnapshot;
  userBrandSubscriptions: UserBrandSubscription;
  userDevices: UserDevice;
  notifications: NotificationRecord;
  syncRuns: SyncRun;
  syncErrors: SyncError;
}