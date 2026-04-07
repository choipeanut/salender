import { retryWithBackoff } from "./retry-backoff";

export type AdminSyncRunStatus = "running" | "success" | "failed";

export interface AdminSyncTarget {
  brandSlug: string;
  brandName: string;
  brandId: string;
  sourceId: string;
}

export interface AdminSyncRun {
  id: string;
  brandSlug: string;
  brandName: string;
  runType: "manual" | "scheduled" | "retry";
  status: AdminSyncRunStatus;
  fetchedCount: number;
  normalizedCount: number;
  changedCount: number;
  startedAt: string;
  finishedAt: string | null;
  attempts: number;
  errorSummary: string | null;
}

export interface AdminSyncError {
  id: string;
  syncRunId: string;
  brandSlug: string;
  errorType: "rate_limited" | "network" | "validation" | "unknown";
  message: string;
  createdAt: string;
  detail: Record<string, unknown>;
}

export interface AdminRecentChange {
  saleEventExternalId: string;
  brandSlug: string;
  title: string;
  status: "upcoming" | "active" | "ended" | "unknown";
  discountLabel: string | null;
  changedAt: string;
}

export interface AdminDashboardSnapshot {
  syncRuns: AdminSyncRun[];
  syncErrors: AdminSyncError[];
  recentChanges: AdminRecentChange[];
  syncTargets: AdminSyncTarget[];
  lastUpdatedAt: string;
}

export interface ManualSyncRequest {
  brandSlug: string;
  dryRun?: boolean | undefined;
  simulateFailure?: boolean | undefined;
}

export interface ManualSyncResponse {
  status: "success" | "failed" | "rate_limited";
  attempts: number;
  syncRun: AdminSyncRun | null;
  dryRunPreview?: {
    fetchedCount: number;
    normalizedCount: number;
    changedCount: number;
  } | undefined;
  message?: string | undefined;
  retryAfterMs?: number | undefined;
}

const makeId = (): string => Math.random().toString(36).slice(2, 14);

const nowIso = (): string => new Date().toISOString();

const syncTargets: AdminSyncTarget[] = [
  {
    brandSlug: "oliveyoung",
    brandName: "Oliveyoung",
    brandId: "00000000-0000-0000-0000-000000000101",
    sourceId: "00000000-0000-0000-0000-000000000201"
  },
  {
    brandSlug: "musinsa",
    brandName: "Musinsa",
    brandId: "00000000-0000-0000-0000-000000000102",
    sourceId: "00000000-0000-0000-0000-000000000202"
  },
  {
    brandSlug: "steam",
    brandName: "Steam",
    brandId: "00000000-0000-0000-0000-000000000105",
    sourceId: "00000000-0000-0000-0000-000000000205"
  }
];

const defaultRuns = (): AdminSyncRun[] => [
  {
    id: "sync-seed-1001",
    brandSlug: "steam",
    brandName: "Steam",
    runType: "scheduled",
    status: "success",
    fetchedCount: 10,
    normalizedCount: 10,
    changedCount: 4,
    startedAt: "2026-04-07T01:00:00.000Z",
    finishedAt: "2026-04-07T01:00:05.000Z",
    attempts: 1,
    errorSummary: null
  },
  {
    id: "sync-seed-1002",
    brandSlug: "oliveyoung",
    brandName: "Oliveyoung",
    runType: "scheduled",
    status: "failed",
    fetchedCount: 0,
    normalizedCount: 0,
    changedCount: 0,
    startedAt: "2026-04-07T02:00:00.000Z",
    finishedAt: "2026-04-07T02:00:10.000Z",
    attempts: 3,
    errorSummary: "Connector timeout after retries"
  }
];

const defaultErrors = (): AdminSyncError[] => [
  {
    id: "error-seed-2001",
    syncRunId: "sync-seed-1002",
    brandSlug: "oliveyoung",
    errorType: "network",
    message: "Read timeout while fetching upstream page.",
    createdAt: "2026-04-07T02:00:10.000Z",
    detail: {
      attempts: 3,
      backoff: "300ms, 600ms"
    }
  }
];

const defaultRecentChanges = (): AdminRecentChange[] => [
  {
    saleEventExternalId: "steam-app-264710",
    brandSlug: "steam",
    title: "Subnautica",
    status: "active",
    discountLabel: "75% OFF",
    changedAt: "2026-04-07T01:00:05.000Z"
  },
  {
    saleEventExternalId: "oliveyoung-2026-spring-week",
    brandSlug: "oliveyoung",
    title: "Spring Week",
    status: "active",
    discountLabel: "50% OFF",
    changedAt: "2026-04-06T23:20:00.000Z"
  }
];

class RetryableManualSyncError extends Error {
  readonly retryable = true;

  constructor(message: string) {
    super(message);
    this.name = "RetryableManualSyncError";
  }
}

export class AdminOpsRuntime {
  private readonly runs: AdminSyncRun[] = defaultRuns();
  private readonly errors: AdminSyncError[] = defaultErrors();
  private readonly recentChanges: AdminRecentChange[] = defaultRecentChanges();
  private readonly lastManualSyncAt = new Map<string, number>();
  private lastUpdatedAt = nowIso();
  private readonly minimumSyncIntervalMs = 15_000;

  getDashboard(): AdminDashboardSnapshot {
    return {
      syncRuns: [...this.runs].sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
      syncErrors: [...this.errors].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      recentChanges: [...this.recentChanges].sort((a, b) => b.changedAt.localeCompare(a.changedAt)),
      syncTargets: [...syncTargets],
      lastUpdatedAt: this.lastUpdatedAt
    };
  }

  reset(): void {
    this.runs.splice(0, this.runs.length, ...defaultRuns());
    this.errors.splice(0, this.errors.length, ...defaultErrors());
    this.recentChanges.splice(0, this.recentChanges.length, ...defaultRecentChanges());
    this.lastManualSyncAt.clear();
    this.lastUpdatedAt = nowIso();
  }

  async runManualSync(request: ManualSyncRequest): Promise<ManualSyncResponse> {
    const target = syncTargets.find((item) => item.brandSlug === request.brandSlug);
    if (!target) {
      return {
        status: "failed",
        attempts: 1,
        syncRun: null,
        message: `Unknown sync target: ${request.brandSlug}`
      };
    }

    const now = Date.now();
    const previousRunAt = this.lastManualSyncAt.get(target.brandSlug);
    if (
      previousRunAt !== undefined &&
      now - previousRunAt < this.minimumSyncIntervalMs
    ) {
      const retryAfterMs = this.minimumSyncIntervalMs - (now - previousRunAt);
      this.pushRateLimitError(target.brandSlug, retryAfterMs);
      return {
        status: "rate_limited",
        attempts: 1,
        syncRun: null,
        retryAfterMs,
        message: `Rate limit applied. Retry in ${retryAfterMs}ms.`
      };
    }

    this.lastManualSyncAt.set(target.brandSlug, now);
    if (request.dryRun) {
      const preview = this.simulateCounts(target.brandSlug, true);
      return {
        status: "success",
        attempts: 1,
        syncRun: null,
        dryRunPreview: preview,
        message: "Dry-run completed without mutation."
      };
    }

    const run: AdminSyncRun = {
      id: `sync-${makeId()}`,
      brandSlug: target.brandSlug,
      brandName: target.brandName,
      runType: "manual",
      status: "running",
      fetchedCount: 0,
      normalizedCount: 0,
      changedCount: 0,
      startedAt: nowIso(),
      finishedAt: null,
      attempts: 0,
      errorSummary: null
    };
    this.runs.unshift(run);
    this.lastUpdatedAt = nowIso();

    try {
      const { result, attempts } = await retryWithBackoff(
        async () => {
          if (request.simulateFailure) {
            throw new RetryableManualSyncError("Simulated transient failure.");
          }
          return this.simulateCounts(target.brandSlug, false);
        },
        {
          policy: {
            maxAttempts: 3,
            initialDelayMs: 250,
            factor: 2,
            maxDelayMs: 2000,
            jitterRatio: 0.15
          },
          shouldRetry: async (error) => error instanceof RetryableManualSyncError
        }
      );

      run.status = "success";
      run.fetchedCount = result.fetchedCount;
      run.normalizedCount = result.normalizedCount;
      run.changedCount = result.changedCount;
      run.finishedAt = nowIso();
      run.errorSummary = null;
      run.attempts = attempts;

      this.pushRecentChange(target.brandSlug);
      this.lastUpdatedAt = nowIso();
      return {
        status: "success",
        attempts,
        syncRun: { ...run },
        message: "Manual sync completed."
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown manual sync error";
      run.status = "failed";
      run.finishedAt = nowIso();
      run.errorSummary = message;
      run.attempts = 3;

      this.errors.unshift({
        id: `error-${makeId()}`,
        syncRunId: run.id,
        brandSlug: target.brandSlug,
        errorType: "network",
        message,
        createdAt: nowIso(),
        detail: {
          retryPolicy: "maxAttempts=3, initialDelay=250ms, factor=2"
        }
      });

      this.lastUpdatedAt = nowIso();
      return {
        status: "failed",
        attempts: run.attempts,
        syncRun: { ...run },
        message
      };
    }
  }

  private simulateCounts(
    brandSlug: string,
    dryRun: boolean
  ): { fetchedCount: number; normalizedCount: number; changedCount: number } {
    const base = brandSlug === "steam" ? 12 : brandSlug === "oliveyoung" ? 4 : 5;
    const normalized = Math.max(1, base - 1);
    const changed = dryRun ? Math.max(1, Math.floor(normalized / 2)) : Math.max(1, normalized - 1);
    return {
      fetchedCount: base,
      normalizedCount: normalized,
      changedCount: changed
    };
  }

  private pushRecentChange(brandSlug: string): void {
    const change: AdminRecentChange = {
      saleEventExternalId: `${brandSlug}-${makeId()}`,
      brandSlug,
      title: `${brandSlug} manual sync update`,
      status: "active",
      discountLabel: "Updated",
      changedAt: nowIso()
    };
    this.recentChanges.unshift(change);
    if (this.recentChanges.length > 30) {
      this.recentChanges.splice(30);
    }
  }

  private pushRateLimitError(brandSlug: string, retryAfterMs: number): void {
    this.errors.unshift({
      id: `error-${makeId()}`,
      syncRunId: "rate-limit",
      brandSlug,
      errorType: "rate_limited",
      message: "Manual sync request blocked by rate limit.",
      createdAt: nowIso(),
      detail: {
        retryAfterMs
      }
    });
    if (this.errors.length > 50) {
      this.errors.splice(50);
    }
    this.lastUpdatedAt = nowIso();
  }
}

export const adminOpsRuntime = new AdminOpsRuntime();
