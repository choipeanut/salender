import type { JsonValue, SyncRunType, UUID } from "@salecalendar/shared-types";

import { hashObject } from "../sdk/hash";
import type { NormalizedSaleRecord, StoredSaleEventRecord } from "../sdk/types";
import type {
  CollectorStore,
  SaleEventSnapshotRecord,
  SyncErrorInput,
  SyncErrorRecord,
  SyncRunFinalizeInput,
  SyncRunRecord,
  UpsertSaleEventInput
} from "./collector-store";

export interface InMemoryCollectorStoreState {
  saleEvents: StoredSaleEventRecord[];
  snapshots: SaleEventSnapshotRecord[];
  syncRuns: SyncRunRecord[];
  syncErrors: SyncErrorRecord[];
}

const toIso = (value: Date): string => value.toISOString();

const makeUuidFromSequence = (sequence: number): UUID => {
  const right = String(sequence).padStart(12, "0");
  return `00000000-0000-0000-0000-${right}`;
};

const snapshotKey = (saleEventId: UUID, snapshotHash: string): string => `${saleEventId}:${snapshotHash}`;

const saleEventKey = (brandId: UUID, sourceId: UUID, externalId: string): string =>
  `${brandId}:${sourceId}:${externalId}`;

const toStoredSaleEventRecord = (
  input: {
    id: UUID;
    brandId: UUID;
    sourceId: UUID;
    now: Date;
    record: NormalizedSaleRecord;
  }
): StoredSaleEventRecord => {
  const nowIso = toIso(input.now);
  return {
    id: input.id,
    brandId: input.brandId,
    sourceId: input.sourceId,
    externalId: input.record.externalId,
    title: input.record.title,
    summary: input.record.summary,
    saleUrl: input.record.saleUrl,
    imageUrl: input.record.imageUrl,
    startAt: input.record.startAt,
    endAt: input.record.endAt,
    timezone: input.record.timezone,
    status: input.record.status,
    discountPercent: input.record.discountPercent,
    discountLabel: input.record.discountLabel,
    categories: [...input.record.categories],
    tags: [...input.record.tags],
    normalizedHash: input.record.normalizedHash,
    firstSeenAt: nowIso,
    lastSeenAt: nowIso,
    lastChangedAt: nowIso,
    createdAt: nowIso,
    updatedAt: nowIso
  };
};

export class InMemoryCollectorStore implements CollectorStore {
  private readonly state: InMemoryCollectorStoreState;
  private syncRunSequence = 1200;
  private syncErrorSequence = 2200;
  private saleEventSequence = 3200;
  private snapshotSequence = 4200;
  private readonly saleEventByKey = new Map<string, StoredSaleEventRecord>();
  private readonly snapshotKeys = new Set<string>();

  constructor(initialState?: Partial<InMemoryCollectorStoreState>) {
    this.state = {
      saleEvents: initialState?.saleEvents ? initialState.saleEvents.map((value) => ({ ...value })) : [],
      snapshots: initialState?.snapshots ? initialState.snapshots.map((value) => ({ ...value })) : [],
      syncRuns: initialState?.syncRuns ? initialState.syncRuns.map((value) => ({ ...value })) : [],
      syncErrors: initialState?.syncErrors ? initialState.syncErrors.map((value) => ({ ...value })) : []
    };

    this.state.saleEvents.forEach((event) => {
      this.saleEventByKey.set(saleEventKey(event.brandId, event.sourceId, event.externalId), event);
    });
    this.state.snapshots.forEach((snapshot) => {
      this.snapshotKeys.add(snapshotKey(snapshot.saleEventId, snapshot.snapshotHash));
    });
  }

  async beginSyncRun(input: {
    brandId: UUID;
    sourceId: UUID;
    runType: SyncRunType;
    startedAt: Date;
  }): Promise<SyncRunRecord> {
    this.syncRunSequence += 1;
    const created: SyncRunRecord = {
      id: makeUuidFromSequence(this.syncRunSequence),
      brandId: input.brandId,
      sourceId: input.sourceId,
      runType: input.runType,
      startedAt: toIso(input.startedAt),
      finishedAt: null,
      status: "running",
      fetchedCount: 0,
      normalizedCount: 0,
      changedCount: 0,
      errorSummary: null
    };
    this.state.syncRuns.push(created);
    return { ...created };
  }

  async listSaleEvents(brandId: UUID, sourceId: UUID): Promise<StoredSaleEventRecord[]> {
    return this.state.saleEvents
      .filter((event) => event.brandId === brandId && event.sourceId === sourceId)
      .map((event) => ({ ...event, categories: [...event.categories], tags: [...event.tags] }));
  }

  async upsertSaleEvent(input: UpsertSaleEventInput): Promise<StoredSaleEventRecord> {
    const key = saleEventKey(input.brandId, input.sourceId, input.record.externalId);
    const existing = this.saleEventByKey.get(key);
    const nowIso = toIso(input.now);

    if (!existing) {
      this.saleEventSequence += 1;
      const created = toStoredSaleEventRecord({
        id: makeUuidFromSequence(this.saleEventSequence),
        brandId: input.brandId,
        sourceId: input.sourceId,
        now: input.now,
        record: input.record
      });
      this.saleEventByKey.set(key, created);
      this.state.saleEvents.push(created);
      return { ...created, categories: [...created.categories], tags: [...created.tags] };
    }

    const changed = existing.normalizedHash !== input.record.normalizedHash;
    const updated: StoredSaleEventRecord = {
      ...existing,
      title: input.record.title,
      summary: input.record.summary,
      saleUrl: input.record.saleUrl,
      imageUrl: input.record.imageUrl,
      startAt: input.record.startAt,
      endAt: input.record.endAt,
      timezone: input.record.timezone,
      status: input.record.status,
      discountPercent: input.record.discountPercent,
      discountLabel: input.record.discountLabel,
      categories: [...input.record.categories],
      tags: [...input.record.tags],
      normalizedHash: input.record.normalizedHash,
      lastSeenAt: nowIso,
      lastChangedAt: changed ? nowIso : existing.lastChangedAt,
      updatedAt: nowIso
    };
    this.saleEventByKey.set(key, updated);

    const index = this.state.saleEvents.findIndex((event) => event.id === existing.id);
    if (index >= 0) {
      this.state.saleEvents[index] = updated;
    }
    return { ...updated, categories: [...updated.categories], tags: [...updated.tags] };
  }

  async markSaleEventEnded(event: StoredSaleEventRecord, now: Date): Promise<StoredSaleEventRecord> {
    const key = saleEventKey(event.brandId, event.sourceId, event.externalId);
    const existing = this.saleEventByKey.get(key);
    if (!existing) {
      throw new Error(`Cannot end non-existing event: ${event.externalId}`);
    }

    const nowIso = toIso(now);
    const ended: StoredSaleEventRecord = {
      ...existing,
      status: "ended",
      endAt: existing.endAt ?? nowIso,
      lastChangedAt: nowIso,
      lastSeenAt: nowIso,
      updatedAt: nowIso
    };
    this.saleEventByKey.set(key, ended);
    const index = this.state.saleEvents.findIndex((value) => value.id === ended.id);
    if (index >= 0) {
      this.state.saleEvents[index] = ended;
    }
    return { ...ended, categories: [...ended.categories], tags: [...ended.tags] };
  }

  async saveSaleEventSnapshot(input: {
    saleEventId: UUID;
    rawPayloadJson: JsonValue;
    normalizedPayloadJson: JsonValue;
    snapshotHash: string;
    detectedAt: Date;
  }): Promise<SaleEventSnapshotRecord | null> {
    const uniqueKey = snapshotKey(input.saleEventId, input.snapshotHash);
    if (this.snapshotKeys.has(uniqueKey)) {
      return null;
    }

    this.snapshotSequence += 1;
    const created: SaleEventSnapshotRecord = {
      id: makeUuidFromSequence(this.snapshotSequence),
      saleEventId: input.saleEventId,
      rawPayloadJson: input.rawPayloadJson,
      normalizedPayloadJson: input.normalizedPayloadJson,
      snapshotHash: input.snapshotHash,
      detectedAt: toIso(input.detectedAt)
    };
    this.snapshotKeys.add(uniqueKey);
    this.state.snapshots.push(created);
    return { ...created };
  }

  async finalizeSyncRun(input: SyncRunFinalizeInput): Promise<SyncRunRecord> {
    const found = this.state.syncRuns.find((run) => run.id === input.syncRunId);
    if (!found) {
      throw new Error(`Sync run not found: ${input.syncRunId}`);
    }

    const finalized: SyncRunRecord = {
      ...found,
      status: input.status,
      fetchedCount: input.fetchedCount,
      normalizedCount: input.normalizedCount,
      changedCount: input.changedCount,
      errorSummary: input.errorSummary ?? null,
      finishedAt: new Date().toISOString()
    };

    const index = this.state.syncRuns.findIndex((run) => run.id === input.syncRunId);
    this.state.syncRuns[index] = finalized;
    return { ...finalized };
  }

  async recordSyncError(input: SyncErrorInput): Promise<SyncErrorRecord> {
    this.syncErrorSequence += 1;
    const created: SyncErrorRecord = {
      id: makeUuidFromSequence(this.syncErrorSequence),
      syncRunId: input.syncRunId,
      brandId: input.brandId,
      sourceId: input.sourceId,
      errorType: input.errorType,
      message: input.message,
      detailJson: input.detailJson,
      createdAt: new Date().toISOString()
    };
    this.state.syncErrors.push(created);
    return { ...created };
  }

  getDebugState(): InMemoryCollectorStoreState {
    return {
      saleEvents: this.state.saleEvents.map((value) => ({ ...value })),
      snapshots: this.state.snapshots.map((value) => ({ ...value })),
      syncRuns: this.state.syncRuns.map((value) => ({ ...value })),
      syncErrors: this.state.syncErrors.map((value) => ({ ...value }))
    };
  }

  getStateHash(): string {
    return hashObject(this.getDebugState());
  }
}
