import { getAuthenticatedUser } from "@/lib/auth";
import { checkRateLimit, RATE_LIMIT_ERROR } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { parsePatchTemplateBody } from "@/lib/validation";
import { jsonOk, json400, json401, json404, json429 } from "@/lib/api-response";

type RouteContext = { params: Promise<{ id: string }> };

/** PATCH /api/templates/[id] - update template. Body: { name?, body? } */
export async function PATCH(request: Request, context: RouteContext) {
  const auth = await getAuthenticatedUser();
  if ("reason" in auth) {
    if (auth.reason === "unauthorized") return json401();
    return json404("User not found");
  }
  const rl = await checkRateLimit(auth.user.email, true);
  if (!rl.allowed) {
    return json429(RATE_LIMIT_ERROR, rl.retryAfter);
  }

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json400("Invalid JSON");
  }
  const parsed = parsePatchTemplateBody(body);
  if (!parsed.success) {
    return json400(parsed.error);
  }

  const existing = await prisma.userTemplate.findFirst({
    where: { id, userId: auth.user.id },
  });
  if (!existing) return json404("Template not found");

  const updateData: { name?: string; body?: string } = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.body !== undefined) updateData.body = parsed.data.body;

  const template = await prisma.userTemplate.update({
    where: { id },
    data: updateData,
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

/** DELETE /api/templates/[id] */
export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await getAuthenticatedUser();
  if ("reason" in auth) {
    if (auth.reason === "unauthorized") return json401();
    return json404("User not found");
  }
  const rl = await checkRateLimit(auth.user.email, true);
  if (!rl.allowed) {
    return json429(RATE_LIMIT_ERROR, rl.retryAfter);
  }

  const { id } = await context.params;
  const existing = await prisma.userTemplate.findFirst({
    where: { id, userId: auth.user.id },
  });
  if (!existing) return json404("Template not found");

  await prisma.userTemplate.delete({ where: { id } });
  return jsonOk({ deleted: true });
}
