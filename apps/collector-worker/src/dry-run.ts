import { createCollectorWorker } from "./index";

type RunType = "scheduled" | "manual" | "retry";

interface DryRunCliOptions {
  brandSlug: string;
  brandId: string;
  sourceId: string;
  runType: RunType;
  sampleSize: number;
  metadata: Record<string, unknown> | undefined;
}

const DEFAULT_OPTIONS: DryRunCliOptions = {
  brandSlug: "steam",
  brandId: "00000000-0000-0000-0000-000000000105",
  sourceId: "00000000-0000-0000-0000-000000000205",
  runType: "manual",
  sampleSize: 5,
  metadata: undefined
};

const readFlagValue = (args: string[], flagName: string): string | undefined => {
  const index = args.findIndex((item) => item === `--${flagName}`);
  if (index < 0) {
    return undefined;
  }
  return args[index + 1];
};

const parseRunType = (value: string | undefined): RunType => {
  if (value === "scheduled" || value === "manual" || value === "retry") {
    return value;
  }
  return DEFAULT_OPTIONS.runType;
};

const parseSampleSize = (value: string | undefined): number => {
  if (!value) {
    return DEFAULT_OPTIONS.sampleSize;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_OPTIONS.sampleSize;
  }
  return Math.trunc(parsed);
};

const parseMetadata = (value: string | undefined): Record<string, unknown> | undefined => {
  if (!value) {
    return undefined;
  }
  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("--metadataJson must be a JSON object string.");
  }
  return parsed as Record<string, unknown>;
};

const parseArgs = (args: string[]): DryRunCliOptions => ({
  brandSlug: readFlagValue(args, "brandSlug") ?? DEFAULT_OPTIONS.brandSlug,
  brandId: readFlagValue(args, "brandId") ?? DEFAULT_OPTIONS.brandId,
  sourceId: readFlagValue(args, "sourceId") ?? DEFAULT_OPTIONS.sourceId,
  runType: parseRunType(readFlagValue(args, "runType")),
  sampleSize: parseSampleSize(readFlagValue(args, "sampleSize")),
  metadata: parseMetadata(readFlagValue(args, "metadataJson"))
});

const main = async (): Promise<void> => {
  const options = parseArgs(process.argv.slice(2));
  const worker = createCollectorWorker();
  const request = {
    brandSlug: options.brandSlug,
    brandId: options.brandId,
    sourceId: options.sourceId,
    runType: options.runType,
    sampleSize: options.sampleSize,
    now: new Date(),
    ...(options.metadata !== undefined ? { metadata: options.metadata } : {})
  };
  const result = await worker.runSingleDryRun(request);

  console.log(
    JSON.stringify(
      {
        mode: "dry-run",
        options,
        result
      },
      null,
      2
    )
  );

  if (result.status !== "success") {
    process.exitCode = 1;
  }
};

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown dry-run CLI error";
  console.error(`[collector-worker dry-run] ${message}`);
  process.exitCode = 1;
});
