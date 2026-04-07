import type { RawSaleRecord } from "../sdk/types";

export const mockMusinsaRawFixture: RawSaleRecord[] = [
  {
    externalId: "musinsa-2026-denim-festival",
    title: "Denim Festival",
    summary: "Denim category promotion up to 35% off.",
    saleUrl: "https://mock.musinsa.local/event/denim-festival",
    imageUrl: "https://mock.musinsa.local/assets/denim-festival.jpg",
    startAt: "2026-04-15T10:00:00+09:00",
    endAt: "2026-04-20T23:00:00+09:00",
    timezone: "Asia/Seoul",
    discountLabel: "Up to 35%",
    categories: ["fashion", "denim"],
    tags: ["festival", "new"],
    rawPayloadJson: {
      source: "mock-musinsa",
      eventKey: "denim-festival",
      bannerMessage: "Up to 35%"
    },
    fetchedAt: "2026-04-07T01:05:00+09:00"
  },
  {
    externalId: "musinsa-2026-sneaker-week",
    title: "Sneaker Week",
    summary: "Selected sneakers and streetwear curation.",
    saleUrl: "https://mock.musinsa.local/event/sneaker-week",
    imageUrl: "https://mock.musinsa.local/assets/sneaker-week.jpg",
    startAt: null,
    endAt: null,
    timezone: "Asia/Seoul",
    discountLabel: "Schedule TBD",
    statusHint: "unknown",
    categories: ["fashion", "shoes"],
    tags: ["sneaker", "tbd"],
    rawPayloadJson: {
      source: "mock-musinsa",
      eventKey: "sneaker-week",
      bannerMessage: "Schedule TBD"
    },
    fetchedAt: "2026-04-07T01:05:00+09:00"
  }
];
