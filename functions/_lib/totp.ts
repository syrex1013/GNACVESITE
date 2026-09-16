/**
 * RFC 6238 TOTP verification with HMAC-SHA-1 (WebCrypto), RFC 4648 base32
 * encoding, and an otpauth:// URI builder for authenticator enrollment.
 */

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** 160-bit secret: 20 random bytes, base32 without padding. */
export function generateTotpSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return base32Encode(bytes);
}

export function base32Encode(bytes: Uint8Array): string {
  let output = "";
  let bits = 0;
  let buffer = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(buffer >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(buffer << (5 - bits)) & 31];
  }
  return output;
}

export function base32Decode(value: string): Uint8Array | null {
  const clean = value.replace(/=+$/, "").toUpperCase();
  if (clean.length === 0) return null;
  let bits = 0;
  let buffer = 0;
  const bytes: number[] = [];
  for (const character of clean) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index === -1) return null;
    buffer = (buffer << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((buffer >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(bytes);
}

/** Six-digit TOTP value for a counter derived from `time` (seconds). */
export async function totpAt(secret: Uint8Array, time: number): Promise<string> {
  let counter = Math.floor(time / 30);
  const message = new Uint8Array(8);
  for (let index = 7; index >= 0; index -= 1) {
    message[index] = counter & 255;
    counter = Math.floor(counter / 256);
  }

  const key = await crypto.subtle.importKey("raw", new Uint8Array(secret), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, message));
  const offset = (digest[digest.length - 1] ?? 0) & 0x0f;
  const byteAt = (index: number): number => digest[index] ?? 0;
  const binary = ((byteAt(offset) & 0x7f) << 24) | ((byteAt(offset + 1) & 0xff) << 16) | ((byteAt(offset + 2) & 0xff) << 8) | (byteAt(offset + 3) & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

/** Accepts the current code plus one step in either direction for clock drift. */
export async function verifyTotp(
  secretBase32: string,
  code: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  if (!/^\d{6}$/.test(code)) return false;
  const secret = base32Decode(secretBase32);
  if (!secret || secret.length < 10) return false;

  for (let step = -1; step <= 1; step += 1) {
    const candidate = await totpAt(secret, nowSeconds + step * 30);
    if (candidate === code) return true;
  }
  return false;
}

/** Standard enrollment URI; most authenticator apps also accept manual entry. */
export function otpauthUri(secret: string, account: string, issuer = "GNA-115"): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}
