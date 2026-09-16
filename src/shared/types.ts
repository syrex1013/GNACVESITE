/**
 * Domain types shared by the SPA and the Pages Functions API.
 * Must stay free of DOM-only and Workers-only APIs.
 */

export const VULNERABILITY_TYPES = [
  "Information Disclosure",
  "Cross-Site Scripting (XSS)",
  "Authorization Bypass",
  "Authentication Bypass",
  "SQL Injection",
  "Command Injection",
  "Path Traversal",
  "Remote Code Execution",
  "Denial of Service",
  "Insecure Default Configuration",
  "Improper Input Validation",
  "Other",
] as const;

export type VulnerabilityType = (typeof VULNERABILITY_TYPES)[number];

export const SUBMISSION_STATUSES = ["new", "in_review", "queued", "rejected", "published"] as const;

export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

/** Statuses an administrator can set through PATCH. */
export const EDITABLE_STATUSES = ["new", "in_review", "queued", "rejected"] as const;

export type EditableStatus = (typeof EDITABLE_STATUSES)[number];

export const SEVERITIES = ["critical", "high", "medium", "low", "none"] as const;

export type Severity = (typeof SEVERITIES)[number];

/** Input required to build a GCVE record. Subset of a submissions row. */
export type SubmissionRecordInput = {
  title: string;
  vulnerabilityType: string;
  vendor: string;
  product: string;
  affectedVersions: string;
  cveId: string | null;
  cweIds: string | null;
  cvssScore: number | null;
  cvssVector: string | null;
  description: string;
  technicalDetails: string | null;
  poc: string | null;
  references: string[];
  reporterName: string;
  /** Original public disclosure date (YYYY-MM-DD), used for migrated records. */
  datePublic: string | null;
};

export type GcveRelationship = {
  destId: string;
  type: string;
};

export type CvssBlock = {
  version: string;
  vectorString: string;
  baseScore?: number;
  baseSeverity?: string;
};

export type GcveRecord = {
  dataType: "CVE_RECORD";
  dataVersion: string;
  containers: {
    cna: {
      title: string;
      descriptions: { lang: string; value: string }[];
      affected: {
        vendor: string;
        product: string;
        versions: { version: string; status: string }[];
      }[];
      problemTypes?: {
        descriptions: { lang: string; type: string; cweId: string; description: string }[];
      }[];
      metrics?: ({ format: "CVSS" } & Partial<Record<"cvssV3_0" | "cvssV3_1" | "cvssV4_0", CvssBlock>>)[];
      credits?: { lang: string; type: string; value: string }[];
      exploits?: { lang: string; value: string }[];
      references?: { url: string }[];
      source?: { discovery: string };
      datePublic?: string;
      x_gcve: { vulnId: string; recordType: string; relationships?: GcveRelationship[] }[];
    };
  };
  cveMetadata: {
    vulnId: string;
    cveId?: string;
    state: "PUBLISHED";
    datePublished: string;
    dateUpdated?: string;
    dateReserved?: string;
  };
};

/** Public list item returned by GET /api/gcves. */
export type GcveListItem = {
  id: string;
  cveRef: string | null;
  title: string;
  vendor: string;
  product: string;
  severity: Severity;
  vulnerabilityType: string;
  cvssScore: number | null;
  cweIds: string | null;
  datePublished: string;
};

export type GcveListResponse = {
  items: GcveListItem[];
  total: number;
  page: number;
  perPage: number;
};

export type GcveDetailResponse = {
  id: string;
  record: GcveRecord;
  meta: {
    cveRef: string | null;
    severity: Severity;
    cvssScore: number | null;
    cvssVector: string | null;
    publishedAt: string;
    submission: {
      title: string;
      vulnerabilityType: string;
      vendor: string;
      product: string;
      affectedVersions: string;
      cweIds: string | null;
      description: string;
      technicalDetails: string | null;
      poc: string | null;
      references: string[];
      credits: string;
    };
  };
};

export type AdminSubmissionListItem = {
  id: string;
  reference: string;
  status: SubmissionStatus;
  title: string;
  vulnerabilityType: string;
  severity: Severity;
  reporterName: string;
  product: string;
  createdAt: string;
};

export type AdminSubmissionListResponse = {
  items: AdminSubmissionListItem[];
  total: number;
  page: number;
  perPage: number;
};

export type AdminStats = {
  new: number;
  inReview: number;
  queued: number;
  rejected: number;
  published: number;
};

export type AdminSubmissionDetail = {
  id: string;
  reference: string;
  status: SubmissionStatus;
  title: string;
  vulnerabilityType: string;
  vendor: string;
  product: string;
  affectedVersions: string;
  cveId: string | null;
  cweIds: string | null;
  severity: Severity;
  cvssScore: number | null;
  cvssVector: string | null;
  description: string;
  technicalDetails: string | null;
  poc: string | null;
  references: string[];
  reporterName: string;
  reporterEmail: string | null;
  reporterOrg: string | null;
  reporterNote: string | null;
  ipHash: string | null;
  createdAt: string;
  updatedAt: string;
  gcve: { id: string; publishedAt: string; record: GcveRecord } | null;
};
