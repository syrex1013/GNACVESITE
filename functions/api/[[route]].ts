import { Hono, type Context, type Next } from "hono";
import { handle } from "hono/cloudflare-pages";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { CVE_ID_RE, GCVE_ID_RE, GNA_FULL_NAME, GNA_SHORT_NAME, formatGcveId } from "../../src/shared/gcve-id";
import { buildGcveRecord } from "../../src/shared/record-builder";
import { adminLoginSchema, adminSettingsUpdateSchema, statusUpdateSchema, submissionCreateSchema, totpCodeSchema } from "../../src/shared/schemas";
import type {
  AdminStats,
  AdminSubmissionDetail,
  AdminSubmissionListItem,
  GcveDetailResponse,
  GcveListItem,
  Severity,
  SubmissionStatus,
} from "../../src/shared/types";
import { SEVERITIES, VULNERABILITY_TYPES } from "../../src/shared/types";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  sessionExpiry,
  sessionIsValid,
  verifyPassword,
} from "../_lib/auth";
import type { AppEnv } from "../_lib/env";
import { clientIp, consumeRateLimit, integerParam, machineHeaders, requestOriginAllowed, sha256Hex } from "../_lib/http";
import {
  PUBLISHED_COLUMNS,
  type PublishedRow,
  allPublishedRecords,
  loadSubmission,
  parsePublicationQuery,
  parseRecord,
  parseReferences,
  publicationRecords,
  publishedEntries,
  recordInput,
  toNdjson,
} from "../_lib/records";
import {
  DEFAULT_SUBMISSION_NOTIFICATION_EMAIL,
  STATUS_EMAILS_ENABLED_KEY,
  SUBMISSION_NOTIFICATION_EMAIL_KEY,
  TOTP_SECRET_KEY,
  TOTP_PENDING_KEY,
  getSetting,
  isSubmissionsLocked,
  setSetting,
  setSubmissionsLocked,
} from "../_lib/settings";
import { emailSender, newSubmissionEmail, sendEmail, statusChangeEmail } from "../_lib/email";
import { verifyTurnstile } from "../_lib/turnstile";
import { generateTotpSecret, otpauthUri, verifyTotp } from "../_lib/totp";

type ListRow = {
  id: string;
  cve_ref: string | null;
  published_at: string;
  date_public: string | null;
  title: string;
  vendor: string;
  product: string;
  severity: Severity;
  vulnerability_type: string;
  cvss_score: number | null;
  cwe_ids: string | null;
};

const errorMessage = (error: unknown): string =>
  typeof error === "object" && error !== null && "message" in error
    ? String((error as { message: unknown }).message)
    : String(error);

const app = new Hono<AppEnv>().basePath("/api");

const requireSession = async (c: Context<AppEnv>, next: Next) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token || !(await sessionIsValid(c.env.DB, token, new Date()))) {
    return c.json({ error: "Sign in to continue." }, 401);
  }
  await next();
};

// ---------------------------------------------------------------- public API

app.get("/gcves", async (c) => {
  machineHeaders(c);
  const url = new URL(c.req.url);
  const page = integerParam(url.searchParams.get("page"), 1, 1, 100000);
  const perPage = integerParam(url.searchParams.get("per_page"), 20, 1, 100);
  const search = url.searchParams.get("q")?.trim() ?? "";
  const severity = url.searchParams.get("severity") ?? "";
  const year = url.searchParams.get("year") ?? "";
  const type = url.searchParams.get("type") ?? "";

  const where: string[] = [];
  const params: (string | number)[] = [];
  if (search) {
    const like = `%${search}%`;
    where.push("(g.id LIKE ? OR g.cve_ref LIKE ? OR s.title LIKE ? OR s.product LIKE ? OR s.vendor LIKE ?)");
    params.push(like, like, like, like, like);
  }
  if ((SEVERITIES as readonly string[]).includes(severity)) {
    where.push("s.severity = ?");
    params.push(severity);
  }
  if (/^\d{4}$/.test(year)) {
    where.push("COALESCE(json_extract(g.record_json, '$.containers.cna.datePublic'), g.published_at) LIKE ?");
    params.push(`${year}%`);
  }
  if ((VULNERABILITY_TYPES as readonly string[]).includes(type)) {
    where.push("s.vulnerability_type = ?");
    params.push(type);
  }
  const clause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  const [countResult, rowsResult] = await c.env.DB.batch([
    c.env.DB.prepare(`SELECT COUNT(*) AS total FROM gcves g JOIN submissions s ON s.id = g.submission_id ${clause}`).bind(
      ...params,
    ),
    c.env.DB.prepare(
      `SELECT g.id, g.cve_ref, g.published_at, json_extract(g.record_json, '$.containers.cna.datePublic') AS date_public,
              s.title, s.vendor, s.product, s.severity, s.vulnerability_type, s.cvss_score, s.cwe_ids
       FROM gcves g JOIN submissions s ON s.id = g.submission_id ${clause}
       ORDER BY g.year DESC, g.seq DESC LIMIT ? OFFSET ?`,
    ).bind(...params, perPage, (page - 1) * perPage),
  ]);

  const total = Number((countResult?.results?.[0] as { total?: number } | undefined)?.total ?? 0);

  return c.json({
    items: ((rowsResult?.results ?? []) as unknown as ListRow[]).map<GcveListItem>((row) => ({
      id: row.id,
      cveRef: row.cve_ref,
      title: row.title,
      vendor: row.vendor,
      product: row.product,
      severity: row.severity,
      vulnerabilityType: row.vulnerability_type,
      cvssScore: row.cvss_score,
      cweIds: row.cwe_ids,
      datePublished: row.date_public ?? row.published_at.slice(0, 10),
    })),
    total,
    page,
    perPage,
  });
});

app.get("/gcves/facets", async (c) => {
  machineHeaders(c);
  const rows = await c.env.DB.prepare(
    `SELECT DISTINCT substr(COALESCE(json_extract(record_json, '$.containers.cna.datePublic'), published_at), 1, 4) AS year
     FROM gcves ORDER BY year DESC`,
  ).all<{ year: string }>();
  return c.json({ years: rows.results.map((row) => row.year) });
});

app.get("/gcves/:id", async (c) => {
  machineHeaders(c);
  const identifier = c.req.param("id").trim();
  if (!GCVE_ID_RE.test(identifier) && !CVE_ID_RE.test(identifier)) {
    return c.json({ error: "No published record matches that identifier." }, 404);
  }

  const row = await c.env.DB.prepare(
    `SELECT ${PUBLISHED_COLUMNS} FROM gcves g JOIN submissions s ON s.id = g.submission_id
     WHERE g.id = ? COLLATE NOCASE OR g.cve_ref = ? COLLATE NOCASE
     ORDER BY g.seq ASC LIMIT 1`,
  )
    .bind(identifier, identifier)
    .first<PublishedRow>();

  if (!row) return c.json({ error: "No published record matches that identifier." }, 404);

  const detail: GcveDetailResponse = {
    id: row.gcve_id,
    record: parseRecord(row.record_json),
    meta: {
      cveRef: row.cve_ref,
      severity: row.severity,
      cvssScore: row.cvss_score,
      cvssVector: row.cvss_vector,
      publishedAt: row.published_at,
      submission: {
        title: row.title,
        vulnerabilityType: row.vulnerability_type,
        vendor: row.vendor,
        product: row.product,
        affectedVersions: row.affected_versions,
        cweIds: row.cwe_ids,
        description: row.description,
        technicalDetails: row.technical_details,
        poc: row.poc,
        references: parseReferences(row.references_json),
        credits: row.reporter_name,
      },
    },
  };

  return c.json(detail);
});
app.get("/public-config", (c) => {
  c.header("Cache-Control", "public, max-age=300");
  return c.json({
    turnstileSiteKey: c.env.TURNSTILE_SITE_KEY ?? null,
  });
});


app.post("/submissions", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (typeof body !== "object" || body === null) {
    return c.json({ error: "Send a JSON object." }, 400);
  }

  const now = new Date();
  const ip = clientIp(c);
  const payload = body as Record<string, unknown>;

  // Hidden field filled in: answer as if the report was accepted, store nothing.
  if (typeof payload.company_website === "string" && payload.company_website.trim() !== "") {
    return c.json({ reference: `SUB-${now.getUTCFullYear()}-00000`, secret_token: null }, 201);
  }

  const limit = await consumeRateLimit(c.env.DB, `submit:${ip}`, 5, now);
  if (!limit.allowed) {
    c.header("Retry-After", String(limit.retryAfterSeconds));
    return c.json({ error: "Too many reports from this address. Try again later." }, 429);
  }

  if (await isSubmissionsLocked(c.env.DB)) {
    return c.json({ error: "New submissions are temporarily closed." }, 503);
  }

  const verified = await verifyTurnstile(
    c.env.TURNSTILE_SECRET_KEY,
    typeof payload.turnstile_token === "string" ? payload.turnstile_token : undefined,
    ip,
  );
  if (!verified) {
    return c.json({ error: "Bot verification failed. Reload the page and submit again." }, 400);
  }

  const parsed = submissionCreateSchema.safeParse(payload);
  if (!parsed.success) {
    return c.json(
      {
        error: "Check the highlighted fields.",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      400,
    );
  }

  const input = parsed.data;
  const year = now.getUTCFullYear();
  const timestamp = now.toISOString();
  const id = crypto.randomUUID();
  const secretToken = crypto.randomUUID();
  const ipHash = ip === "unknown" ? null : await sha256Hex(`gna115:${ip}`);

  const insert = c.env.DB.prepare(
    `INSERT INTO submissions (id, reference, reference_year, reference_seq, status, title, vulnerability_type,
       vendor, product, affected_versions, cve_id, cwe_ids, severity, cvss_score, cvss_vector, description,
       technical_details, poc, references_json, reporter_name, reporter_email, reporter_org, reporter_note,
       secret_token, ip_hash, created_at, updated_at)
     SELECT ?, 'SUB-' || printf('%04d', ?) || '-' || printf('%05d', s.n + 1), ?, s.n + 1, 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
     FROM (SELECT COALESCE(MAX(reference_seq), 0) AS n FROM submissions WHERE reference_year = ?) s`,
  ).bind(
    id,
    year,
    year,
    input.title,
    input.vulnerability_type,
    input.vendor,
    input.product,
    input.affected_versions,
    input.cve_id ?? null,
    input.cwe_ids ?? null,
    input.severity,
    input.cvss_score ?? null,
    input.cvss_vector ?? null,
    input.description,
    input.technical_details ?? null,
    input.poc ?? null,
    JSON.stringify(input.references),
    input.reporter_name,
    input.reporter_email,
    input.reporter_org ?? null,
    input.reporter_note ?? null,
    secretToken,
    ipHash,
    timestamp,
    timestamp,
    year,
  );
  let reference: string | null = null;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2 && reference === null; attempt += 1) {
    try {
      await insert.run();
      const stored = await c.env.DB.prepare("SELECT reference FROM submissions WHERE id = ?")
        .bind(id)
        .first<{ reference: string }>();
      reference = stored?.reference ?? null;
    } catch (error) {
      lastError = error;
    }
  }

  if (reference === null) {
    console.error("Submission insert failed", errorMessage(lastError));
    return c.json({ error: "Could not store the report. Try again in a moment." }, 500);
  }

  try {
    const notificationEmail =
      (await getSetting(c.env.DB, SUBMISSION_NOTIFICATION_EMAIL_KEY)) ?? DEFAULT_SUBMISSION_NOTIFICATION_EMAIL;
    const email = newSubmissionEmail(reference, input.title, input.reporter_name, c.env.SITE_URL);
    await sendEmail(c.env.RESEND_API_KEY, c.env.RESEND_FROM, { to: notificationEmail, ...email });
  } catch (error) {
    console.error("New submission email failed", errorMessage(error));
  }

  return c.json({ reference, secret_token: secretToken }, 201);
});

const SECRET_TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

app.get("/submissions/status/:token", async (c) => {
  const token = c.req.param("token");
  if (!SECRET_TOKEN_RE.test(token)) {
    return c.json({ error: "Submission not found." }, 404);
  }
  const row = await c.env.DB.prepare(
    "SELECT id, reference, status, title, vendor, product, created_at, updated_at FROM submissions WHERE secret_token = ?",
  )
    .bind(token)
    .first<{
      id: string;
      reference: string;
      status: SubmissionStatus;
      title: string;
      vendor: string;
      product: string;
      created_at: string;
      updated_at: string;
    }>();
  if (!row) return c.json({ error: "Submission not found." }, 404);

  const gcve =
    row.status === "published"
      ? await c.env.DB.prepare("SELECT id, published_at FROM gcves WHERE submission_id = ?")
          .bind(row.id)
          .first<{ id: string; published_at: string }>()
      : null;

  return c.json({
    reference: row.reference,
    status: row.status,
    title: row.title,
    vendor: row.vendor,
    product: row.product,
    submitted_at: row.created_at,
    updated_at: row.updated_at,
    gcve_id: gcve?.id ?? null,
    published_at: gcve?.published_at ?? null,
  });
});

// ------------------------------------------- GCVE directory (legacy shapes)

app.get("/gcve/api", async (c) => {
  machineHeaders(c);
  const vulnerabilities = await publishedEntries(c.env.DB);
  return c.json({ count: vulnerabilities.length, vulnerabilities });
});

app.get("/gcve/dump", async (c) => {
  machineHeaders(c);
  const vulnerabilities = await publishedEntries(c.env.DB);
  return c.json({ generated_at: new Date().toISOString(), count: vulnerabilities.length, vulnerabilities });
});

app.get("/gcve/pull-api", async (c) => {
  machineHeaders(c);
  const vulnerabilities = await publishedEntries(c.env.DB);
  return c.json({
    gna: {
      short_name: GNA_SHORT_NAME,
      full_name: GNA_FULL_NAME,
      gcve_url: c.env.SITE_URL,
    },
    generated_at: new Date().toISOString(),
    count: vulnerabilities.length,
    vulnerabilities,
  });
});

app.get("/gcve/allocation", (c) => {
  machineHeaders(c);
  return c.json({
    allocation: "automatic",
    instructions:
      "GCVE identifiers are allocated automatically when a report is published. Submit a vulnerability report to request one.",
    disclosure_url: c.env.SITE_URL,
    submission_url: `${c.env.SITE_URL}/request`,
  });
});

// ------------------------------------------------------ BCP-03 publication

const publicationHandler = async (c: Context<AppEnv>) => {
  const records = await publicationRecords(c.env.DB, parsePublicationQuery(new URL(c.req.url)));
  machineHeaders(c);
  return c.json(records);
};

app.get("/gcve/publication", publicationHandler);
app.get("/gcve/pull-api/api/gcve/publication", publicationHandler);

const dumpHandler = async (c: Context<AppEnv>) => {
  machineHeaders(c);
  c.header("Content-Type", "application/x-ndjson; charset=utf-8");
  return c.body(toNdjson(await allPublishedRecords(c.env.DB)));
};

app.get("/gcve/pull-api/dumps/gna-115.ndjson", dumpHandler);

app.get("/gcve/sync", async (c) => {
  machineHeaders(c);
  const siteUrl = c.env.SITE_URL.replace(/\/+$/, "");
  const row = await c.env.DB
    .prepare(
      "SELECT g.year, g.seq, g.published_at FROM gcves g ORDER BY g.year DESC, g.seq DESC LIMIT 1",
    )
    .first<{ year: number; seq: number; published_at: string }>();
  const count = await c.env.DB.prepare("SELECT COUNT(*) AS total FROM gcves").first<{ total: number }>();

  return c.json({
    gna: 115,
    short_name: GNA_SHORT_NAME,
    pull_api: siteUrl,
    publication: `${siteUrl}/api/gcve/publication`,
    dump: `${siteUrl}/dumps/gna-115.ndjson`,
    canonical_publication: `${siteUrl}/api/gcve/publication`,
    canonical_dump: `${siteUrl}/dumps/gna-115.ndjson`,
    count: Number(count?.total ?? 0),
    latest_id: row ? formatGcveId(row.year, row.seq) : null,
    latest_published: row?.published_at ?? null,
    generated_at: new Date().toISOString(),
  });
});

app.get("/gcve/health", async (c) => {
  machineHeaders(c);
  const count = await c.env.DB.prepare("SELECT COUNT(*) AS total FROM gcves").first<{ total: number }>();
  return c.json({
    gna: 115,
    status: "ok",
    records: Number(count?.total ?? 0),
    format: "GCVE-115-YYYY-NNNNN",
    generated_at: new Date().toISOString(),
  });
});

// --------------------------------------------------------------- admin API

app.use("/admin/*", async (c, next) => {
  if (c.req.method !== "GET" && c.req.method !== "HEAD" && !requestOriginAllowed(c)) {
    return c.json({ error: "Cross origin request rejected." }, 403);
  }
  return next();
});

app.use("/admin/session", requireSession);
app.use("/admin/stats", requireSession);
app.use("/admin/submissions", requireSession);
app.use("/admin/submissions/*", requireSession);

app.post("/admin/login", async (c) => {
  c.header("Cache-Control", "no-store");
  const body = await c.req.json().catch(() => null);
  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Enter your email and password." }, 400);
  }

  if (!c.env.ADMIN_PASSWORD_HASH || !c.env.ADMIN_EMAIL) {
    return c.json({ error: "Admin sign in is not configured on this deployment." }, 500);
  }

  if (parsed.data.email.trim().toLowerCase() !== c.env.ADMIN_EMAIL.trim().toLowerCase()) {
    return c.json({ error: "Incorrect email or password." }, 401);
  }

  const now = new Date();
  const ip = clientIp(c);
  const limit = await consumeRateLimit(c.env.DB, `login:${ip}`, 10, now);
  if (!limit.allowed) {
    c.header("Retry-After", String(limit.retryAfterSeconds));
    return c.json({ error: "Too many attempts. Try again later." }, 429);
  }

  const verified = await verifyTurnstile(c.env.TURNSTILE_SECRET_KEY, parsed.data.turnstile_token, ip);
  if (!verified) {
    return c.json({ error: "Bot verification failed. Reload the page and try again." }, 400);
  }

  if (!(await verifyPassword(parsed.data.password, c.env.ADMIN_PASSWORD_HASH))) {
    return c.json({ error: "Incorrect email or password." }, 401);
  }

  const totpSecret = await getSetting(c.env.DB, TOTP_SECRET_KEY);
  if (totpSecret) {
    if (!parsed.data.code) {
      return c.json({ error: "Enter the six-digit code from your authenticator app.", two_factor_required: true }, 401);
    }
    if (!(await verifyTotp(totpSecret, parsed.data.code))) {
      return c.json({ error: "Incorrect authenticator code.", two_factor_required: true }, 401);
    }
  }

  const token = createSessionToken();
  const expiresAt = sessionExpiry(now);
  await c.env.DB.batch([
    c.env.DB.prepare("INSERT INTO sessions (token_hash, created_at, expires_at) VALUES (?, ?, ?)").bind(
      await sha256Hex(token),
      now.toISOString(),
      expiresAt,
    ),
    c.env.DB.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(now.toISOString()),
  ]);

  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === "https:",
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  return c.json({ ok: true });
});

app.post("/admin/logout", async (c) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) {
    await c.env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256Hex(token)).run();
  }
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
  return c.json({ ok: true });
});

app.get("/admin/session", (c) => c.json({ ok: true }));

app.use("/admin/settings", requireSession);

app.get("/admin/settings", async (c) => {
  c.header("Cache-Control", "no-store");
  const locked = await isSubmissionsLocked(c.env.DB);
  return c.json({
    submissions_locked: locked,
    submission_notification_email:
      (await getSetting(c.env.DB, SUBMISSION_NOTIFICATION_EMAIL_KEY)) ?? DEFAULT_SUBMISSION_NOTIFICATION_EMAIL,
    status_emails_enabled: (await getSetting(c.env.DB, STATUS_EMAILS_ENABLED_KEY)) !== "0",
    email_sender: emailSender(c.env.RESEND_FROM),
  });
});

app.patch("/admin/settings", async (c) => {
  const parsed = adminSettingsUpdateSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid admin settings." }, 400);
  if (parsed.data.submissions_locked !== undefined) await setSubmissionsLocked(c.env.DB, parsed.data.submissions_locked);
  if (parsed.data.submission_notification_email !== undefined) {
    await setSetting(c.env.DB, SUBMISSION_NOTIFICATION_EMAIL_KEY, parsed.data.submission_notification_email);
  }
  if (parsed.data.status_emails_enabled !== undefined) {
    await setSetting(c.env.DB, STATUS_EMAILS_ENABLED_KEY, parsed.data.status_emails_enabled ? "1" : "0");
  }
  const locked = await isSubmissionsLocked(c.env.DB);
  return c.json({
    ok: true,
    submissions_locked: locked,
    submission_notification_email:
      (await getSetting(c.env.DB, SUBMISSION_NOTIFICATION_EMAIL_KEY)) ?? DEFAULT_SUBMISSION_NOTIFICATION_EMAIL,
    status_emails_enabled: (await getSetting(c.env.DB, STATUS_EMAILS_ENABLED_KEY)) !== "0",
    email_sender: emailSender(c.env.RESEND_FROM),
  });
});

// ---------------------------------------------------- admin two-factor (TOTP)

app.use("/admin/2fa", requireSession);
app.use("/admin/2fa/*", requireSession);

app.get("/admin/2fa/status", async (c) => {
  c.header("Cache-Control", "no-store");
  const enabled = (await getSetting(c.env.DB, TOTP_SECRET_KEY)) !== null;
  return c.json({ enabled });
});

/** Creates a pending secret the admin confirms with a live code. */
app.post("/admin/2fa/setup", async (c) => {
  const secret = generateTotpSecret();
  await setSetting(c.env.DB, TOTP_PENDING_KEY, secret);
  return c.json({ secret, otpauth_uri: otpauthUri(secret, c.env.ADMIN_EMAIL ?? "admin") });
});

app.post("/admin/2fa/enable", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = totpCodeSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Enter the six-digit code from your authenticator app." }, 400);
  }

  const pending = await getSetting(c.env.DB, TOTP_PENDING_KEY);
  if (!pending) {
    return c.json({ error: "No pending setup. Start two-factor setup again." }, 400);
  }
  if (!(await verifyTotp(pending, parsed.data.code))) {
    return c.json({ error: "Incorrect authenticator code." }, 401);
  }

  await setSetting(c.env.DB, TOTP_SECRET_KEY, pending);
  await setSetting(c.env.DB, TOTP_PENDING_KEY, null);
  return c.json({ ok: true, enabled: true });
});

/** Requires a valid code so a stolen browser session cannot silently remove the factor. */
app.post("/admin/2fa/disable", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = totpCodeSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Enter the six-digit code from your authenticator app." }, 400);
  }

  const secret = await getSetting(c.env.DB, TOTP_SECRET_KEY);
  if (!secret) {
    return c.json({ ok: true, enabled: false });
  }
  if (!(await verifyTotp(secret, parsed.data.code))) {
    return c.json({ error: "Incorrect authenticator code." }, 401);
  }

  await setSetting(c.env.DB, TOTP_SECRET_KEY, null);
  await setSetting(c.env.DB, TOTP_PENDING_KEY, null);
  return c.json({ ok: true, enabled: false });
});

app.get("/admin/stats", async (c) => {
  c.header("Cache-Control", "no-store");
  const rows = await c.env.DB.prepare("SELECT status, COUNT(*) AS total FROM submissions GROUP BY status").all<{
    status: SubmissionStatus;
    total: number;
  }>();

  const stats: AdminStats = { new: 0, inReview: 0, queued: 0, rejected: 0, published: 0 };
  const targets: Record<SubmissionStatus, keyof AdminStats> = {
    new: "new",
    in_review: "inReview",
    queued: "queued",
    rejected: "rejected",
    published: "published",
  };

  for (const row of rows.results) {
    stats[targets[row.status]] = Number(row.total);
  }

  return c.json(stats);
});

app.get("/admin/submissions", async (c) => {
  c.header("Cache-Control", "no-store");
  const url = new URL(c.req.url);
  const page = integerParam(url.searchParams.get("page"), 1, 1, 100000);
  const perPage = integerParam(url.searchParams.get("per_page"), 25, 1, 100);
  const status = url.searchParams.get("status") ?? "";
  const search = url.searchParams.get("q")?.trim() ?? "";

  const where: string[] = [];
  const params: (string | number)[] = [];
  if (["new", "in_review", "queued", "rejected", "published"].includes(status)) {
    where.push("status = ?");
    params.push(status);
  }
  if (search) {
    const like = `%${search}%`;
    where.push("(reference LIKE ? OR title LIKE ? OR reporter_name LIKE ? OR product LIKE ?)");
    params.push(like, like, like, like);
  }
  const clause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  const [countResult, rowsResult] = await c.env.DB.batch([
    c.env.DB.prepare(`SELECT COUNT(*) AS total FROM submissions ${clause}`).bind(...params),
    c.env.DB.prepare(
      `SELECT id, reference, status, title, vulnerability_type, severity, reporter_name, product, created_at
       FROM submissions ${clause} ORDER BY created_at DESC, reference_seq DESC LIMIT ? OFFSET ?`,
    ).bind(...params, perPage, (page - 1) * perPage),
  ]);

  type AdminRow = {
    id: string;
    reference: string;
    status: SubmissionStatus;
    title: string;
    vulnerability_type: string;
    severity: Severity;
    reporter_name: string;
    product: string;
    created_at: string;
  };

  const total = Number((countResult?.results?.[0] as { total?: number } | undefined)?.total ?? 0);

  return c.json({
    items: ((rowsResult?.results ?? []) as unknown as AdminRow[]).map<AdminSubmissionListItem>((row) => ({
      id: row.id,
      reference: row.reference,
      status: row.status,
      title: row.title,
      vulnerabilityType: row.vulnerability_type,
      severity: row.severity,
      reporterName: row.reporter_name,
      product: row.product,
      createdAt: row.created_at,
    })),
    total,
    page,
    perPage,
  });
});

app.get("/admin/submissions/:id", async (c) => {
  c.header("Cache-Control", "no-store");
  const submission = await loadSubmission(c.env.DB, c.req.param("id"));
  if (!submission) return c.json({ error: "Submission not found." }, 404);

  const published = await c.env.DB.prepare(
    `SELECT ${PUBLISHED_COLUMNS} FROM gcves g JOIN submissions s ON s.id = g.submission_id WHERE s.id = ?`,
  )
    .bind(submission.id)
    .first<PublishedRow>();

  const detail: AdminSubmissionDetail = {
    id: submission.id,
    reference: submission.reference,
    status: submission.status,
    title: submission.title,
    vulnerabilityType: submission.vulnerability_type,
    vendor: submission.vendor,
    product: submission.product,
    affectedVersions: submission.affected_versions,
    cveId: submission.cve_id,
    cweIds: submission.cwe_ids,
    severity: submission.severity,
    cvssScore: submission.cvss_score,
    cvssVector: submission.cvss_vector,
    description: submission.description,
    technicalDetails: submission.technical_details,
    poc: submission.poc,
    references: parseReferences(submission.references_json),
    reporterName: submission.reporter_name,
    reporterEmail: submission.reporter_email,
    reporterOrg: submission.reporter_org,
    reporterNote: submission.reporter_note,
    ipHash: submission.ip_hash,
    createdAt: submission.created_at,
    updatedAt: submission.updated_at,
    gcve: published
      ? {
          id: published.gcve_id,
          publishedAt: published.published_at,
          record: parseRecord(published.record_json),
        }
      : null,
  };

  return c.json(detail);
});

app.patch("/admin/submissions/:id", async (c) => {
  c.header("Cache-Control", "no-store");
  const parsed = statusUpdateSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "Unsupported status." }, 400);
  }

  const id = c.req.param("id");
  const existing = await c.env.DB.prepare("SELECT id, reference, status, reporter_email FROM submissions WHERE id = ?")
    .bind(id)
    .first<{ id: string; reference: string; status: SubmissionStatus; reporter_email: string | null }>();
  if (!existing) return c.json({ error: "Submission not found." }, 404);
  if (existing.status === "published") {
    return c.json({ error: "Published submissions keep their status." }, 409);
  }

  await c.env.DB.prepare("UPDATE submissions SET status = ?, updated_at = ? WHERE id = ?")
    .bind(parsed.data.status, new Date().toISOString(), id)
    .run();

  try {
    if (existing.status !== parsed.data.status && existing.reporter_email && (await getSetting(c.env.DB, STATUS_EMAILS_ENABLED_KEY)) !== "0") {
      const email = statusChangeEmail(existing.reference, parsed.data.status, null, c.env.SITE_URL);
      await sendEmail(c.env.RESEND_API_KEY, c.env.RESEND_FROM, {
        to: existing.reporter_email,
        ...email,
      });
    }
  } catch (error) {
    console.error("Status email failed", errorMessage(error));
  }

  return c.json({ status: parsed.data.status });
});

app.post("/admin/submissions/:id/publish", async (c) => {
  c.header("Cache-Control", "no-store");
  const id = c.req.param("id");
  const submission = await loadSubmission(c.env.DB, id);
  if (!submission) return c.json({ error: "Submission not found." }, 404);
  if (submission.status === "published") {
    return c.json({ error: "This submission is already published." }, 409);
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const year = now.getUTCFullYear();
  const input = recordInput(submission);
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const highest = await c.env.DB.prepare("SELECT COALESCE(MAX(seq), 0) AS max_seq FROM gcves WHERE year = ?")
      .bind(year)
      .first<{ max_seq: number }>();
    const gcveId = formatGcveId(year, Number(highest?.max_seq ?? 0) + 1);
    const record = buildGcveRecord(input, gcveId, nowIso);

    try {
      await c.env.DB.batch([
        c.env.DB.prepare(
          "INSERT INTO gcves (id, year, seq, submission_id, cve_ref, record_json, published_at, updated_at) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        ).bind(gcveId, year, Number(highest?.max_seq ?? 0) + 1, id, submission.cve_id, JSON.stringify(record), nowIso, nowIso),
        c.env.DB.prepare("UPDATE submissions SET status = 'published', updated_at = ? WHERE id = ?").bind(nowIso, id),
      ]);
      try {
        if (submission.reporter_email && (await getSetting(c.env.DB, STATUS_EMAILS_ENABLED_KEY)) !== "0") {
          const email = statusChangeEmail(submission.reference, "published", gcveId, c.env.SITE_URL);
          await sendEmail(c.env.RESEND_API_KEY, c.env.RESEND_FROM, { to: submission.reporter_email, ...email });
        }
      } catch (error) {
        console.error("Publish email failed", errorMessage(error));
      }
      return c.json({ gcveId, record });
    } catch (error) {
      lastError = error;
    }
  }

  console.error("Publish failed", errorMessage(lastError));
  return c.json({ error: "Could not allocate a GCVE identifier. Try again." }, 500);
});

app.notFound((c) => c.json({ error: "Unknown endpoint." }, 404));

app.onError((error, c) => {
  console.error("Unhandled API error", errorMessage(error));
  return c.json({ error: "Unexpected server error." }, 500);
});

export const onRequest = handle(app);
