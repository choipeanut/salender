import { createMockConnector } from "./create-mock-connector";
import { mockOliveYoungRawFixture, mockOliveYoungRawFixtureV2 } from "../fixtures/mock-oliveyoung.fixture";
import type { ConnectorConfig, RawSaleRecord } from "../sdk/types";

const getFixtureByVariant = (config: ConnectorConfig): RawSaleRecord[] => {
  const variant = config.metadata?.fixtureVariant;
  if (variant === "v2") {
    return mockOliveYoungRawFixtureV2;
  }
  return mockOliveYoungRawFixture;
};

export const mockOliveYoungConnector = createMockConnector({
  brandSlug: "oliveyoung",
  fixtureProvider: getFixtureByVariant
});
