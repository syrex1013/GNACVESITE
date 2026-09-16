import Ajv2020 from "ajv/dist/2020";
import { describe, expect, it } from "vitest";
import { buildGcveRecord } from "../src/shared/record-builder";
import type { GcveRecord, SubmissionRecordInput } from "../src/shared/types";
import bcp05Schema from "./fixtures/gcve-bcp-05.schema.json";

const ajv = new Ajv2020({ strict: false, allErrors: true });
ajv.addSchema(bcp05Schema, "bcp05");
const validateRecord = ajv.compile({ $ref: "bcp05#/$defs/CVERecord" });
const validateExtension = ajv.compile({ $ref: "bcp05#/$defs/GCVEExtension" });

const PUBLISHED_AT = "2026-09-16T00:00:00.000Z";

const baseInput: SubmissionRecordInput = {
  title: "goform/setReset on Orange AirBox",
  vulnerabilityType: "Authorization Bypass",
  vendor: "orange",
  product: "airbox_firmware",
  affectedVersions: "Y858_FL_01.16_04",
  cveId: null,
  cweIds: null,
  cvssScore: null,
  cvssVector: null,
  description: "goform/setReset allows an unauthenticated attacker to reset the router to factory settings.",
  technicalDetails: "The goform/setReset endpoint does not enforce authentication.",
  poc: null,
  references: [],
  reporterName: 'Adrian "syrex1013" Dacka',
  datePublic: null,
};

const build = (overrides: Partial<SubmissionRecordInput> = {}): GcveRecord =>
  buildGcveRecord({ ...baseInput, ...overrides }, "GCVE-115-2026-00001", PUBLISHED_AT);

describe("buildGcveRecord", () => {
  it("emits a record and extension accepted by the official BCP-05 schema", () => {
    const record = build();

    expect(validateRecord(record)).toBe(true);
    expect(validateExtension(record.containers.cna.x_gcve[0])).toBe(true);
    expect(record.containers.cna.x_gcve).toHaveLength(1);
    expect(record.containers.cna.x_gcve[0]).toMatchObject({
      vulnId: "GCVE-115-2026-00001",
      recordType: "advisory",
    });
    expect(record.cveMetadata).toMatchObject({ vulnId: "GCVE-115-2026-00001", state: "PUBLISHED" });
  });

  it("omits sections for information that was not provided", () => {
    const cna = build().containers.cna;

    expect(cna.problemTypes).toBeUndefined();
    expect(cna.metrics).toBeUndefined();
    expect(cna.exploits).toBeUndefined();
    expect(cna.references).toBeUndefined();
    expect(cna.x_gcve[0]?.relationships).toBeUndefined();
    expect(cna.datePublic).toBeUndefined();
  });

  it("links an existing CVE identifier as an equal relationship", () => {
    const record = build({ cveId: "CVE-2018-18375" });

    expect(record.containers.cna.x_gcve[0]?.relationships).toEqual([
      { destId: "CVE-2018-18375", type: "equal" },
    ]);
    expect(record.cveMetadata.cveId).toBe("CVE-2018-18375");
    expect(validateRecord(record)).toBe(true);
  });

  it("carries weaknesses, proof of concept, references, and the public date", () => {
    const record = build({
      cweIds: "CWE-862 CWE-306",
      poc: "curl http://192.168.1.1/goform/setReset",
      references: ["https://example.com/advisory"],
      datePublic: "2018-10-15",
    });
    const cna = record.containers.cna;

    expect(cna.problemTypes?.[0]?.descriptions.map((entry) => entry.cweId)).toEqual(["CWE-862", "CWE-306"]);
    expect(cna.exploits?.[0]?.value).toContain("goform/setReset");
    expect(cna.references).toEqual([{ url: "https://example.com/advisory" }]);
    expect(cna.datePublic).toBe("2018-10-15");
    expect(cna.descriptions[0]?.value).toContain("Technical details:");
  });

  it("emits a CVSS 3.1 metric when a 3.1 vector is supplied", () => {
    const record = build({ cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H", cvssScore: 9.8 });

    expect(record.containers.cna.metrics).toEqual([
      {
        format: "CVSS",
        cvssV3_1: {
          version: "3.1",
          vectorString: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
          baseScore: 9.8,
          baseSeverity: "CRITICAL",
        },
      },
    ]);
  });

  it("emits a CVSS 4.0 metric for 4.0 vectors", () => {
    const record = build({ cvssVector: "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H", cvssScore: 8.7 });

    expect(record.containers.cna.metrics?.[0]?.cvssV4_0).toMatchObject({ version: "4.0", baseSeverity: "HIGH" });
  });

  it("never claims CVE Services organization identifiers", () => {
    const record = build();
    const serialized = JSON.stringify(record);

    expect(serialized).not.toContain("providerMetadata");
    expect(serialized).not.toContain("assignerOrgId");
    expect(serialized).not.toContain("shortName");
  });

  it("carries published, updated, and reserved lifecycle dates", () => {
    const record = buildGcveRecord({ ...baseInput }, "GCVE-115-2026-00001", PUBLISHED_AT, PUBLISHED_AT);

    expect(record.cveMetadata).toMatchObject({
      datePublished: PUBLISHED_AT,
      dateUpdated: PUBLISHED_AT,
      dateReserved: PUBLISHED_AT,
    });
    expect(validateRecord(record)).toBe(true);
  });
});
