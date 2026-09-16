import { integerParam } from "./params";

export type DateSort = "published" | "updated" | "reserved";

export type PublicationQuery = {
  perPage: number;
  page: number;
  dateSort: DateSort | null;
  sortOrder: "asc" | "desc";
  since: string | null;
  cwe: string | null;
  product: string | null;
  vendor: string | null;
  source: string | null;
  assigner: string | null;
};

const normalizeSince = (value: string | null): string | null => {
  if (!value) return null;
  const parsed = new Date(value.length === 10 ? `${value}T00:00:00.000Z` : value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

/** BCP-03 pull API query parameters. */
export function parsePublicationQuery(url: URL): PublicationQuery {
  const params = url.searchParams;
  const dateSortRaw = params.get("date_sort")?.toLowerCase() ?? "";
  const dateSort: DateSort | null =
    dateSortRaw === "published" || dateSortRaw === "updated" || dateSortRaw === "reserved" ? dateSortRaw : null;

  return {
    perPage: integerParam(params.get("per_page"), 30, 1, 100),
    page: integerParam(params.get("page"), 1, 1, 100000),
    dateSort,
    sortOrder: params.get("sort_order")?.toLowerCase() === "asc" ? "asc" : "desc",
    since: normalizeSince(params.get("since")),
    cwe: params.get("cwe")?.trim() || null,
    product: params.get("product")?.trim() || null,
    vendor: params.get("vendor")?.trim() || null,
    source: params.get("source")?.trim() || null,
    assigner: params.get("assigner")?.trim() || null,
  };
}
