import type { RawSaleRecord } from "../sdk/types";

export const mockOliveYoungRawFixture: RawSaleRecord[] = [
  {
    externalId: "oliveyoung-2026-spring-week",
    title: "Spring Skin Week",
    summary: "Skincare and makeup up to 50% off.",
    saleUrl: "https://mock.oliveyoung.local/event/spring-week",
    imageUrl: "https://mock.oliveyoung.local/assets/spring-week.jpg",
    startAt: "2026-04-05T00:00:00+09:00",
    endAt: "2026-04-12T23:59:00+09:00",
    timezone: "Asia/Seoul",
    discountLabel: "Up to 50%",
    categories: ["beauty", "skincare"],
    tags: ["spring", "hot"],
    rawPayloadJson: {
      source: "mock-oliveyoung",
      campaignCode: "spring-week",
      discountText: "Up to 50%"
    },
    fetchedAt: "2026-04-07T01:00:00+09:00"
  },
  {
    externalId: "oliveyoung-2026-night-routine",
    title: "Night Routine Picks",
    summary: "Sleeping mask and cleanser promotion.",
    saleUrl: "https://mock.oliveyoung.local/event/night-routine",
    imageUrl: "https://mock.oliveyoung.local/assets/night-routine.jpg",
    startAt: "2026-04-22T00:00:00+09:00",
    endAt: "2026-04-28T23:59:00+09:00",
    timezone: "Asia/Seoul",
    discountLabel: "Up to 25%",
    categories: ["beauty"],
    tags: ["routine"],
    rawPayloadJson: {
      source: "mock-oliveyoung",
      campaignCode: "night-routine",
      discountText: "Up to 25%"
    },
    fetchedAt: "2026-04-07T01:00:00+09:00"
  }
];

export const mockOliveYoungRawFixtureV2: RawSaleRecord[] = [
  {
    externalId: "oliveyoung-2026-spring-week",
    title: "Spring Skin Week",
    summary: "Skincare and makeup up to 55% off.",
    saleUrl: "https://mock.oliveyoung.local/event/spring-week",
    imageUrl: "https://mock.oliveyoung.local/assets/spring-week.jpg",
    startAt: "2026-04-05T00:00:00+09:00",
    endAt: "2026-04-12T23:59:00+09:00",
    timezone: "Asia/Seoul",
    discountLabel: "Up to 55%",
    categories: ["beauty", "skincare"],
    tags: ["spring", "hot"],
    rawPayloadJson: {
      source: "mock-oliveyoung",
      campaignCode: "spring-week",
      discountText: "Up to 55%"
    },
    fetchedAt: "2026-04-08T01:00:00+09:00"
  }
];
