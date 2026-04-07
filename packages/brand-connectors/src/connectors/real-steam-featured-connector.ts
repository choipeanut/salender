import type { JsonValue, SaleEventStatus } from "@salecalendar/shared-types";

import { computeChangeSet } from "../sdk/diff";
import { normalizeRawRecords } from "../sdk/normalizer";
import { retryWithBackoff, type RetryBackoffPolicy } from "../sdk/retry-backoff";
import type {
  BrandConnector,
  ChangeSet,
  ConnectorConfig,
  DetectChangesParams,
  NormalizedSaleRecord,
  RawSaleRecord
} from "../sdk/types";

const DEFAULT_STEAM_FEATURED_API_URL =
  "https://store.steampowered.com/api/featuredcategories?cc=kr&l=koreana";
const DEFAULT_TIMEOUT_MS = 10000;

interface SteamSpecialItem {
  id?: number;
  name?: string;
  discounted?: boolean;
  discount_percent?: number;
  discount_expiration?: number;
  header_image?: string;
  large_capsule_image?: string;
  small_capsule_image?: string;
  windows_available?: boolean;
  mac_available?: boolean;
  linux_available?: boolean;
  [key: string]: unknown;
}

interface SteamFeaturedResponse {
  specials?: {
    items?: SteamSpecialItem[];
  };
}

export interface SteamFeaturedConnectorOptions {
  endpoint?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  retryPolicy?: Partial<RetryBackoffPolicy> | undefined;
  sleepFn?: ((delayMs: number) => Promise<void>) | undefined;
}

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
      const nested = record[key];
      if (nested === undefined) {
        continue;
      }
      converted[key] = toJsonValue(nested);
    }
    return converted;
  }
  return String(value);
};

const toIsoFromUnixSeconds = (value: number | undefined): string | null => {
  if (!Number.isFinite(value) || !value || value <= 0) {
    return null;
  }
  return new Date(value * 1000).toISOString();
};

const toStatusHint = (endAt: string | null, now: Date): SaleEventStatus => {
  if (!endAt) {
    return "unknown";
  }
  return new Date(endAt) < now ? "ended" : "active";
};

const buildTags = (item: SteamSpecialItem): string[] => {
  const tags = ["steam-specials"];
  if (item.windows_available) {
    tags.push("windows");
  }
  if (item.mac_available) {
    tags.push("mac");
  }
  if (item.linux_available) {
    tags.push("linux");
  }
  return tags;
};

const toRawRecord = (
  item: SteamSpecialItem,
  fetchedAt: string,
  now: Date
): RawSaleRecord | null => {
  const appId = item.id;
  const title = item.name?.trim();
  if (!appId || !title || !item.discounted) {
    return null;
  }

  const endAt = toIsoFromUnixSeconds(item.discount_expiration);
  const discountPercent =
    typeof item.discount_percent === "number" ? item.discount_percent : null;
  const discountLabel =
    discountPercent !== null ? `${discountPercent}% OFF` : undefined;

  return {
    externalId: `steam-app-${appId}`,
    title,
    summary:
      discountPercent !== null
        ? `Steam Specials discount: ${discountPercent}%`
        : "Steam Specials discount event",
    saleUrl: `https://store.steampowered.com/app/${appId}/`,
    imageUrl:
      item.header_image ?? item.large_capsule_image ?? item.small_capsule_image,
    startAt: null,
    endAt,
    timezone: "Asia/Seoul",
    discountLabel,
    discountPercent,
    categories: ["gaming", "digital-goods"],
    tags: buildTags(item),
    statusHint: toStatusHint(endAt, now),
    rawPayloadJson: toJsonValue(item),
    fetchedAt
  };
};

const createAbortController = (timeoutMs: number): {
  controller: AbortController;
  timeout: NodeJS.Timeout;
} => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return {
    controller,
    timeout
  };
};

class SteamApiRequestError extends Error {
  readonly status: number | null;
  readonly retryable: boolean;

  constructor(message: string, status: number | null, retryable: boolean) {
    super(message);
    this.name = "SteamApiRequestError";
    this.status = status;
    this.retryable = retryable;
  }
}

const isAbortError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "name" in error &&
  (error as { name: string }).name === "AbortError";

export const createSteamFeaturedConnector = (
  options: SteamFeaturedConnectorOptions = {}
): BrandConnector => {
  const fetchImpl = options.fetchImpl ?? fetch;
  const endpoint = options.endpoint ?? DEFAULT_STEAM_FEATURED_API_URL;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retryPolicy = options.retryPolicy;
  const sleepFn = options.sleepFn;

  return {
    brandSlug: "steam",
    async canRun(config: ConnectorConfig): Promise<boolean> {
      void config;
      return true;
    },
    async fetchRaw(config: ConnectorConfig): Promise<RawSaleRecord[]> {
      const response = await retryWithBackoff(
        async () => {
          const { controller, timeout } = createAbortController(timeoutMs);
          try {
            const attemptResponse = await fetchImpl(endpoint, {
              method: "GET",
              headers: {
                Accept: "application/json"
              },
              signal: controller.signal
            });

            if (!attemptResponse.ok) {
              const retryable =
                attemptResponse.status === 429 || attemptResponse.status >= 500;
              throw new SteamApiRequestError(
                `Steam API request failed with status ${attemptResponse.status}.`,
                attemptResponse.status,
                retryable
              );
            }
            return attemptResponse;
          } catch (error) {
            if (isAbortError(error)) {
              throw new SteamApiRequestError(
                "Steam API request timed out.",
                null,
                true
              );
            }
            if (error instanceof SteamApiRequestError) {
              throw error;
            }
            throw new SteamApiRequestError(
              "Steam API request failed with unknown network error.",
              null,
              true
            );
          } finally {
            clearTimeout(timeout);
          }
        },
        {
          policy: retryPolicy,
          sleepFn,
          shouldRetry: async (error) =>
            error instanceof SteamApiRequestError ? error.retryable : false
        }
      );

      const payload = (await response.json()) as SteamFeaturedResponse;
      const items = payload.specials?.items;
      if (!Array.isArray(items)) {
        throw new Error("Steam API payload missing specials.items array.");
      }

      const fetchedAt = config.now.toISOString();
      return items
        .map((item) => toRawRecord(item, fetchedAt, config.now))
        .filter((record): record is RawSaleRecord => Boolean(record));
    },
    async normalize(
      records: RawSaleRecord[],
      config: ConnectorConfig
    ): Promise<NormalizedSaleRecord[]> {
      return normalizeRawRecords(records, config);
    },
    async detectChanges(params: DetectChangesParams): Promise<ChangeSet> {
      return computeChangeSet(params);
    }
  };
};

export const steamFeaturedConnector = createSteamFeaturedConnector();
