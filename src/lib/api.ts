import type {
  AdminStats,
  AdminSubmissionDetail,
  AdminSubmissionListResponse,
  GcveCreateResponse,
  GcveDetailResponse,
  GcveHealthResponse,
  GcveListResponse,
  GcveSyncResponse,
  SubmissionStatusResponse,
} from "@/shared/types";

export type FieldIssue = { path: string; message: string };

export class ApiError extends Error {
  readonly status: number;
  readonly issues: FieldIssue[];
  /** Set when the admin endpoint answered that a TOTP code is required. */
  readonly twoFactorRequired: boolean;

  constructor(message: string, status: number, issues: FieldIssue[] = [], twoFactorRequired = false) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.issues = issues;
    this.twoFactorRequired = twoFactorRequired;
  }
}

type ErrorBody = { error?: string; issues?: FieldIssue[]; two_factor_required?: boolean };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const body = (payload ?? {}) as ErrorBody;
    throw new ApiError(
      body.error ?? `Request failed with status ${response.status}`,
      response.status,
      body.issues,
      body.two_factor_required === true,
    );
  }

  return payload as T;
}

const query = (params: Record<string, string | number | undefined>): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const serialized = search.toString();
  return serialized ? `?${serialized}` : "";
};

export type DisclosureQuery = {
  q?: string;
  severity?: string;
  year?: string;
  type?: string;
  page?: number;
  perPage?: number;
};

export type SubmissionPayload = {
  reporter_name: string;
  reporter_email: string;
  reporter_org?: string;
  title: string;
  vulnerability_type: string;
  vendor: string;
  product: string;
  affected_versions: string;
  severity: string;
  cvss_score?: string;
  cvss_vector?: string;
  cve_id?: string;
  cwe_ids?: string;
  description: string;
  technical_details?: string;
  poc?: string;
  references: string[];
  reporter_note?: string;
  consent: boolean;
  turnstile_token?: string;
  company_website?: string;
};

export type GcveRecordPayload = {
  title: string;
  vulnerability_type: string;
  vendor: string;
  product: string;
  affected_versions: string;
  severity: string;
  cvss_score?: string;
  cvss_vector?: string;
  cve_id?: string;
  cwe_ids?: string;
  description: string;
  technical_details?: string;
  poc?: string;
  references: string[];
  credits?: string;
  date_public?: string;
};

export const api = {
  listGcves: (params: DisclosureQuery = {}) =>
    request<GcveListResponse>(
      `/api/gcves${query({
        q: params.q,
        severity: params.severity,
        year: params.year,
        type: params.type,
        page: params.page,
        per_page: params.perPage,
      })}`,
    ),
  getGcve: (id: string) => request<GcveDetailResponse>(`/api/gcves/${encodeURIComponent(id)}`),
  gcveFacets: () => request<{ years: string[] }>("/api/gcves/facets"),
  gcveSync: () => request<GcveSyncResponse>("/api/gcve/sync"),
  gcveHealth: () => request<GcveHealthResponse>("/api/gcve/health"),
  publicConfig: () => request<{ turnstileSiteKey: string | null }>("/api/public-config"),
  submitReport: (payload: SubmissionPayload) =>
    request<{ reference: string; secret_token: string | null }>("/api/submissions", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  submissionStatus: (token: string) =>
    request<SubmissionStatusResponse>(`/api/submissions/status/${encodeURIComponent(token)}`),
  login: (email: string, password: string, turnstileToken?: string, code?: string) =>
    request<{ ok: true }>("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ email, password, turnstile_token: turnstileToken, code }),
    }),
  logout: () => request<{ ok: true }>("/api/admin/logout", { method: "POST" }),
  session: () => request<{ ok: true }>("/api/admin/session"),
  adminStats: () => request<AdminStats>("/api/admin/stats"),
  adminSubmissions: (params: { status?: string; q?: string; page?: number } = {}) =>
    request<AdminSubmissionListResponse>(
      `/api/admin/submissions${query({ status: params.status, q: params.q, page: params.page })}`,
    ),
  adminSettings: () => request<{ submissions_locked: boolean }>("/api/admin/settings"),
  updateAdminSettings: (payload: { submissions_locked: boolean }) =>
    request<{ ok: true; submissions_locked: boolean }>("/api/admin/settings", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  twoFactorStatus: () => request<{ enabled: boolean }>("/api/admin/2fa/status"),
  twoFactorSetup: () =>
    request<{ secret: string; otpauth_uri: string }>("/api/admin/2fa/setup", { method: "POST" }),
  twoFactorEnable: (code: string) =>
    request<{ ok: true; enabled: boolean }>("/api/admin/2fa/enable", { method: "POST", body: JSON.stringify({ code }) }),
  twoFactorDisable: (code: string) =>
    request<{ ok: true; enabled: boolean }>("/api/admin/2fa/disable", { method: "POST", body: JSON.stringify({ code }) }),
  adminSubmission: (id: string) => request<AdminSubmissionDetail>(`/api/admin/submissions/${encodeURIComponent(id)}`),
  updateStatus: (id: string, status: string) =>
    request<{ status: string }>(`/api/admin/submissions/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  publish: (id: string) =>
    request<{ gcveId: string }>(`/api/admin/submissions/${encodeURIComponent(id)}/publish`, { method: "POST" }),
  createGcve: (payload: GcveRecordPayload) =>
    request<GcveCreateResponse>("/api/admin/gcves", { method: "POST", body: JSON.stringify(payload) }),
};
