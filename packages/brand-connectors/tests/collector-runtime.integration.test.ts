import { describe, expect, it } from "@jest/globals";

import {
  createDefaultConnectorRegistry,
  InMemoryCollectorStore,
  runCollectorSync,
  type BrandConnector,
  type ConnectorConfig,
  type RawSaleRecord
} from "../src";

const oliveyoungConfig: ConnectorConfig = {
  brandId: "00000000-0000-0000-0000-000000000101",
  sourceId: "00000000-0000-0000-0000-000000000201",
  runType: "scheduled",
  now: new Date("2026-04-07T00:00:00.000Z")
};

describe("STEP5 collector runtime integration", () => {
  it("runs mock connector pipeline and stores sync/raw/event logs", async () => {
    const registry = createDefaultConnectorRegistry();
    const store = new InMemoryCollectorStore();
    const connector = registry.getOrThrow("oliveyoung");

    const first = await runCollectorSync({
      connector,
      store,
      config: oliveyoungConfig
    });

    expect(first.status).toBe("success");
    expect(first.fetchedCount).toBe(2);
    expect(first.normalizedCount).toBe(2);
    expect(first.changedCount).toBe(2);

    const afterFirst = store.getDebugState();
    expect(afterFirst.saleEvents.length).toBe(2);
    expect(afterFirst.snapshots.length).toBe(2);
    expect(afterFirst.syncRuns.length).toBe(1);
    expect(afterFirst.syncErrors.length).toBe(0);

    const second = await runCollectorSync({
      connector,
      store,
      config: {
        ...oliveyoungConfig,
        now: new Date("2026-04-07T00:10:00.000Z")
      }
    });

    expect(second.status).toBe("success");
    expect(second.changedCount).toBe(0);

    const third = await runCollectorSync({
      connector,
      store,
      config: {
        ...oliveyoungConfig,
        now: new Date("2026-04-08T00:00:00.000Z"),
        metadata: { fixtureVariant: "v2" }
      }
    });

    expect(third.status).toBe("success");
    expect(third.changedCount).toBe(2);

    const finalState = store.getDebugState();
    expect(finalState.saleEvents.length).toBe(2);
    expect(finalState.snapshots.length).toBe(3);
    expect(finalState.syncRuns.length).toBe(3);
    expect(finalState.syncErrors.length).toBe(0);

    const endedEvent = finalState.saleEvents.find(
      (event) => event.externalId === "oliveyoung-2026-night-routine"
    );
    expect(endedEvent?.status).toBe("ended");
  });

  it("writes sync error log when connector throws", async () => {
    const failingConnector: BrandConnector = {
      brandSlug: "failing",
      async canRun(): Promise<boolean> {
        return true;
      },
      async fetchRaw(): Promise<RawSaleRecord[]> {
        throw new Error("fixture read failed");
      },
      async normalize(): Promise<never[]> {
        return [];
      },
      async detectChanges() {
        return {
          created: [],
          updated: [],
          unchanged: [],
          ended: []
        };
      }
    };

    const store = new InMemoryCollectorStore();
    const result = await runCollectorSync({
      connector: failingConnector,
      store,
      config: {
        brandId: "00000000-0000-0000-0000-000000000999",
        sourceId: "00000000-0000-0000-0000-000000000998",
        runType: "retry",
        now: new Date("2026-04-07T00:00:00.000Z")
      }
    });

    expect(result.status).toBe("failed");
    const state = store.getDebugState();
    expect(state.syncRuns.length).toBe(1);
    expect(state.syncErrors.length).toBe(1);
    expect(state.syncErrors[0]?.errorType).toBe("collector_runtime_error");
  });
});
