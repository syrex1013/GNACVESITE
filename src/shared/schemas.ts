import { z } from "zod";
import { CVE_ID_RE } from "./gcve-id";
import { EDITABLE_STATUSES, SEVERITIES, VULNERABILITY_TYPES } from "./types";

/** Empty form strings mean "not provided". */
const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalText = (max: number, label: string) =>
  z.preprocess(blankToUndefined, z.string().trim().max(max, `${label} must be at most ${max} characters`).optional());

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

export const submissionCreateSchema = z
  .object({
    reporter_name: z.string().trim().min(1, "Enter your name").max(100),
    reporter_email: z.email("Enter a valid email address").max(200),
    reporter_org: optionalText(200, "Organization"),
    title: z.string().trim().min(5, "Give the report a title of at least 5 characters").max(200),
    vulnerability_type: z.enum(VULNERABILITY_TYPES),
    vendor: z.string().trim().min(1, "Enter the vendor").max(120),
    product: z.string().trim().min(1, "Enter the product").max(200),
    affected_versions: z.string().trim().min(1, "Enter the affected versions").max(200),
    severity: z.enum(SEVERITIES),
    cvss_score: z.preprocess(
      (value) => (value === "" || value === null ? undefined : typeof value === "string" ? Number(value) : value),
      z.number("Enter a number between 0 and 10").min(0).max(10).optional(),
    ),
    cvss_vector: z.preprocess(
      blankToUndefined,
      z
        .string()
        .trim()
        .max(128)
        .regex(/^CVSS:(3\.1|4\.0)\//, "Use a CVSS 3.1 or CVSS 4.0 vector string")
        .optional(),
    ),
    cve_id: z.preprocess(
      blankToUndefined,
      z.string().trim().regex(CVE_ID_RE, "Use the CVE-YYYY-NNNN format").optional(),
    ),
    cwe_ids: cweIdList,
    description: z
      .string()
      .trim()
      .min(50, "Describe the vulnerability in at least 50 characters")
      .max(8000),
    technical_details: optionalText(16000, "Technical details"),
    poc: optionalText(16000, "Proof of concept"),
    references: referenceList,
    reporter_note: optionalText(2000, "Note"),
    consent: z.boolean().refine((value) => value === true, "Agree to the disclosure policy to continue"),
    turnstile_token: z.string().max(4096).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.cvss_vector && data.cvss_score === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["cvss_score"],
        message: "Add the CVSS score that matches the vector",
      });
    }
  });

export const adminLoginSchema = z.object({
  password: z.string().min(1, "Enter the password").max(200),
  turnstile_token: z.string().max(4096).optional(),
});

export const statusUpdateSchema = z.object({
  status: z.enum(EDITABLE_STATUSES),
});

export type SubmissionCreateInput = z.infer<typeof submissionCreateSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type StatusUpdateInput = z.infer<typeof statusUpdateSchema>;
