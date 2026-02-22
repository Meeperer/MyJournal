import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { checkRateLimit, RATE_LIMIT_ERROR } from "@/lib/rate-limit";
import { json400, json409, json429, jsonError, jsonOk } from "@/lib/api-response";
import { parseRegisterBody } from "@/lib/validation";

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const identifier = getClientIp(request);
  const rl = await checkRateLimit(identifier, false);
  if (!rl.allowed) {
    return json429(RATE_LIMIT_ERROR, rl.retryAfter);
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json400("Invalid JSON");
    }

    const parsed = parseRegisterBody(body);
    if (!parsed.success) {
      return json400(parsed.error, parsed.details);
    }

    const { email, password } = parsed.data;

    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return json409("An account with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        email,
        passwordHash,
      },
    });

    return jsonOk({ ok: true }, { status: 201 });
  } catch (error) {
    logger.error("Register error", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonError("Something went wrong while creating the account.", 500);
  }
}
