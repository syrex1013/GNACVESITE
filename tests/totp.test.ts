import { describe, expect, it } from "vitest";
import { base32Decode, base32Encode, generateTotpSecret, otpauthUri, totpAt, verifyTotp } from "../functions/_lib/totp";

const textBytes = (value: string): Uint8Array => new TextEncoder().encode(value);

describe("base32", () => {
  it("round-trips bytes", () => {
    const bytes = new Uint8Array([0x00, 0x01, 0x02, 0xff, 0x10, 0x83]);
    expect(base32Decode(base32Encode(bytes))).toEqual(bytes);
  });

  it("rejects non-alphabet input", () => {
    expect(base32Decode("abc1")).toBeNull();
  });
});

describe("totpAt", () => {
  // RFC 6238, SHA-1 secret "12345678901234567890", T = 59 s → 94287082 (8-digit); 6-digit value 287082.
  it("reproduces the RFC 6238 SHA-1 vector", async () => {
    const code = await totpAt(textBytes("12345678901234567890"), 59);
    expect(code).toBe("287082");
  });

  it("produces a stable code within a 30 s step", async () => {
    const secret = textBytes("12345678901234567890");
    expect(await totpAt(secret, 35)).toBe(await totpAt(secret, 59));
    expect(await totpAt(secret, 35)).not.toBe(await totpAt(secret, 60));
  });
});

describe("verifyTotp", () => {
  it("accepts the current and adjacent-step codes, rejects old ones", async () => {
    const secret = textBytes("12345678901234567890");
    const current = await totpAt(secret, 1000);
    const next = await totpAt(secret, 1030);
    const stale = await totpAt(secret, 940);

    expect(await verifyTotp(base32Encode(secret), current, 1000)).toBe(true);
    expect(await verifyTotp(base32Encode(secret), next, 1000)).toBe(true);
    expect(await verifyTotp(base32Encode(secret), stale, 1000)).toBe(false);
    expect(await verifyTotp(base32Encode(secret), "28708a", 1000)).toBe(false);
    expect(await verifyTotp("", "287082", 1000)).toBe(false);
  });
});

describe("enrollment", () => {
  it("generates 160-bit secrets that decode cleanly", () => {
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(base32Decode(secret)).toHaveLength(20);
  });

  it("builds an otpauth URI with the secret", () => {
    const uri = otpauthUri("JBSWY3DPEHPK3PXP", "admin@example.com");
    expect(uri).toContain("secret=JBSWY3DPEHPK3PXP");
    expect(uri).toContain("issuer=GNA-115");
    expect(uri).toContain("GNA-115%3Aadmin%40example.com");
  });
});
