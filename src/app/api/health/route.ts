import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * GET /api/health - Liveness/readiness for monitoring (e.g. UptimeRobot).
 * Returns 200 with { ok: true, db: "ok" } when app and DB are reachable.
 * Returns 503 if DB check fails. No secrets in response.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, db: "ok" }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, db: "error" }, { status: 503 });
  }
}
