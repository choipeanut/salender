import type {
  ISODateTimeString,
  JsonValue,
  SaleEventStatus,
  SyncRunStatus,
  SyncRunType,
  UUID
} from "@salecalendar/shared-types";

export interface ConnectorConfig {
  brandId: UUID;
  sourceId: UUID;
  runType: SyncRunType;
  now: Date;
  metadata?: Record<string, unknown> | undefined;
}

export interface RawSaleRecord {
  externalId: string;
  title: string;
  summary?: string | undefined;
  saleUrl?: string | undefined;
  imageUrl?: string | undefined;
  startAt?: ISODateTimeString | null | undefined;
  endAt?: ISODateTimeString | null | undefined;
  timezone?: string | undefined;
  discountLabel?: string | undefined;
  discountPercent?: number | null | undefined;
  categories?: string[] | undefined;
  tags?: string[] | undefined;
  statusHint?: SaleEventStatus | undefined;
  rawPayloadJson: JsonValue;
  fetchedAt: ISODateTimeString;
}

export interface NormalizedSaleRecord {
  externalId: string;
  title: string;
  summary: string | null;
  saleUrl: string | null;
  imageUrl: string | null;
  startAt: ISODateTimeString | null;
  endAt: ISODateTimeString | null;
  timezone: string;
  status: SaleEventStatus;
  discountPercent: number | null;
  discountLabel: string | null;
  categories: string[];
  tags: string[];
  rawPayloadJson: JsonValue;
  normalizedPayloadJson: JsonValue;
  normalizedHash: string;
}

export interface StoredSaleEventRecord {
  id: UUID;
  brandId: UUID;
  sourceId: UUID;
  externalId: string;
  title: string;
  summary: string | null;
  saleUrl: string | null;
  imageUrl: string | null;
  startAt: ISODateTimeString | null;
  endAt: ISODateTimeString | null;
  timezone: string;
  status: SaleEventStatus;
  discountPercent: number | null;
  discountLabel: string | null;
  categories: string[];
  tags: string[];
  normalizedHash: string;
  firstSeenAt: ISODateTimeString;
  lastSeenAt: ISODateTimeString;
  lastChangedAt: ISODateTimeString;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface DetectChangesParams {
  existingEvents: StoredSaleEventRecord[];
  normalizedRecords: NormalizedSaleRecord[];
  now: Date;
}

export interface ChangeSet {
  created: NormalizedSaleRecord[];
  updated: NormalizedSaleRecord[];
  unchanged: NormalizedSaleRecord[];
  ended: StoredSaleEventRecord[];
}

export interface BrandConnector {
  brandSlug: string;
  canRun(config: ConnectorConfig): Promise<boolean>;
  fetchRaw(config: ConnectorConfig): Promise<RawSaleRecord[]>;
  normalize(records: RawSaleRecord[], config: ConnectorConfig): Promise<NormalizedSaleRecord[]>;
  detectChanges(params: DetectChangesParams): Promise<ChangeSet>;
}

export interface CollectorSyncResult {
  syncRunId: UUID;
  status: SyncRunStatus;
  fetchedCount: number;
  normalizedCount: number;
  changedCount: number;
}
