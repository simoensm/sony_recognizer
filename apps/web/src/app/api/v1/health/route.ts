/**
 * Health check: GET /api/v1/health
 * Reports whether the app can reach its backends. Used by humans during
 * setup ("is my stack running?") and later by uptime monitoring.
 */
import { NextResponse } from "next/server";
import { prisma } from "@sr/db";

// Never pre-render or cache this route — it must hit the DB every call.
export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, "ok" | "error"> = {};

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  const healthy = Object.values(checks).every((v) => v === "ok");
  return NextResponse.json(
    { status: healthy ? "ok" : "degraded", checks },
    { status: healthy ? 200 : 503 },
  );
}
