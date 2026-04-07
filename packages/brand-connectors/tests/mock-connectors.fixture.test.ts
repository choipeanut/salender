import { describe, expect, it } from "@jest/globals";

import { mockMusinsaConnector, mockOliveYoungConnector } from "../src";
import type { ConnectorConfig } from "../src";

const baseConfig: ConnectorConfig = {
  brandId: "00000000-0000-0000-0000-000000000101",
  sourceId: "00000000-0000-0000-0000-000000000201",
  runType: "scheduled",
  now: new Date("2026-04-07T00:00:00.000Z")
};

describe("STEP5 mock connector fixtures", () => {
  it("loads and normalizes oliveyoung fixture", async () => {
    const rawRecords = await mockOliveYoungConnector.fetchRaw(baseConfig);
    const normalized = await mockOliveYoungConnector.normalize(rawRecords, baseConfig);

    expect(rawRecords.length).toBe(2);
    expect(normalized.length).toBe(2);
    expect(normalized[0]?.externalId).toBe("oliveyoung-2026-spring-week");
    expect(normalized[0]?.discountPercent).toBe(50);
    expect(normalized[0]?.normalizedHash.length).toBe(64);
  });

  it("loads and normalizes musinsa fixture", async () => {
    const rawRecords = await mockMusinsaConnector.fetchRaw({
      ...baseConfig,
      brandId: "00000000-0000-0000-0000-000000000102",
      sourceId: "00000000-0000-0000-0000-000000000202"
    });
    const normalized = await mockMusinsaConnector.normalize(rawRecords, {
      ...baseConfig,
      brandId: "00000000-0000-0000-0000-000000000102",
      sourceId: "00000000-0000-0000-0000-000000000202"
    });

    expect(rawRecords.length).toBe(2);
    expect(normalized.length).toBe(2);
    expect(normalized[1]?.status).toBe("unknown");
    expect(normalized[0]?.categories).toContain("fashion");
  });
});
