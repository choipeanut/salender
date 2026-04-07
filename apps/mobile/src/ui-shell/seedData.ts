import type { NotificationPreferenceState, SeedBrand, SeedInboxItem, SeedSaleEvent } from "./types";

export const seedBrands: SeedBrand[] = [
  { id: "00000000-0000-0000-0000-000000000101", slug: "oliveyoung", name: "Olive Young", category: "beauty" },
  { id: "00000000-0000-0000-0000-000000000102", slug: "musinsa", name: "MUSINSA", category: "fashion" },
  { id: "00000000-0000-0000-0000-000000000103", slug: "zara", name: "ZARA", category: "fashion" },
  { id: "00000000-0000-0000-0000-000000000104", slug: "uniqlo", name: "UNIQLO", category: "lifestyle" }
];

export const seedSaleEvents: SeedSaleEvent[] = [
  {
    id: "00000000-0000-0000-0000-000000000301",
    brandId: "00000000-0000-0000-0000-000000000101",
    title: "Spring Skin Week",
    summary: "Skincare and makeup up to 50% off.",
    startAt: "2026-04-05T00:00:00+09:00",
    endAt: "2026-04-12T23:59:00+09:00",
    status: "active",
    discountPercent: 50,
    discountLabel: "Up to 50%"
  },
  {
    id: "00000000-0000-0000-0000-000000000302",
    brandId: "00000000-0000-0000-0000-000000000102",
    title: "Denim Festival",
    summary: "Denim category promotion up to 35% off.",
    startAt: "2026-04-15T10:00:00+09:00",
    endAt: "2026-04-20T23:00:00+09:00",
    status: "upcoming",
    discountPercent: 35,
    discountLabel: "Up to 35%"
  },
  {
    id: "00000000-0000-0000-0000-000000000303",
    brandId: "00000000-0000-0000-0000-000000000103",
    title: "Mid Season Sale",
    summary: "Selected products up to 40% off.",
    startAt: "2026-04-03T00:00:00+09:00",
    endAt: "2026-04-08T23:59:00+09:00",
    status: "ended",
    discountPercent: 40,
    discountLabel: "Up to 40%"
  },
  {
    id: "00000000-0000-0000-0000-000000000304",
    brandId: "00000000-0000-0000-0000-000000000104",
    title: "Golden Week Specials",
    summary: "Innerwear and daily essentials promotion.",
    startAt: null,
    endAt: null,
    status: "unknown",
    discountPercent: null,
    discountLabel: "Schedule TBD"
  },
  {
    id: "00000000-0000-0000-0000-000000000305",
    brandId: "00000000-0000-0000-0000-000000000101",
    title: "Night Routine Picks",
    summary: "Sleeping mask and cleanser promotion.",
    startAt: "2026-04-22T00:00:00+09:00",
    endAt: "2026-04-28T23:59:00+09:00",
    status: "upcoming",
    discountPercent: 25,
    discountLabel: "Up to 25%"
  }
];

export const seedInbox: SeedInboxItem[] = [
  {
    id: "00000000-0000-0000-0000-000000000701",
    brandId: "00000000-0000-0000-0000-000000000101",
    saleEventId: "00000000-0000-0000-0000-000000000301",
    title: "New Sale: Spring Skin Week",
    body: "Olive Young has started a new campaign today.",
    createdAt: "2026-04-06T09:30:00+09:00",
    isRead: false
  },
  {
    id: "00000000-0000-0000-0000-000000000702",
    brandId: "00000000-0000-0000-0000-000000000102",
    saleEventId: "00000000-0000-0000-0000-000000000302",
    title: "Starts Soon: Denim Festival",
    body: "MUSINSA sale begins in less than 24 hours.",
    createdAt: "2026-04-14T11:00:00+09:00",
    isRead: true
  },
  {
    id: "00000000-0000-0000-0000-000000000703",
    brandId: "00000000-0000-0000-0000-000000000101",
    saleEventId: "00000000-0000-0000-0000-000000000305",
    title: "Discount Changed",
    body: "Night Routine Picks updated its discount to 25%.",
    createdAt: "2026-04-21T08:00:00+09:00",
    isRead: false
  }
];

export const defaultNotificationPreferences: NotificationPreferenceState = {
  notifyOnNewSale: true,
  notifyOnSaleStart: true,
  notifyOnEndingSoon: true
};
