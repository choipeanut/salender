import type {
  ISODateTimeString,
  JsonValue,
  SyncRunStatus,
  SyncRunType,
  UUID
} from "@salecalendar/shared-types";

import type { NormalizedSaleRecord, StoredSaleEventRecord } from "../sdk/types";

export interface SyncRunRecord {
  id: UUID;
  brandId: UUID;
  sourceId: UUID;
  runType: SyncRunType;
  startedAt: ISODateTimeString;
  finishedAt: ISODateTimeString | null;
  status: SyncRunStatus;
  fetchedCount: number;
  normalizedCount: number;
  changedCount: number;
  errorSummary: string | null;
}

export interface SyncErrorRecord {
  id: UUID;
  syncRunId: UUID;
  brandId: UUID;
  sourceId: UUID;
  errorType: string;
  message: string;
  detailJson: JsonValue;
  createdAt: ISODateTimeString;
}

export interface SaleEventSnapshotRecord {
  id: UUID;
  saleEventId: UUID;
  rawPayloadJson: JsonValue;
  normalizedPayloadJson: JsonValue;
  snapshotHash: string;
  detectedAt: ISODateTimeString;
}

export interface UpsertSaleEventInput {
  brandId: UUID;
  sourceId: UUID;
  record: NormalizedSaleRecord;
  now: Date;
}

export interface SyncRunFinalizeInput {
  syncRunId: UUID;
  status: SyncRunStatus;
  fetchedCount: number;
  normalizedCount: number;
  changedCount: number;
  errorSummary?: string | undefined;
}

export interface SyncErrorInput {
  syncRunId: UUID;
  brandId: UUID;
  sourceId: UUID;
  errorType: string;
  message: string;
  detailJson: JsonValue;
}

export interface CollectorStore {
  beginSyncRun(input: { brandId: UUID; sourceId: UUID; runType: SyncRunType; startedAt: Date }): Promise<SyncRunRecord>;
  listSaleEvents(brandId: UUID, sourceId: UUID): Promise<StoredSaleEventRecord[]>;
  upsertSaleEvent(input: UpsertSaleEventInput): Promise<StoredSaleEventRecord>;
  markSaleEventEnded(event: StoredSaleEventRecord, now: Date): Promise<StoredSaleEventRecord>;
  saveSaleEventSnapshot(input: {
    saleEventId: UUID;
    rawPayloadJson: JsonValue;
    normalizedPayloadJson: JsonValue;
    snapshotHash: string;
    detectedAt: Date;
  }): Promise<SaleEventSnapshotRecord | null>;
  finalizeSyncRun(input: SyncRunFinalizeInput): Promise<SyncRunRecord>;
  recordSyncError(input: SyncErrorInput): Promise<SyncErrorRecord>;
}
