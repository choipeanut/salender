import type { JsonValue } from "@salecalendar/shared-types";

import type { BrandConnector, ConnectorConfig, NormalizedSaleRecord } from "../sdk/types";
import type { CollectorStore } from "./collector-store";

export interface DryRunCollectorInput {
  connector: BrandConnector;
  store: CollectorStore;
  config: ConnectorConfig;
  sampleSize?: number;
}

export interface DryRunSampleRecord {
  externalId: string;
  title: string;
  status: NormalizedSaleRecord["status"];
  discountPercent: number | null;
  startAt: string | null;
  endAt: string | null;
  saleUrl: string | null;
}

export interface CollectorDryRunResult {
  status: "success" | "failed";
  canRun: boolean;
  fetchedCount: number;
  normalizedCount: number;
  changeSummary: {
    created: number;
    updated: number;
    unchanged: number;
    ended: number;
  };
  sampleRecords: DryRunSampleRecord[];
  error: {
    message: string;
    detail: JsonValue;
  } | null;
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
  if (typeof value === "object" && value !== null) {
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
    message: "Unknown dry-run error",
    detail: toJsonValue({
      value: error
    })
  };
};

const toDryRunSample = (record: NormalizedSaleRecord): DryRunSampleRecord => ({
  externalId: record.externalId,
  title: record.title,
  status: record.status,
  discountPercent: record.discountPercent,
  startAt: record.startAt,
  endAt: record.endAt,
  saleUrl: record.saleUrl
});

export const runCollectorDryRun = async (
  input: DryRunCollectorInput
): Promise<CollectorDryRunResult> => {
  const sampleSize = input.sampleSize ?? 5;

  try {
    const canRun = await input.connector.canRun(input.config);
    if (!canRun) {
      return {
        status: "failed",
        canRun: false,
        fetchedCount: 0,
        normalizedCount: 0,
        changeSummary: {
          created: 0,
          updated: 0,
          unchanged: 0,
          ended: 0
        },
        sampleRecords: [],
        error: {
          message: "Connector cannot run with current configuration.",
          detail: {
            connector: input.connector.brandSlug
          }
        }
      };
    }

    const rawRecords = await input.connector.fetchRaw(input.config);
    const normalizedRecords = await input.connector.normalize(rawRecords, input.config);
    const existingEvents = await input.store.listSaleEvents(
      input.config.brandId,
      input.config.sourceId
    );
    const changeSet = await input.connector.detectChanges({
      existingEvents,
      normalizedRecords,
      now: input.config.now
    });

    return {
      status: "success",
      canRun: true,
      fetchedCount: rawRecords.length,
      normalizedCount: normalizedRecords.length,
      changeSummary: {
        created: changeSet.created.length,
        updated: changeSet.updated.length,
        unchanged: changeSet.unchanged.length,
        ended: changeSet.ended.length
      },
      sampleRecords: normalizedRecords.slice(0, sampleSize).map(toDryRunSample),
      error: null
    };
  } catch (error) {
    const serialized = serializeError(error);
    return {
      status: "failed",
      canRun: true,
      fetchedCount: 0,
      normalizedCount: 0,
      changeSummary: {
        created: 0,
        updated: 0,
        unchanged: 0,
        ended: 0
      },
      sampleRecords: [],
      error: serialized
    };
  }
};
