import { describe, expect, it } from "@jest/globals";

import { ExpoPushGateway } from "../src/services/expo-push-gateway";

describe("STEP9 expo push gateway retry/backoff", () => {
  it("retries transient 503 responses and succeeds", async () => {
    let attempts = 0;
    const gateway = new ExpoPushGateway({
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
          return new Response(JSON.stringify({ errors: ["temporary"] }), {
            status: 503,
            headers: {
              "content-type": "application/json"
            }
          });
        }
        return new Response(
          JSON.stringify({
            data: [{ status: "ok", id: "ticket-final" }]
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

    const result = await gateway.send([
      {
        to: "ExponentPushToken[test-step9-retry]",
        title: "Retry",
        body: "Backoff"
      }
    ]);

    expect(attempts).toBe(3);
    expect(result.length).toBe(1);
    expect(result[0]?.success).toBe(true);
    expect(result[0]?.ticketId).toBe("ticket-final");
  });

  it("does not retry non-retryable 400 responses", async () => {
    let attempts = 0;
    const gateway = new ExpoPushGateway({
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
        return new Response(JSON.stringify({ errors: ["bad request"] }), {
          status: 400,
          headers: {
            "content-type": "application/json"
          }
        });
      }
    });

    await expect(
      gateway.send([
        {
          to: "ExponentPushToken[test-step9-no-retry]",
          title: "Fail",
          body: "No retry"
        }
      ])
    ).rejects.toThrow("status 400");
    expect(attempts).toBe(1);
  });
});
