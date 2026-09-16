import { sha256Hex } from "./http";

export const SESSION_COOKIE = "gnacve_session";
export const SESSION_TTL_SECONDS = 604800;

const bytesToBase64Url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const base64ToBytes = (value: string): Uint8Array =>
  Uint8Array.from(atob(value), (character) => character.charCodeAt(0));

const timingSafeEqual = (left: Uint8Array, right: Uint8Array): boolean => {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
};

/** Verifies a password against `pbkdf2_sha256$iterations$salt$hash`. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iterationsRaw, saltB64, hashB64] = stored.split("$");
  if (scheme !== "pbkdf2_sha256" || !iterationsRaw || !saltB64 || !hashB64) return false;

  const iterations = Number.parseInt(iterationsRaw, 10);
  if (!Number.isInteger(iterations) || iterations < 10000 || iterations > 1000000) return false;

  const expected = base64ToBytes(hashB64);
  if (expected.length === 0) return false;

  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const derived = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: base64ToBytes(saltB64), iterations, hash: "SHA-256" },
      key,
      expected.length * 8,
    ),
  );

  return timingSafeEqual(derived, expected);
}

export function createSessionToken(): string {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

export function sessionExpiry(now: Date): string {
  return new Date(now.getTime() + SESSION_TTL_SECONDS * 1000).toISOString();
}

export async function sessionIsValid(db: D1Database, token: string, now: Date): Promise<boolean> {
  const tokenHash = await sha256Hex(token);
  const row = await db
    .prepare("SELECT token_hash FROM sessions WHERE token_hash = ? AND expires_at > ?")
    .bind(tokenHash, now.toISOString())
    .first();
  return row !== null;
}
