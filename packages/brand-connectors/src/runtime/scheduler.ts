import type { CollectorSyncResult } from "../sdk/types";
import type { ConnectorRegistry } from "../connectors/registry";
import type { CollectorStore } from "./collector-store";
import { runCollectorSync } from "./collector-runtime";

export interface ScheduledSyncJob {
  brandSlug: string;
  brandId: string;
  sourceId: string;
  runType: "scheduled" | "manual" | "retry";
  metadata?: Record<string, unknown> | undefined;
}

export const runScheduledJobs = async (params: {
  jobs: ScheduledSyncJob[];
  registry: ConnectorRegistry;
  store: CollectorStore;
  now: Date;
}): Promise<CollectorSyncResult[]> => {
  const results: CollectorSyncResult[] = [];

  for (const job of params.jobs) {
    const connector = params.registry.getOrThrow(job.brandSlug);
    const result = await runCollectorSync({
      connector,
      store: params.store,
      config: {
        brandId: job.brandId,
        sourceId: job.sourceId,
        runType: job.runType,
        now: params.now,
        metadata: job.metadata
      }
    });
    results.push(result);
  }

  return results;
};
