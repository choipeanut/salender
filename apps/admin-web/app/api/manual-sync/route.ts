import { NextRequest, NextResponse } from "next/server";

import { adminOpsRuntime } from "../../../src/admin-ops-runtime";

interface ManualSyncBody {
  brandSlug?: unknown;
  dryRun?: unknown;
  simulateFailure?: unknown;
}

const parseBoolean = (value: unknown): boolean | undefined => {
  if (value === true || value === false) {
    return value;
  }
  return undefined;
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: ManualSyncBody;
  try {
    body = (await request.json()) as ManualSyncBody;
  } catch (_error) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_request",
          message: "Body must be valid JSON."
        }
      },
      { status: 400 }
    );
  }

  if (typeof body.brandSlug !== "string" || body.brandSlug.trim() === "") {
    return NextResponse.json(
      {
        error: {
          code: "invalid_request",
          message: "brandSlug is required."
        }
      },
      { status: 400 }
    );
  }

  const result = await adminOpsRuntime.runManualSync({
    brandSlug: body.brandSlug,
    ...(parseBoolean(body.dryRun) !== undefined ? { dryRun: parseBoolean(body.dryRun) } : {}),
    ...(parseBoolean(body.simulateFailure) !== undefined
      ? { simulateFailure: parseBoolean(body.simulateFailure) }
      : {})
  });

  if (result.status === "rate_limited") {
    return NextResponse.json(result, { status: 429 });
  }
  if (result.status === "failed") {
    return NextResponse.json(result, { status: 500 });
  }
  return NextResponse.json(result, { status: 200 });
}
