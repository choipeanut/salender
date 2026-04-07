import { describe, expect, it } from "@jest/globals";

import { computeChangeSet } from "../src";
import type { DetectChangesParams } from "../src";

const params: DetectChangesParams = {
  now: new Date("2026-04-08T00:00:00.000Z"),
  existingEvents: [
    {
      id: "00000000-0000-0000-0000-000000000001",
      brandId: "00000000-0000-0000-0000-000000000101",
      sourceId: "00000000-0000-0000-0000-000000000201",
      externalId: "same-event",
      title: "same",
      summary: null,
      saleUrl: null,
      imageUrl: null,
      startAt: null,
      endAt: null,
      timezone: "Asia/Seoul",
      status: "unknown",
      discountPercent: null,
      discountLabel: null,
      categories: [],
      tags: [],
      normalizedHash: "hash-same",
      firstSeenAt: "2026-04-01T00:00:00.000Z",
      lastSeenAt: "2026-04-07T00:00:00.000Z",
      lastChangedAt: "2026-04-07T00:00:00.000Z",
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-07T00:00:00.000Z"
    },
    {
      id: "00000000-0000-0000-0000-000000000002",
      brandId: "00000000-0000-0000-0000-000000000101",
      sourceId: "00000000-0000-0000-0000-000000000201",
      externalId: "updated-event",
      title: "updated",
      summary: null,
      saleUrl: null,
      imageUrl: null,
      startAt: null,
      endAt: null,
      timezone: "Asia/Seoul",
      status: "unknown",
      discountPercent: null,
      discountLabel: null,
      categories: [],
      tags: [],
      normalizedHash: "hash-before",
      firstSeenAt: "2026-04-01T00:00:00.000Z",
      lastSeenAt: "2026-04-07T00:00:00.000Z",
      lastChangedAt: "2026-04-07T00:00:00.000Z",
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-07T00:00:00.000Z"
    },
    {
      id: "00000000-0000-0000-0000-000000000003",
      brandId: "00000000-0000-0000-0000-000000000101",
      sourceId: "00000000-0000-0000-0000-000000000201",
      externalId: "ended-event",
      title: "ended",
      summary: null,
      saleUrl: null,
      imageUrl: null,
      startAt: null,
      endAt: null,
      timezone: "Asia/Seoul",
      status: "active",
      discountPercent: null,
      discountLabel: null,
      categories: [],
      tags: [],
      normalizedHash: "hash-ended",
      firstSeenAt: "2026-04-01T00:00:00.000Z",
      lastSeenAt: "2026-04-07T00:00:00.000Z",
      lastChangedAt: "2026-04-07T00:00:00.000Z",
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-07T00:00:00.000Z"
    }
  ],
  normalizedRecords: [
    {
      externalId: "same-event",
      title: "same",
      summary: null,
      saleUrl: null,
      imageUrl: null,
      startAt: null,
      endAt: null,
      timezone: "Asia/Seoul",
      status: "unknown",
      discountPercent: null,
      discountLabel: null,
      categories: [],
      tags: [],
      rawPayloadJson: {},
      normalizedPayloadJson: { title: "same" },
      normalizedHash: "hash-same"
    },
    {
      externalId: "updated-event",
      title: "updated",
      summary: null,
      saleUrl: null,
      imageUrl: null,
      startAt: null,
      endAt: null,
      timezone: "Asia/Seoul",
      status: "unknown",
      discountPercent: null,
      discountLabel: null,
      categories: [],
      tags: [],
      rawPayloadJson: {},
      normalizedPayloadJson: { title: "updated" },
      normalizedHash: "hash-after"
    },
    {
      externalId: "new-event",
      title: "new",
      summary: null,
      saleUrl: null,
      imageUrl: null,
      startAt: null,
      endAt: null,
      timezone: "Asia/Seoul",
      status: "unknown",
      discountPercent: null,
      discountLabel: null,
      categories: [],
      tags: [],
      rawPayloadJson: {},
      normalizedPayloadJson: { title: "new" },
      normalizedHash: "hash-new"
    }
  ]
};

describe("STEP5 diff engine", () => {
  it("classifies created/updated/ended/unchanged records", () => {
    const changeSet = computeChangeSet(params);

    expect(changeSet.created.map((item) => item.externalId)).toEqual(["new-event"]);
    expect(changeSet.updated.map((item) => item.externalId)).toEqual(["updated-event"]);
    expect(changeSet.ended.map((item) => item.externalId)).toEqual(["ended-event"]);
    expect(changeSet.unchanged.map((item) => item.externalId)).toEqual(["same-event"]);
  });
});
