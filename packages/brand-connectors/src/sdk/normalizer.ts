import type { SaleEventStatus } from "@salecalendar/shared-types";

import { hashObject } from "./hash";
import type { ConnectorConfig, NormalizedSaleRecord, RawSaleRecord } from "./types";

const parseDiscountPercent = (raw: RawSaleRecord): number | null => {
  if (raw.discountPercent !== null && raw.discountPercent !== undefined) {
    return raw.discountPercent;
  }
  if (!raw.discountLabel) {
    return null;
  }
  const matched = raw.discountLabel.match(/(\d{1,2}(?:\.\d{1,2})?)\s*%/);
  if (!matched?.[1]) {
    return null;
  }
  return Number(matched[1]);
};

const resolveStatus = (raw: RawSaleRecord, now: Date): SaleEventStatus => {
  if (raw.statusHint) {
    return raw.statusHint;
  }
  const start = raw.startAt ? new Date(raw.startAt) : null;
  const end = raw.endAt ? new Date(raw.endAt) : null;

  if (!start && !end) {
    return "unknown";
  }
  if (start && start > now) {
    return "upcoming";
  }
  if (end && end < now) {
    return "ended";
  }
  if (start && (!end || end >= now) && start <= now) {
    return "active";
  }
  return "unknown";
};

export const normalizeRawRecord = (
  raw: RawSaleRecord,
  config: ConnectorConfig
): NormalizedSaleRecord => {
  const normalizedPayloadJson = {
    externalId: raw.externalId,
    title: raw.title.trim(),
    summary: raw.summary?.trim() ?? null,
    saleUrl: raw.saleUrl ?? null,
    imageUrl: raw.imageUrl ?? null,
    startAt: raw.startAt ?? null,
    endAt: raw.endAt ?? null,
    timezone: raw.timezone ?? "Asia/Seoul",
    status: resolveStatus(raw, config.now),
    discountPercent: parseDiscountPercent(raw),
    discountLabel: raw.discountLabel ?? null,
    categories: raw.categories ?? [],
    tags: raw.tags ?? []
  };

  return {
    ...normalizedPayloadJson,
    rawPayloadJson: raw.rawPayloadJson,
    normalizedPayloadJson,
    normalizedHash: hashObject(normalizedPayloadJson)
  };
};

export const normalizeRawRecords = (
  records: RawSaleRecord[],
  config: ConnectorConfig
): NormalizedSaleRecord[] => records.map((record) => normalizeRawRecord(record, config));
