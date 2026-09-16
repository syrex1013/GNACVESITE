import { describe, expect, it } from "vitest";
import { parsePublicationQuery } from "../src/shared/publication";

const query = (search: string) => parsePublicationQuery(new URL(`https://gna115.pages.dev/api/gcve/publication${search}`));

describe("parsePublicationQuery", () => {
  it("applies BCP-03 defaults", () => {
    expect(query("")).toMatchObject({
      perPage: 30,
      page: 1,
      dateSort: null,
      sortOrder: "desc",
      since: null,
      cwe: null,
      product: null,
      vendor: null,
      source: null,
      assigner: null,
    });
  });

  it("caps pagination and parses every documented filter", () => {
    const parsed = query(
      "?per_page=500&page=3&date_sort=reserved&sort_order=asc&since=2026-09-01&cwe=cwe-79&product=airbox&vendor=orange&source=cve&assigner=dacka",
    );

    expect(parsed).toMatchObject({
      perPage: 100,
      page: 3,
      dateSort: "reserved",
      sortOrder: "asc",
      since: "2026-09-01T00:00:00.000Z",
      cwe: "cwe-79",
      product: "airbox",
      vendor: "orange",
      source: "cve",
      assigner: "dacka",
    });
  });

  it("keeps published and updated sorts distinct and ignores unknown sorts", () => {
    expect(query("?date_sort=published").dateSort).toBe("published");
    expect(query("?date_sort=updated").dateSort).toBe("updated");
    expect(query("?date_sort=other").dateSort).toBeNull();
  });

  it("rejects unparsable since values instead of filtering everything out", () => {
    expect(query("?since=not-a-date").since).toBeNull();
  });
});
