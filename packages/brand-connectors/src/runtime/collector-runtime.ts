import type { JsonValue } from "@salecalendar/shared-types";

import { hashObject } from "../sdk/hash";
import type { BrandConnector, CollectorSyncResult } from "../sdk/types";
import type { CollectorStore } from "./collector-store";

export interface RunCollectorSyncInput {
  connector: BrandConnector;
  store: CollectorStore;
  config: {
    brandId: string;
    sourceId: string;
    runType: "scheduled" | "manual" | "retry";
    now: Date;
    metadata?: Record<string, unknown> | undefined;
  };
}

const toJsonValue = (value: unknown): JsonValue => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => toJsonValue(item));
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const converted: Record<string, JsonValue> = {};
    for (const key of Object.keys(record)) {
      converted[key] = toJsonValue(record[key]);
    }
    return converted;
  }
  return String(value);
};

const serializeError = (error: unknown): { message: string; detail: JsonValue } => {
  if (error instanceof Error) {
    return {
      message: error.message,
      detail: toJsonValue({
        name: error.name,
        message: error.message,
        stack: error.stack ?? null
      })
    };
  }
  return {
    message: "Unknown collector error",
    detail: toJsonValue({
      value: error
    })
  };
};

export const runCollectorSync = async (input: RunCollectorSyncInput): Promise<CollectorSyncResult> => {
  const syncRun = await input.store.beginSyncRun({
    brandId: input.config.brandId,
    sourceId: input.config.sourceId,
    runType: input.config.runType,
    startedAt: input.config.now
  });

  try {
    const canRun = await input.connector.canRun(input.config);
    if (!canRun) {
      await input.store.recordSyncError({
        syncRunId: syncRun.id,
        brandId: input.config.brandId,
        sourceId: input.config.sourceId,
        errorType: "connector_unavailable",
        message: "Connector cannot run with current configuration.",
        detailJson: {
          connector: input.connector.brandSlug
        }
      });
      await input.store.finalizeSyncRun({
        syncRunId: syncRun.id,
        status: "failed",
        fetchedCount: 0,
        normalizedCount: 0,
        changedCount: 0,
        errorSummary: "Connector cannot run."
      });
      return {
        syncRunId: syncRun.id,
        status: "failed",
        fetchedCount: 0,
        normalizedCount: 0,
        changedCount: 0
      };
    }

    const rawRecords = await input.connector.fetchRaw(input.config);
    const normalizedRecords = await input.connector.normalize(rawRecords, input.config);
    const existingEvents = await input.store.listSaleEvents(input.config.brandId, input.config.sourceId);
    const changeSet = await input.connector.detectChanges({
      existingEvents,
      normalizedRecords,
      now: input.config.now
    });

    const rawByExternalId = new Map(rawRecords.map((record) => [record.externalId, record]));
    for (const normalized of normalizedRecords) {
      const savedEvent = await input.store.upsertSaleEvent({
        brandId: input.config.brandId,
        sourceId: input.config.sourceId,
        record: normalized,
        now: input.config.now
      });
      const raw = rawByExternalId.get(normalized.externalId);
      await input.store.saveSaleEventSnapshot({
        saleEventId: savedEvent.id,
        rawPayloadJson: raw?.rawPayloadJson ?? { source: "unknown", externalId: normalized.externalId },
        normalizedPayloadJson: normalized.normalizedPayloadJson,
        snapshotHash: hashObject({
          externalId: normalized.externalId,
          rawPayloadJson: raw?.rawPayloadJson ?? null,
          normalizedPayloadJson: normalized.normalizedPayloadJson
        }),
        detectedAt: input.config.now
      });
    }

    for (const ended of changeSet.ended) {
      await input.store.markSaleEventEnded(ended, input.config.now);
    }

    const changedCount =
      changeSet.created.length + changeSet.updated.length + changeSet.ended.length;
    await input.store.finalizeSyncRun({
      syncRunId: syncRun.id,
      status: "success",
      fetchedCount: rawRecords.length,
      normalizedCount: normalizedRecords.length,
      changedCount
    });

    return {
      syncRunId: syncRun.id,
      status: "success",
      fetchedCount: rawRecords.length,
      normalizedCount: normalizedRecords.length,
      changedCount
    };
  } catch (error) {
    const serialized = serializeError(error);
    await input.store.recordSyncError({
      syncRunId: syncRun.id,
      brandId: input.config.brandId,
      sourceId: input.config.sourceId,
      errorType: "collector_runtime_error",
      message: serialized.message,
      detailJson: serialized.detail
    });
    await input.store.finalizeSyncRun({
      syncRunId: syncRun.id,
      status: "failed",
      fetchedCount: 0,
      normalizedCount: 0,
      changedCount: 0,
      errorSummary: serialized.message
    });
    return {
      syncRunId: syncRun.id,
      status: "failed",
      fetchedCount: 0,
      normalizedCount: 0,
      changedCount: 0
    };
  }
};
