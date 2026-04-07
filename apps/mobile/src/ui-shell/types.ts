export type UserMode = "guest" | "member";

export type AppScreen =
  | "splash"
  | "auth"
  | "brandPicker"
  | "calendar"
  | "saleDetail"
  | "inbox"
  | "notificationPreferences";

export type EventStatus = "upcoming" | "active" | "ended" | "unknown";

export type SortMode = "highDiscount" | "endingSoon";

export interface SeedBrand {
  id: string;
  slug: string;
  name: string;
  category: "fashion" | "beauty" | "lifestyle" | "mixed";
}

export interface SeedSaleEvent {
  id: string;
  brandId: string;
  title: string;
  summary: string;
  startAt: string | null;
  endAt: string | null;
  status: EventStatus;
  discountPercent: number | null;
  discountLabel: string | null;
}

export interface SeedInboxItem {
  id: string;
  brandId: string;
  saleEventId: string;
  title: string;
  body: string;
  createdAt: string;
  isRead: boolean;
}

export interface NotificationPreferenceState {
  notifyOnNewSale: boolean;
  notifyOnSaleStart: boolean;
  notifyOnEndingSoon: boolean;
}
