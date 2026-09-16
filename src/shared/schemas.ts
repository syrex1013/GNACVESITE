import { z } from "zod";
import { CVE_ID_RE } from "./gcve-id";
import { EDITABLE_STATUSES, SEVERITIES, VULNERABILITY_TYPES } from "./types";

/** Empty form strings mean "not provided". */
const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const requiredText = (max: number, label: string) =>
  z.string().trim().min(1, `Enter the ${label}`).max(max, `The ${label} must be at most ${max} characters`);

const optionalText = (max: number, label: string) =>
  z.preprocess(blankToUndefined, z.string().trim().max(max, `The ${label} must be at most ${max} characters`).optional());

const referenceList = z.preprocess(
  (value) => (Array.isArray(value) ? value.filter((entry) => typeof entry === "string" && entry.trim() !== "") : []),
  z
    .array(
      z
        .url("Enter a full URL, for example https://example.com/advisory")
        .max(2000)
        .refine(
          (value) => value.startsWith("https://") || value.startsWith("http://"),
          "Only http and https links are accepted",
        ),
    )
    .max(10, "At most 10 references"),
);

/** Accepted as "CWE-79, CWE-862" and stored space separated. */
const cweIdList = z.preprocess(
  blankToUndefined,
  z
    .string()
    .trim()
    .max(200)
    .transform((value) => value.split(/[,\s]+/).filter(Boolean))
    .pipe(
      z
        .array(z.string().regex(/^CWE-\d+$/i, "Use the CWE-NNN format, for example CWE-79"))
        .max(5, "At most 5 CWE identifiers")
        .transform((ids) => ids.map((id) => id.toUpperCase()).join(" ")),
    )
    .optional(),
);

/** Accepts "7.5" from forms, rejects anything outside the CVSS range. */
const cvssScore = z.preprocess(
  (value) => (value === "" || value === null ? undefined : typeof value === "string" ? Number(value) : value),
  z.number("Enter a number between 0 and 10").min(0).max(10).optional(),
);

const cvssVector = z.preprocess(
  blankToUndefined,
  z
    .string()
    .trim()
    .max(128)
    .regex(/^CVSS:(3\.1|4\.0)\//, "Use a CVSS 3.1 or CVSS 4.0 vector string")
    .optional(),
);

const cveId = z.preprocess(
  blankToUndefined,
  z.string().trim().regex(CVE_ID_RE, "Use the CVE-YYYY-NNNN format").optional(),
);

const severity = z.enum(SEVERITIES);
const vulnerabilityType = z.enum(VULNERABILITY_TYPES);

/** A vector without its score would produce a record the GCVE schema rejects. */
const requireScoreWithVector = (data: { cvss_vector?: string; cvss_score?: number }, ctx: z.RefinementCtx) => {
  if (data.cvss_vector && data.cvss_score === undefined) {
    ctx.addIssue({ code: "custom", path: ["cvss_score"], message: "Add the CVSS score that matches the vector" });
  }
};

const recordFields = {
  title: z.string().trim().min(5, "Give the record a title of at least 5 characters").max(200),
  vulnerability_type: vulnerabilityType,
  vendor: requiredText(120, "vendor"),
  product: requiredText(200, "product"),
  affected_versions: requiredText(200, "affected versions"),
  severity,
  cvss_score: cvssScore,
  cvss_vector: cvssVector,
  cve_id: cveId,
  cwe_ids: cweIdList,
  description: z.string().trim().min(50, "Describe the vulnerability in at least 50 characters").max(8000),
  technical_details: optionalText(16000, "technical details"),
  poc: optionalText(16000, "proof of concept"),
  references: referenceList,
};

export const submissionCreateSchema = z
  .object({
    ...recordFields,
    reporter_name: z.string().trim().min(1, "Enter your name").max(100),
    reporter_email: z.email("Enter a valid email address").max(200),
    reporter_org: optionalText(200, "organization"),
    reporter_note: optionalText(2000, "note"),
    consent: z.boolean().refine((value) => value === true, "Agree to the disclosure policy to continue"),
    turnstile_token: z.string().max(4096).optional(),
  })
  .superRefine(requireScoreWithVector);

/** Records the authority writes directly, without a report from a finder. */
export const gcveRecordCreateSchema = z
  .object({
    ...recordFields,
    credits: optionalText(200, "credits"),
    date_public: z.preprocess(
      blankToUndefined,
      z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Use the YYYY-MM-DD format").optional(),
    ),
  })
  .superRefine(requireScoreWithVector);

export const adminLoginSchema = z.object({
  email: z.string().email("Enter a valid email address").max(200),
  password: z.string().min(1, "Enter the password").max(200),
  turnstile_token: z.string().max(4096).optional(),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the six-digit code from your authenticator app")
    .optional(),
});

export const totpCodeSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "Enter the six-digit code from your authenticator app"),
});

export const statusUpdateSchema = z.object({
  status: z.enum(EDITABLE_STATUSES),
});
export const adminSettingsUpdateSchema = z
  .object({
    submissions_locked: z.boolean().optional(),
    submission_notification_email: z.string().trim().email("Enter a valid notification email").max(254).optional(),
    status_emails_enabled: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "Provide at least one setting");
export type SubmissionCreateInput = z.infer<typeof submissionCreateSchema>;
export type GcveRecordCreateInput = z.infer<typeof gcveRecordCreateSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type StatusUpdateInput = z.infer<typeof statusUpdateSchema>;
