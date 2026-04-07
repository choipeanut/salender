import type { BrandConnector } from "../sdk/types";
import { mockMusinsaConnector } from "./mock-musinsa-connector";
import { mockOliveYoungConnector } from "./mock-oliveyoung-connector";
import { steamFeaturedConnector } from "./real-steam-featured-connector";

export class ConnectorRegistry {
  private readonly connectorsBySlug = new Map<string, BrandConnector>();

  constructor(connectors?: BrandConnector[]) {
    connectors?.forEach((connector) => this.register(connector));
  }

  register(connector: BrandConnector): void {
    this.connectorsBySlug.set(connector.brandSlug, connector);
  }

  getOrThrow(brandSlug: string): BrandConnector {
    const connector = this.connectorsBySlug.get(brandSlug);
    if (!connector) {
      throw new Error(`Connector not found for brand slug: ${brandSlug}`);
    }
    return connector;
  }

  list(): BrandConnector[] {
    return [...this.connectorsBySlug.values()];
  }
}

export const createDefaultConnectorRegistry = (): ConnectorRegistry =>
  new ConnectorRegistry([
    mockOliveYoungConnector,
    mockMusinsaConnector,
    steamFeaturedConnector
  ]);
