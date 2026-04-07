import { createMockConnector } from "./create-mock-connector";
import { mockMusinsaRawFixture } from "../fixtures/mock-musinsa.fixture";

export const mockMusinsaConnector = createMockConnector({
  brandSlug: "musinsa",
  fixtureProvider: () => mockMusinsaRawFixture
});
