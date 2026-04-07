import { NextResponse } from "next/server";

import { adminOpsRuntime } from "../../../src/admin-ops-runtime";

export async function POST(): Promise<NextResponse> {
  adminOpsRuntime.reset();
  return NextResponse.json(
    {
      status: "ok"
    },
    { status: 200 }
  );
}
