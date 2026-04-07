import type { JsonValue } from "@salecalendar/shared-types";

import type { PushGateway, PushMessage, PushSendResult } from "./push-notification-pipeline-service";
import { retryWithBackoff, type RetryBackoffPolicy } from "./retry-backoff";

interface ExpoPushTicket {
  status?: string;
  id?: string;
  message?: string;
  details?: unknown;
}

interface ExpoPushResponse {
  data?: ExpoPushTicket[];
}

export interface ExpoPushGatewayOptions {
  endpoint?: string;
  fetchImpl?: typeof fetch;
  accessToken?: string | undefined;
  timeoutMs?: number;
  retryPolicy?: Partial<RetryBackoffPolicy> | undefined;
  sleepFn?: ((delayMs: number) => Promise<void>) | undefined;
}

const DEFAULT_ENDPOINT = "https://exp.host/--/api/v2/push/send";
const DEFAULT_TIMEOUT_MS = 10000;

const toJsonValue = (value: unknown): JsonValue => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => toJsonValue(item));
  }
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    const converted: Record<string, JsonValue> = {};
    for (const key of Object.keys(record)) {
      converted[key] = toJsonValue(record[key]);
    }
    return converted;
  }
  return String(value);
};

const stringifyErrorDetails = (details: unknown): string => {
  try {
    return JSON.stringify(toJsonValue(details));
  } catch (_error) {
    return "unknown_error";
  }
};

class ExpoPushRequestError extends Error {
  readonly status: number | null;
  readonly retryable: boolean;

  constructor(message: string, status: number | null, retryable: boolean) {
    super(message);
    this.name = "ExpoPushRequestError";
    this.status = status;
    this.retryable = retryable;
  }
}

const isAbortError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "name" in error &&
  (error as { name: string }).name === "AbortError";

export class ExpoPushGateway implements PushGateway {
  private readonly endpoint: string;
  private readonly fetchImpl: typeof fetch;
  private readonly accessToken: string | undefined;
  private readonly timeoutMs: number;
  private readonly retryPolicy: Partial<RetryBackoffPolicy> | undefined;
  private readonly sleepFn: ((delayMs: number) => Promise<void>) | undefined;

  constructor(options: ExpoPushGatewayOptions = {}) {
    this.endpoint = options.endpoint ?? DEFAULT_ENDPOINT;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.accessToken = options.accessToken;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.retryPolicy = options.retryPolicy;
    this.sleepFn = options.sleepFn;
  }

  async send(messages: PushMessage[]): Promise<PushSendResult[]> {
    if (messages.length === 0) {
      return [];
    }

    return retryWithBackoff(
      async () => this.sendOnce(messages),
      {
        policy: this.retryPolicy,
        sleepFn: this.sleepFn,
        shouldRetry: async (error) =>
          error instanceof ExpoPushRequestError ? error.retryable : false
      }
    );
  }

  private async sendOnce(messages: PushMessage[]): Promise<PushSendResult[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json"
      };
      if (this.accessToken) {
        headers.Authorization = `Bearer ${this.accessToken}`;
      }

      const response = await this.fetchImpl(this.endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(
          messages.map((message) => ({
            to: message.to,
            title: message.title,
            body: message.body,
            data: message.data ?? {},
            sound: "default"
          }))
        ),
        signal: controller.signal
      });

      if (!response.ok) {
        const retryable = response.status === 429 || response.status >= 500;
        throw new ExpoPushRequestError(
          `Expo push API failed with status ${response.status}.`,
          response.status,
          retryable
        );
      }

      const payload = (await response.json()) as ExpoPushResponse;
      const tickets = Array.isArray(payload.data) ? payload.data : [];

      return messages.map((message, index) => {
        const ticket = tickets[index];
        if (ticket?.status === "ok") {
          return {
            to: message.to,
            success: true,
            ticketId: ticket.id
          };
        }

        return {
          to: message.to,
          success: false,
          errorMessage: ticket?.message ?? stringifyErrorDetails(ticket?.details)
        };
      });
    } catch (error) {
      if (isAbortError(error)) {
        throw new ExpoPushRequestError("Expo push API request timed out.", null, true);
      }
      if (error instanceof ExpoPushRequestError) {
        throw error;
      }
      throw new ExpoPushRequestError(
        "Expo push API request failed with unknown network error.",
        null,
        true
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
