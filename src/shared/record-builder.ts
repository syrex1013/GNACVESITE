import type { CvssBlock, GcveRecord, SubmissionRecordInput } from "./types";

/** CVSS v3.1 and v4.0 share the same qualitative severity bands. */
const baseSeverityFromScore = (score: number): string => {
  if (score <= 0) return "NONE";
  if (score < 4) return "LOW";
  if (score < 7) return "MEDIUM";
  if (score < 9) return "HIGH";
  return "CRITICAL";
};

const metricForVector = (
  vector: string,
  score: number | null,
): { key: "cvssV3_1" | "cvssV4_0"; block: CvssBlock } => {
  const isV4 = vector.startsWith("CVSS:4");
  const block: CvssBlock = {
    version: isV4 ? "4.0" : "3.1",
    vectorString: vector,
    ...(score === null ? {} : { baseScore: score, baseSeverity: baseSeverityFromScore(score) }),
  };
  return { key: isV4 ? "cvssV4_0" : "cvssV3_1", block };
};

/**
 * Builds a GCVE BCP-05 record: CVE Record Format v5 container with the
 * `x_gcve` extension attached inside `containers.cna` (as in the reference
 * implementation). Optional sections are omitted rather than emitted empty.
 */
export function buildGcveRecord(
  input: SubmissionRecordInput,
  gcveId: string,
  publishedAtIso: string,
  updatedAtIso: string = publishedAtIso,
): GcveRecord {
  const cweIds = (input.cweIds ?? "").split(/\s+/).filter(Boolean);
  const cna: GcveRecord["containers"]["cna"] = {
    title: input.title,
    descriptions: [
      {
        lang: "en",
        value: input.technicalDetails
          ? `${input.description}\n\nTechnical details:\n${input.technicalDetails}`
          : input.description,
      },
    ],
    affected: [
      {
        vendor: input.vendor,
        product: input.product,
        versions: [{ version: input.affectedVersions, status: "affected" }],
      },
    ],
    source: { discovery: "EXTERNAL" },
    x_gcve: [
      {
        vulnId: gcveId,
        recordType: "advisory",
        ...(input.cveId ? { relationships: [{ destId: input.cveId, type: "equal" }] } : {}),
      },
    ],
  };

  if (cweIds.length > 0) {
    cna.problemTypes = [
      {
        descriptions: cweIds.map((cweId) => ({
          lang: "en",
          type: "CWE",
          cweId,
          description: cweId,
        })),
      },
    ];
  }

  if (input.cvssVector) {
    const metric = metricForVector(input.cvssVector, input.cvssScore);
    cna.metrics = [
      metric.key === "cvssV4_0" ? { format: "CVSS", cvssV4_0: metric.block } : { format: "CVSS", cvssV3_1: metric.block },
    ];
  }

  if (input.poc) {
    cna.exploits = [{ lang: "en", value: input.poc }];
  }

  if (input.references.length > 0) {
    cna.references = input.references.map((url) => ({ url }));
  }

  if (input.datePublic) {
    cna.datePublic = input.datePublic;
  }

  cna.credits = [{ lang: "en", type: "finder", value: input.reporterName }];

  return {
    dataType: "CVE_RECORD",
    dataVersion: "5.1",
    containers: { cna },
    cveMetadata: {
      vulnId: gcveId,
      state: "PUBLISHED",
      datePublished: publishedAtIso,
      dateUpdated: updatedAtIso,
      dateReserved: publishedAtIso,
      ...(input.cveId ? { cveId: input.cveId } : {}),
    },
  };
}
