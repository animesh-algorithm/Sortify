import { z } from "zod";

export type ApiErrorCode = "AUTH_REQUIRED" | "NOT_CONFIGURED" | "NOT_FOUND" | "INVALID_INPUT" | "CONFLICT" | "RATE_LIMITED" | "UPSTREAM_ERROR" | "STORAGE_ERROR";

export function apiError(code: ApiErrorCode, message: string, status = 400, details?: unknown) {
  return Response.json({ error: { code, message, details } }, { status });
}

export async function parseJson<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  return schema.parse(await request.json());
}

export function routeError(error: unknown) {
  if (error instanceof z.ZodError) return apiError("INVALID_INPUT", "The request could not be validated.", 400, error.flatten());
  const message = error instanceof Error ? error.message : "Unexpected error";
  console.error("Sortify route error", error);
  if (message.includes("D1") || message.includes("no such table")) return apiError("STORAGE_ERROR", "Sortify storage is unavailable. Try again after migrations finish.", 503);
  return apiError("UPSTREAM_ERROR", message, 502);
}

export function json<T>(value: T, init?: ResponseInit) { return Response.json(value, init); }
