import { describe, expect, it } from "@jest/globals";

import {
  InMemoryCollectorStore,
  createSteamFeaturedConnector,
  runCollectorSync,
  type ConnectorConfig
} from "../src";

const baseConfig: ConnectorConfig = {
  brandId: "00000000-0000-0000-0000-000000000105",
  sourceId: "00000000-0000-0000-0000-000000000205",
  runType: "manual",
  now: new Date("2026-04-07T00:00:00.000Z")
};

describe("STEP6 steam real connector", () => {
  it("maps official Steam specials payload into raw/normalized records", async () => {
    const connector = createSteamFeaturedConnector({
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            specials: {
              items: [
                {
                  id: 111,
                  name: "Game One",
                  discounted: true,
                  discount_percent: 40,
                  discount_expiration: 1775754000,
                  header_image: "https://cdn.example/game-one.jpg",
                  windows_available: true,
                  mac_available: false,
                  linux_available: false
                },
                {
                  id: 222,
                  name: "Not Discounted",
                  discounted: false,
                  discount_percent: 0
                }
              ]
            }
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json"
            }
          }
        )
    });

    const rawRecords = await connector.fetchRaw(baseConfig);
    const normalized = await connector.normalize(rawRecords, baseConfig);

    expect(rawRecords.length).toBe(1);
    expect(rawRecords[0]?.externalId).toBe("steam-app-111");
    expect(rawRecords[0]?.discountPercent).toBe(40);
    expect(rawRecords[0]?.saleUrl).toBe("https://store.steampowered.com/app/111/");
    expect(rawRecords[0]?.statusHint).toBe("active");

    expect(normalized.length).toBe(1);
    expect(normalized[0]?.title).toBe("Game One");
    expect(normalized[0]?.categories).toContain("gaming");
    expect(normalized[0]?.tags).toContain("windows");
  });

  it("degrades gracefully via runtime sync-error log when upstream API fails", async () => {
    const connector = createSteamFeaturedConnector({
      fetchImpl: async () =>
        new Response(JSON.stringify({ message: "unavailable" }), {
          status: 503,
          headers: {
            "content-type": "application/json"
          }
        })
    });

    const store = new InMemoryCollectorStore();
    const result = await runCollectorSync({
      connector,
      store,
      config: baseConfig
    });

    expect(result.status).toBe("failed");

    const state = store.getDebugState();
    expect(state.syncRuns.length).toBe(1);
    expect(state.syncErrors.length).toBe(1);
    expect(state.syncErrors[0]?.message).toContain("status 503");
  });

  it("retries transient upstream errors with backoff policy", async () => {
    let attempts = 0;
    const connector = createSteamFeaturedConnector({
      retryPolicy: {
        maxAttempts: 3,
        initialDelayMs: 1,
        maxDelayMs: 2,
        jitterRatio: 0
      },
      sleepFn: async () => {
        return;
      },
      fetchImpl: async () => {
        attempts += 1;
        if (attempts < 3) {
          return new Response(JSON.stringify({ message: "unavailable" }), {
            status: 503,
            headers: {
              "content-type": "application/json"
            }
          });
        }
        return new Response(
          JSON.stringify({
            specials: {
              items: [
                {
                  id: 777,
                  name: "Recovered Game",
                  discounted: true,
                  discount_percent: 15,
                  discount_expiration: 1775754000
                }
              ]
            }
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json"
            }
          }
        );
      }
    });

    const rawRecords = await connector.fetchRaw(baseConfig);
    expect(attempts).toBe(3);
    expect(rawRecords.length).toBe(1);
    expect(rawRecords[0]?.externalId).toBe("steam-app-777");
  });
});
