import { describe, expect, it } from "vitest";
import { toLegacyVulnerability } from "../src/shared/legacy-mapper";
import { buildGcveRecord } from "../src/shared/record-builder";

const RECORD_KEYS = [
  "cveId",
  "title",
  "severity",
  "cvssScore",
  "vulnerabilityType",
  "datePublished",
  "affectedSoftware",
  "affectedVersions",
  "description",
  "technicalDetails",
  "poc",
  "credits",
  "references",
  "id",
];

const record = buildGcveRecord(
  {
    title: "goform/setReset on Orange AirBox ",
    vulnerabilityType: "Authorization Bypass",
    vendor: "orange",
    product: "airbox_firmware",
    affectedVersions: "Y858_FL_01.16_04",
    cveId: "CVE-2018-18377",
    cweIds: "CWE-862",
    cvssScore: 7.5,
    cvssVector: null,
    description: "goform/setReset on Orange AirBox allows attackers to reset a router to factory settings.",
    technicalDetails: "Missing authorization (CWE-862) on the reset endpoint.",
    poc: "curl http://192.168.1.1/goform/setReset",
    references: ["https://github.com/remix30303/AirBoxDoom"],
    reporterName: 'Adrian "syrex1013" Dacka',
    datePublic: "2018-10-15",
  },
  "GCVE-115-2026-00003",
  "2026-09-16T00:00:00.000Z",
);

describe("toLegacyVulnerability", () => {
  it("keeps the key set and key order of the previous site", () => {
    const legacy = toLegacyVulnerability({
      gcveId: "GCVE-115-2026-00003",
      cveId: "CVE-2018-18377",
      title: "goform/setReset on Orange AirBox ",
      severity: "high",
      cvssScore: 7.5,
      vulnerabilityType: "Authorization Bypass",
      vendor: "orange",
      product: "airbox_firmware",
      affectedVersions: "Y858_FL_01.16_04",
      description: "goform/setReset on Orange AirBox allows attackers to reset a router to factory settings.",
      technicalDetails: "Missing authorization (CWE-862) on the reset endpoint.",
      poc: "curl http://192.168.1.1/goform/setReset",
      references: ["https://github.com/remix30303/AirBoxDoom"],
      reporterName: 'Adrian "syrex1013" Dacka',
      record,
    });

    expect(Object.keys(legacy)).toEqual(RECORD_KEYS);
    expect(legacy).toEqual({
      cveId: "CVE-2018-18377",
      title: "goform/setReset on Orange AirBox ",
      severity: "High",
      cvssScore: "7.5",
      vulnerabilityType: "Authorization Bypass",
      datePublished: "2018-10-15",
      affectedSoftware: "orange airbox_firmware",
      affectedVersions: "Y858_FL_01.16_04",
      description: "goform/setReset on Orange AirBox allows attackers to reset a router to factory settings.",
      technicalDetails: "Missing authorization (CWE-862) on the reset endpoint.",
      poc: "curl http://192.168.1.1/goform/setReset",
      credits: 'Adrian "syrex1013" Dacka',
      references: "https://github.com/remix30303/AirBoxDoom\n",
      id: "GCVE-115-2026-00003",
    });
  });

  it("falls back to the GCVE identifier and empty optional text", () => {
    const gcveOnly = buildGcveRecord(
      {
        title: "Unpatched SSRF in example product",
        vulnerabilityType: "Information Disclosure",
        vendor: "example",
        product: "server",
        affectedVersions: "1.0",
        cveId: null,
        cweIds: null,
        cvssScore: null,
        cvssVector: null,
        description: "The export endpoint follows attacker controlled URLs without validating the destination host.",
        technicalDetails: null,
        poc: null,
        references: [],
        reporterName: "Reporter",
        datePublic: null,
      },
      "GCVE-115-2026-00010",
      "2026-09-16T00:00:00.000Z",
    );

    const legacy = toLegacyVulnerability({
      gcveId: "GCVE-115-2026-00010",
      cveId: null,
      title: "Unpatched SSRF in example product",
      severity: "medium",
      cvssScore: null,
      vulnerabilityType: "Information Disclosure",
      vendor: "example",
      product: "server",
      affectedVersions: "1.0",
      description: "The export endpoint follows attacker controlled URLs without validating the destination host.",
      technicalDetails: null,
      poc: null,
      references: [],
      reporterName: "Reporter",
      record: gcveOnly,
    });

    expect(legacy.cveId).toBe("GCVE-115-2026-00010");
    expect(legacy.cvssScore).toBe("");
    expect(legacy.technicalDetails).toBe("");
    expect(legacy.poc).toBe("");
    expect(legacy.references).toBe("");
    expect(legacy.datePublished).toBe("2026-09-16");
  });
});
