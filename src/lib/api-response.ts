/**
 * Centralized API response helpers. Typed, consistent error shapes.
 */

import { NextResponse } from "next/server";

export type ApiErrorBody = { error: string; details?: unknown };

export function jsonOk<T>(data: T, init?: ResponseInit): NextResponse<T> {
  return NextResponse.json(data, { status: 200, ...init });
}

export function jsonError(error: string, status: number, details?: unknown): NextResponse<ApiErrorBody> {
  const body: ApiErrorBody = { error };
  if (details != null) body.details = details;
  return NextResponse.json(body, { status });
}

export function json400(error: string, details?: unknown): NextResponse<ApiErrorBody> {
  return jsonError(error, 400, details);
}

export function json401(error: string = "Unauthorized"): NextResponse<ApiErrorBody> {
  return jsonError(error, 401);
}

export function json404(error: string = "Not found"): NextResponse<ApiErrorBody> {
  return jsonError(error, 404);
}

export function json409(error: string = "Conflict"): NextResponse<ApiErrorBody> {
  return jsonError(error, 409);
}

export function json429(error: string, retryAfter?: number): NextResponse<ApiErrorBody> {
  const res = NextResponse.json({ error }, { status: 429 });
  if (retryAfter != null) res.headers.set("Retry-After", String(retryAfter));
  return res;
}
