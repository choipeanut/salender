import { NextResponse } from "next/server";

import { adminOpsRuntime } from "../../../src/admin-ops-runtime";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(adminOpsRuntime.getDashboard(), {
    status: 200
  });
}
