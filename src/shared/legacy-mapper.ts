import type { GcveRecord, Severity } from "./types";

/**
 * Legacy entry shape served by the four endpoints listed in the GCVE registry
 * for GNA-115 (/api/gcve/api, /api/gcve/dump, /api/gcve/pull-api, plus the
 * per-record payloads consumed by the previous site). Key names and their
 * order match the original implementation so existing consumers keep working.
 */
export type LegacyVulnerability = {
  cveId: string;
  title: string;
  severity: string;
  cvssScore: string;
  vulnerabilityType: string;
  datePublished: string;
  affectedSoftware: string;
  affectedVersions: string;
  description: string;
  technicalDetails: string;
  poc: string;
  credits: string;
  references: string;
  id: string;
};

export type LegacyMapperInput = {
  gcveId: string;
  cveId: string | null;
  title: string;
  severity: Severity;
  cvssScore: number | null;
  vulnerabilityType: string;
  vendor: string;
  product: string;
  affectedVersions: string;
  description: string;
  technicalDetails: string | null;
  poc: string | null;
  references: string[];
  reporterName: string;
  record: GcveRecord;
};

export function toLegacyVulnerability(input: LegacyMapperInput): LegacyVulnerability {
  const { cna } = input.record.containers;
  const datePublished = (cna.datePublic ?? input.record.cveMetadata.datePublished).slice(0, 10);

  return {
    cveId: input.cveId ?? input.gcveId,
    title: input.title,
    severity: input.severity.charAt(0).toUpperCase() + input.severity.slice(1),
    cvssScore: input.cvssScore === null ? "" : input.cvssScore.toFixed(1),
    vulnerabilityType: input.vulnerabilityType,
    datePublished,
    affectedSoftware: `${input.vendor} ${input.product}`,
    affectedVersions: input.affectedVersions,
    description: input.description,
    technicalDetails: input.technicalDetails ?? "",
    poc: input.poc ?? "",
    credits: input.reporterName,
    references: input.references.map((url) => `${url}\n`).join(""),
    id: input.gcveId,
  };
}
