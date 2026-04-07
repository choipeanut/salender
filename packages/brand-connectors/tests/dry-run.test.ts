import { describe, expect, it } from "@jest/globals";

import {
  InMemoryCollectorStore,
  mockOliveYoungConnector,
  runCollectorDryRun,
  type ConnectorConfig
} from "../src";

const config: ConnectorConfig = {
  brandId: "00000000-0000-0000-0000-000000000101",
  sourceId: "00000000-0000-0000-0000-000000000201",
  runType: "manual",
  now: new Date("2026-04-07T00:00:00.000Z")
};

describe("STEP6 dry-run mode", () => {
  it("returns diff summary without mutating collector store", async () => {
    const store = new InMemoryCollectorStore();
    const result = await runCollectorDryRun({
      connector: mockOliveYoungConnector,
      store,
      config,
      sampleSize: 1
    });

    expect(result.status).toBe("success");
    expect(result.fetchedCount).toBe(2);
    expect(result.normalizedCount).toBe(2);
    expect(result.changeSummary.created).toBe(2);
    expect(result.sampleRecords.length).toBe(1);

    const after = store.getDebugState();
    expect(after.saleEvents.length).toBe(0);
    expect(after.snapshots.length).toBe(0);
    expect(after.syncRuns.length).toBe(0);
    expect(after.syncErrors.length).toBe(0);
  });
});
