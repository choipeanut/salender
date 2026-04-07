import {
  runCollectorDryRun,
  createDefaultConnectorRegistry,
  InMemoryCollectorStore,
  runCollectorSync,
  runScheduledJobs,
  type CollectorDryRunResult,
  type CollectorSyncResult,
  type InMemoryCollectorStoreState,
  type ScheduledSyncJob
} from "@salecalendar/brand-connectors";

export interface CollectorWorkerDependencies {
  store: InMemoryCollectorStore;
}

export class CollectorWorker {
  private readonly registry = createDefaultConnectorRegistry();
  private readonly store: InMemoryCollectorStore;

  constructor(dependencies?: Partial<CollectorWorkerDependencies>) {
    this.store = dependencies?.store ?? new InMemoryCollectorStore();
  }

  async runSingle(input: {
    brandSlug: string;
    brandId: string;
    sourceId: string;
    runType: "scheduled" | "manual" | "retry";
    now?: Date;
    metadata?: Record<string, unknown>;
  }): Promise<CollectorSyncResult> {
    const connector = this.registry.getOrThrow(input.brandSlug);
    return runCollectorSync({
      connector,
      store: this.store,
      config: {
        brandId: input.brandId,
        sourceId: input.sourceId,
        runType: input.runType,
        now: input.now ?? new Date(),
        metadata: input.metadata
      }
    });
  }

  async runSingleDryRun(input: {
    brandSlug: string;
    brandId: string;
    sourceId: string;
    runType: "scheduled" | "manual" | "retry";
    now?: Date;
    metadata?: Record<string, unknown>;
    sampleSize?: number;
  }): Promise<CollectorDryRunResult> {
    const connector = this.registry.getOrThrow(input.brandSlug);
    const config = {
      brandId: input.brandId,
      sourceId: input.sourceId,
      runType: input.runType,
      now: input.now ?? new Date(),
      ...(input.metadata !== undefined ? { metadata: input.metadata } : {})
    };

    return runCollectorDryRun({
      connector,
      store: this.store,
      config,
      ...(input.sampleSize !== undefined ? { sampleSize: input.sampleSize } : {})
    });
  }

  async runBatch(input: { jobs: ScheduledSyncJob[]; now?: Date }): Promise<CollectorSyncResult[]> {
    return runScheduledJobs({
      jobs: input.jobs,
      registry: this.registry,
      store: this.store,
      now: input.now ?? new Date()
    });
  }

  getDebugState(): InMemoryCollectorStoreState {
    return this.store.getDebugState();
  }
}

export const createCollectorWorker = (): CollectorWorker => new CollectorWorker();
