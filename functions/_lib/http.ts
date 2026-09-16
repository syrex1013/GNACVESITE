import type { Context } from "hono";
import type { AppEnv } from "./env";

export const PUBLIC_CACHE = "public, max-age=300";
export const PUBLICATION_CACHE = "public, max-age=60";

/** Machine readable endpoints are open to the ecosystem and cached at the edge. */
export function machineHeaders(c: Context<AppEnv>, cache: string = PUBLIC_CACHE): void {
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Cache-Control", cache);
  c.header("Vary", "Accept-Encoding");
}

export function integerParam(value: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

export function hourWindow(now: Date): string {
  return new Date(Math.floor(now.getTime() / 3600000) * 3600000).toISOString();
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Fixed window counter. Returns false when the caller has exceeded the limit
 * for the current window. Old windows are pruned opportunistically.
 */
export async function consumeRateLimit(
  db: D1Database,
  bucket: string,
  limit: number,
  now: Date,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const windowStart = hourWindow(now);
  const key = await sha256Hex(bucket);

  const row = await db
    .prepare(
      "INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, 1) " +
        "ON CONFLICT (key, window_start) DO UPDATE SET count = count + 1 RETURNING count",
    )
    .bind(key, windowStart)
    .first<{ count: number }>();

  await db
    .prepare("DELETE FROM rate_limits WHERE window_start < ?")
    .bind(new Date(now.getTime() - 172800000).toISOString())
    .run();

  const count = Number(row?.count ?? 1);
  const windowEnd = new Date(Date.parse(windowStart) + 3600000);

  return {
    allowed: count <= limit,
    retryAfterSeconds: Math.max(1, Math.ceil((windowEnd.getTime() - now.getTime()) / 1000)),
  };
}

export function clientIp(c: Context<AppEnv>): string {
  return c.req.header("CF-Connecting-IP") ?? c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() ?? "unknown";
}

export function requestOriginAllowed(c: Context<AppEnv>): boolean {
  const host = c.req.header("Host");
  if (!host) return false;
  const origin = c.req.header("Origin") ?? c.req.header("Referer");
  if (!origin) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
