import { computeChangeSet } from "../sdk/diff";
import { normalizeRawRecords } from "../sdk/normalizer";
import type {
  BrandConnector,
  ChangeSet,
  ConnectorConfig,
  DetectChangesParams,
  NormalizedSaleRecord,
  RawSaleRecord
} from "../sdk/types";

export interface MockConnectorOptions {
  brandSlug: string;
  fixtureProvider: (config: ConnectorConfig) => RawSaleRecord[];
}

const cloneRawRecord = (record: RawSaleRecord): RawSaleRecord => ({
  ...record,
  categories: record.categories ? [...record.categories] : undefined,
  tags: record.tags ? [...record.tags] : undefined,
  rawPayloadJson:
    record.rawPayloadJson && typeof record.rawPayloadJson === "object"
      ? JSON.parse(JSON.stringify(record.rawPayloadJson))
      : record.rawPayloadJson
});

export const createMockConnector = (options: MockConnectorOptions): BrandConnector => ({
  brandSlug: options.brandSlug,
  async canRun(config: ConnectorConfig): Promise<boolean> {
    void config;
    return true;
  },
  async fetchRaw(config: ConnectorConfig): Promise<RawSaleRecord[]> {
    return options.fixtureProvider(config).map((record) => cloneRawRecord(record));
  },
  async normalize(records: RawSaleRecord[], config: ConnectorConfig): Promise<NormalizedSaleRecord[]> {
    return normalizeRawRecords(records, config);
  },
  async detectChanges(params: DetectChangesParams): Promise<ChangeSet> {
    return computeChangeSet(params);
  }
});
