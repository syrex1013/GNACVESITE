import { describe, expect, it } from "vitest";
import { adminLoginSchema, statusUpdateSchema, submissionCreateSchema } from "../src/shared/schemas";

const validPayload = {
  reporter_name: "Adrian Dacka",
  reporter_email: "adrian@example.com",
  reporter_org: "Independent",
  title: "Unauthenticated device reset on Orange AirBox",
  vulnerability_type: "Authorization Bypass",
  vendor: "orange",
  product: "airbox_firmware",
  affected_versions: "Y858_FL_01.16_04",
  severity: "high",
  cvss_score: 7.5,
  cvss_vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:H/A:N",
  cve_id: "CVE-2018-18377",
  cwe_ids: "cwe-862, CWE-306",
  description:
    "The goform/setReset endpoint does not require authentication, so any host on the network can reset the device to factory settings and sign in with the default credentials.",
  technical_details: "The endpoint is reachable before authentication on the LAN interface.",
  poc: "curl http://192.168.1.1/goform/setReset",
  references: ["https://example.com/advisory"],
  reporter_note: "Coordinating with the vendor since August.",
  consent: true,
  turnstile_token: "token",
};

describe("submissionCreateSchema", () => {
  it("accepts a complete report and normalizes weaknesses", () => {
    const parsed = submissionCreateSchema.parse(validPayload);

    expect(parsed.cwe_ids).toBe("CWE-862 CWE-306");
    expect(parsed.cvss_score).toBe(7.5);
    expect(parsed.reporter_org).toBe("Independent");
  });

  it("accepts the minimal report and drops empty optional fields", () => {
    const parsed = submissionCreateSchema.parse({
      reporter_name: "Researcher",
      reporter_email: "researcher@example.com",
      reporter_org: "",
      title: "Reflected cross site scripting in search",
      vulnerability_type: "Cross-Site Scripting (XSS)",
      vendor: "example",
      product: "portal",
      affected_versions: "2.3.1",
      severity: "medium",
      cvss_score: "",
      cvss_vector: "",
      cve_id: "",
      cwe_ids: "",
      description:
        "The search parameter is reflected into the response without encoding, which allows script execution in the context of the affected site.",
      technical_details: "",
      poc: "",
      references: [],
      reporter_note: "",
      consent: true,
    });

    expect(parsed.reporter_org).toBeUndefined();
    expect(parsed.cvss_score).toBeUndefined();
    expect(parsed.cvss_vector).toBeUndefined();
    expect(parsed.cve_id).toBeUndefined();
    expect(parsed.cwe_ids).toBeUndefined();
    expect(parsed.references).toEqual([]);
  });

  it("rejects reports that would not produce a usable record", () => {
    const cases: Record<string, Record<string, unknown>> = {
      "invalid email": { reporter_email: "not-an-email" },
      "short description": { description: "Too short." },
      "malformed CVE": { cve_id: "CVE-18-18377" },
      "vector without score": { cvss_score: "", cvss_vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:H/A:N" },
      "unversioned CVSS vector": { cvss_vector: "AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:H/A:N", cvss_score: 7.5 },
      "too many weaknesses": { cwe_ids: "CWE-1 CWE-2 CWE-3 CWE-4 CWE-5 CWE-6" },
      "unknown weakness format": { cwe_ids: "CVE-2018-18377" },
      "too many references": { references: Array.from({ length: 11 }, (_, index) => `https://example.com/${index}`) },
      "non http reference": { references: ["javascript:alert(1)"] },
      "consent missing": { consent: false },
      "unknown vulnerability type": { vulnerability_type: "Wizardry" },
    };

    for (const [label, override] of Object.entries(cases)) {
      const result = submissionCreateSchema.safeParse({ ...validPayload, ...override });
      expect(result.success, label).toBe(false);
    }
  });
});

describe("statusUpdateSchema", () => {
  it("allows the review states and refuses to publish through PATCH", () => {
    expect(statusUpdateSchema.safeParse({ status: "queued" }).success).toBe(true);
    expect(statusUpdateSchema.safeParse({ status: "in_review" }).success).toBe(true);
    expect(statusUpdateSchema.safeParse({ status: "published" }).success).toBe(false);
  });
});

describe("adminLoginSchema", () => {
  it("requires a password", () => {
    expect(adminLoginSchema.safeParse({ password: "hunter2" }).success).toBe(true);
    expect(adminLoginSchema.safeParse({ password: "" }).success).toBe(false);
  });
});
