import { getAuthenticatedUser } from "@/lib/auth";
import { checkRateLimit, RATE_LIMIT_ERROR } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { parsePostTemplateBody } from "@/lib/validation";
import { jsonOk, json400, json401, json404, json429 } from "@/lib/api-response";

/** GET /api/templates - list current user's templates */
export async function GET() {
  const auth = await getAuthenticatedUser();
  if ("reason" in auth) {
    if (auth.reason === "unauthorized") return json401();
    return json404("User not found");
  }
  const rl = await checkRateLimit(auth.user.email, true);
  if (!rl.allowed) {
    return json429(RATE_LIMIT_ERROR, rl.retryAfter);
  }

  const templates = await prisma.userTemplate.findMany({
    where: { userId: auth.user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, body: true, createdAt: true, updatedAt: true },
  });
  return jsonOk(
    templates.map((t) => ({
      id: t.id,
      name: t.name,
      body: t.body,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }))
  );
}

/** POST /api/templates - create template. Body: { name, body } */
export async function POST(request: Request) {
  const auth = await getAuthenticatedUser();
  if ("reason" in auth) {
    if (auth.reason === "unauthorized") return json401();
    return json404("User not found");
  }
  const rl = await checkRateLimit(auth.user.email, true);
  if (!rl.allowed) {
    return json429(RATE_LIMIT_ERROR, rl.retryAfter);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json400("Invalid JSON");
  }
  const parsed = parsePostTemplateBody(body);
  if (!parsed.success) {
    return json400(parsed.error);
  }
  const { name, body: templateBody } = parsed.data;

  const template = await prisma.userTemplate.create({
    data: { userId: auth.user.id, name, body: templateBody },
    select: { id: true, name: true, body: true, createdAt: true, updatedAt: true },
  });
  return jsonOk({
    id: template.id,
    name: template.name,
    body: template.body,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  });
}
