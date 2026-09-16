import type {
  AdminStats,
  AdminSubmissionDetail,
  AdminSubmissionListResponse,
  GcveDetailResponse,
  GcveListResponse,
} from "@/shared/types";

export type FieldIssue = { path: string; message: string };

export class ApiError extends Error {
  readonly status: number;
  readonly issues: FieldIssue[];

  constructor(message: string, status: number, issues: FieldIssue[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.issues = issues;
  }
}

type ErrorBody = { error?: string; issues?: FieldIssue[] };

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
    throw new ApiError(body.error ?? `Request failed with status ${response.status}`, response.status, body.issues);
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
  publicConfig: () => request<{ turnstileSiteKey: string | null }>("/api/public-config"),
  submitReport: (payload: SubmissionPayload) =>
    request<{ reference: string }>("/api/submissions", { method: "POST", body: JSON.stringify(payload) }),

  login: (password: string, turnstileToken?: string) =>
    request<{ ok: true }>("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ password, turnstile_token: turnstileToken }),
    }),
  logout: () => request<{ ok: true }>("/api/admin/logout", { method: "POST" }),
  session: () => request<{ ok: true }>("/api/admin/session"),
  adminStats: () => request<AdminStats>("/api/admin/stats"),
  adminSubmissions: (params: { status?: string; q?: string; page?: number } = {}) =>
    request<AdminSubmissionListResponse>(
      `/api/admin/submissions${query({ status: params.status, q: params.q, page: params.page })}`,
    ),
  adminSubmission: (id: string) => request<AdminSubmissionDetail>(`/api/admin/submissions/${encodeURIComponent(id)}`),
  updateStatus: (id: string, status: string) =>
    request<{ status: string }>(`/api/admin/submissions/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  publish: (id: string) =>
    request<{ gcveId: string }>(`/api/admin/submissions/${encodeURIComponent(id)}/publish`, { method: "POST" }),
};
