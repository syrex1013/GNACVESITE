import { toLegacyVulnerability, type LegacyVulnerability } from "../../src/shared/legacy-mapper";
import type { GcveRecord, Severity, SubmissionRecordInput, SubmissionStatus } from "../../src/shared/types";
import { integerParam } from "./http";

export type SubmissionRow = {
  id: string;
  reference: string;
  reference_year: number;
  reference_seq: number;
  status: SubmissionStatus;
  title: string;
  vulnerability_type: string;
  vendor: string;
  product: string;
  affected_versions: string;
  cve_id: string | null;
  cwe_ids: string | null;
  severity: Severity;
  cvss_score: number | null;
  cvss_vector: string | null;
  description: string;
  technical_details: string | null;
  poc: string | null;
  references_json: string;
  reporter_name: string;
  reporter_email: string | null;
  reporter_org: string | null;
  reporter_note: string | null;
  ip_hash: string | null;
  created_at: string;
  updated_at: string;
};

export type PublishedRow = Pick<
  SubmissionRow,
  | "id"
  | "reference"
  | "status"
  | "title"
  | "vulnerability_type"
  | "vendor"
  | "product"
  | "affected_versions"
  | "cve_id"
  | "cwe_ids"
  | "severity"
  | "cvss_score"
  | "cvss_vector"
  | "description"
  | "technical_details"
  | "poc"
  | "references_json"
  | "reporter_name"
  | "created_at"
  | "updated_at"
> & {
  gcve_id: string;
  cve_ref: string | null;
  record_json: string;
  published_at: string;
};

export const PUBLISHED_COLUMNS = `g.id AS gcve_id, g.cve_ref, g.record_json, g.published_at,
  s.id, s.reference, s.status, s.title, s.vulnerability_type, s.vendor, s.product, s.affected_versions,
  s.cve_id, s.cwe_ids, s.severity, s.cvss_score, s.cvss_vector, s.description, s.technical_details, s.poc,
  s.references_json, s.reporter_name, s.created_at, s.updated_at`;

export function parseReferences(json: string): string[] {
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

export function parseRecord(json: string): GcveRecord {
  return JSON.parse(json) as GcveRecord;
}

export function recordInput(submission: SubmissionRow): SubmissionRecordInput {
  return {
    title: submission.title,
    vulnerabilityType: submission.vulnerability_type,
    vendor: submission.vendor,
    product: submission.product,
    affectedVersions: submission.affected_versions,
    cveId: submission.cve_id,
    cweIds: submission.cwe_ids,
    cvssScore: submission.cvss_score,
    cvssVector: submission.cvss_vector,
    description: submission.description,
    technicalDetails: submission.technical_details,
    poc: submission.poc,
    references: parseReferences(submission.references_json),
    reporterName: submission.reporter_name,
    datePublic: null,
  };
}

export async function loadSubmission(db: D1Database, id: string): Promise<SubmissionRow | null> {
  return db.prepare("SELECT * FROM submissions WHERE id = ?").bind(id).first<SubmissionRow>();
}

const toLegacyEntry = (row: PublishedRow): LegacyVulnerability =>
  toLegacyVulnerability({
    gcveId: row.gcve_id,
    cveId: row.cve_id,
    title: row.title,
    severity: row.severity,
    cvssScore: row.cvss_score,
    vulnerabilityType: row.vulnerability_type,
    vendor: row.vendor,
    product: row.product,
    affectedVersions: row.affected_versions,
    description: row.description,
    technicalDetails: row.technical_details,
    poc: row.poc,
    references: parseReferences(row.references_json),
    reporterName: row.reporter_name,
    record: parseRecord(row.record_json),
  });

async function selectPublished(db: D1Database, clause: string, params: (string | number)[]): Promise<PublishedRow[]> {
  const rows = await db
    .prepare(
      `SELECT ${PUBLISHED_COLUMNS} FROM gcves g JOIN submissions s ON s.id = g.submission_id ${clause}`,
    )
    .bind(...params)
    .all<PublishedRow>();
  return rows.results;
}

/** Legacy entries for the endpoints declared in the GCVE directory. */
export async function publishedEntries(db: D1Database): Promise<LegacyVulnerability[]> {
  const rows = await selectPublished(db, "ORDER BY g.year ASC, g.seq ASC", []);
  return rows.map(toLegacyEntry);
}

export type PublicationQuery = {
  perPage: number;
  page: number;
  dateSort: "published" | "updated";
  sortOrder: "asc" | "desc";
  since: string | null;
  cwe: string | null;
  product: string | null;
  source: string | null;
};

const normalizeSince = (value: string | null): string | null => {
  if (!value) return null;
  const parsed = new Date(value.length === 10 ? `${value}T00:00:00.000Z` : value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

/** BCP-03 pull API query parameters. */
export function parsePublicationQuery(url: URL): PublicationQuery {
  const params = url.searchParams;
  return {
    perPage: integerParam(params.get("per_page"), 30, 1, 100),
    page: integerParam(params.get("page"), 1, 1, 100000),
    dateSort: params.get("date_sort")?.toLowerCase() === "updated" ? "updated" : "published",
    sortOrder: params.get("sort_order")?.toLowerCase() === "asc" ? "asc" : "desc",
    since: normalizeSince(params.get("since")),
    cwe: params.get("cwe")?.trim() || null,
    product: params.get("product")?.trim() || null,
    source: params.get("source")?.trim() || null,
  };
}

const publicationFilter = (query: PublicationQuery): { clause: string; params: (string | number)[] } => {
  const where: string[] = [];
  const params: (string | number)[] = [];

  if (query.since) {
    where.push("(g.published_at >= ? OR g.updated_at >= ?)");
    params.push(query.since, query.since);
  }
  if (query.cwe) {
    where.push("instr(' ' || COALESCE(s.cwe_ids, '') || ' ', ' ' || ? || ' ') > 0");
    params.push(query.cwe.toUpperCase());
  }
  if (query.product) {
    where.push("s.product LIKE ?");
    params.push(`%${query.product}%`);
  }
  if (query.source) {
    const source = query.source.toUpperCase();
    if (source === "CVE") where.push("g.cve_ref IS NOT NULL");
    else if (source !== "GCVE") where.push("1 = 0");
  }

  return { clause: where.length > 0 ? `WHERE ${where.join(" AND ")}` : "", params };
};

/** Records returned by the BCP-03 REST publication endpoint. */
export async function publicationRecords(db: D1Database, query: PublicationQuery): Promise<GcveRecord[]> {
  const filter = publicationFilter(query);
  const dateColumn = query.dateSort === "updated" ? "g.updated_at" : "g.published_at";
  const rows = await db
    .prepare(
      `SELECT g.record_json FROM gcves g JOIN submissions s ON s.id = g.submission_id ${filter.clause} ` +
        `ORDER BY ${dateColumn} ${query.sortOrder === "asc" ? "ASC" : "DESC"}, g.seq DESC LIMIT ? OFFSET ?`,
    )
    .bind(...filter.params, query.perPage, (query.page - 1) * query.perPage)
    .all<{ record_json: string }>();
  return rows.results.map((row) => parseRecord(row.record_json));
}

/** Every published record, for the BCP-03 static dump. */
export async function allPublishedRecords(db: D1Database): Promise<GcveRecord[]> {
  const rows = await db
    .prepare("SELECT record_json FROM gcves ORDER BY year DESC, seq DESC")
    .all<{ record_json: string }>();
  return rows.results.map((row) => parseRecord(row.record_json));
}

export const toNdjson = (records: GcveRecord[]): string =>
  records.length === 0 ? "" : `${records.map((record) => JSON.stringify(record)).join("\n")}\n`;
