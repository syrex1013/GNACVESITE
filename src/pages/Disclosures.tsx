import { MagnifyingGlass, ArrowRight, ArrowLeft } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { SeverityBadge } from "@/components/SeverityBadge";
import { Reveal } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/lib/api";
import { formatDate, severityLabel } from "@/lib/format";
import { usePageTitle } from "@/lib/usePageTitle";
import { SEVERITIES } from "@/shared/types";

const ALL = "all";
const PER_PAGE = 20;

export function Disclosures() {
  usePageTitle("Published disclosures");

  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const severity = params.get("severity") ?? "";
  const year = params.get("year") ?? "";
  const page = Number.parseInt(params.get("page") ?? "1", 10) || 1;
  const [searchDraft, setSearchDraft] = useState(q);

  useEffect(() => {
    const timer = setTimeout(() => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (searchDraft.trim()) next.set("q", searchDraft.trim());
          else next.delete("q");
          next.delete("page");
          return next;
        },
        { replace: true },
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [searchDraft, setParams]);

  const setFilter = (key: string, value: string) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value && value !== ALL) next.set(key, value);
        else next.delete(key);
        if (key !== "page") next.delete("page");
        return next;
      },
      { replace: true },
    );
  };

  const facets = useQuery({ queryKey: ["gcves", "facets"], queryFn: api.gcveFacets });
  const list = useQuery({
    queryKey: ["gcves", "list", q, severity, year, page],
    queryFn: () => api.listGcves({ q, severity, year, page, perPage: PER_PAGE }),
  });

  const hasFilters = q !== "" || severity !== "" || year !== "";
  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.perPage)) : 1;

  return (
    <div className="container-x py-14">
      <Reveal>
        <h1 className="display-1">Published disclosures</h1>
        <p className="body-lg mt-4 max-w-[62ch] text-ink-soft">
          Every record below was reviewed by GNA-115 and carries an identifier issued under the GCVE numbering system.
        </p>
      </Reveal>

      <Reveal className="mt-10" delay={0.05}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative md:max-w-md md:flex-1">
            <MagnifyingGlass
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline"
              aria-hidden="true"
            />
            <Input
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search ID, title, product, or CVE"
              aria-label="Search disclosures"
              className="pl-10"
            />
          </div>

          <div className="flex gap-3">
            <Select value={severity || ALL} onValueChange={(value) => setFilter("severity", value)}>
              <SelectTrigger className="w-[170px]" aria-label="Filter by severity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All severities</SelectItem>
                {SEVERITIES.map((entry) => (
                  <SelectItem key={entry} value={entry}>
                    {severityLabel(entry)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={year || ALL} onValueChange={(value) => setFilter("year", value)}>
              <SelectTrigger className="w-[140px]" aria-label="Filter by disclosure year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All years</SelectItem>
                {(facets.data?.years ?? []).map((entry) => (
                  <SelectItem key={entry} value={entry}>
                    {entry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Reveal>

      <div className="mt-8">
        {list.isPending ? (
          <div className="space-y-3">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : list.isError ? (
          <p className="py-10 text-sm text-ink-soft">
            Disclosures could not be loaded. Reload the page to try again.
          </p>
        ) : list.data.items.length === 0 ? (
          <div className="border border-surface-high px-6 py-16 text-center">
            <MagnifyingGlass size={28} className="mx-auto text-outline-soft" aria-hidden="true" />
            <p className="mt-4 font-medium">No disclosures match your search.</p>
            {hasFilters ? (
              <Button
                variant="secondary"
                size="md"
                className="mt-6"
                onClick={() => {
                  setSearchDraft("");
                  setParams(new URLSearchParams(), { replace: true });
                }}
              >
                Clear filters
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <TR>
                    <TH className="w-[190px]">ID</TH>
                    <TH>Title</TH>
                    <TH className="hidden md:table-cell">Product</TH>
                    <TH className="w-[110px]">Severity</TH>
                    <TH className="hidden lg:table-cell w-[150px]">CVE</TH>
                    <TH className="w-[120px]">Published</TH>
                  </TR>
                </THead>
                <TBody>
                  {list.data.items.map((item) => (
                    <TR key={item.id} className="transition-colors hover:bg-surface-dim">
                      <TD>
                        <Link to={`/disclosures/${item.id}`} className="font-mono text-sm text-brand hover:underline">
                          {item.id}
                        </Link>
                      </TD>
                      <TD>
                        <Link to={`/disclosures/${item.id}`} className="font-medium hover:text-brand">
                          {item.title}
                        </Link>
                      </TD>
                      <TD className="hidden text-ink-soft md:table-cell">
                        {item.vendor} {item.product}
                      </TD>
                      <TD>
                        <SeverityBadge severity={item.severity} />
                      </TD>
                      <TD className="hidden font-mono text-xs text-ink-soft lg:table-cell">{item.cveRef ?? ""}</TD>
                      <TD className="font-mono text-xs text-ink-soft">{formatDate(item.datePublished)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-surface-high pt-6">
              <p className="text-sm text-ink-soft">
                {list.data.total} {list.data.total === 1 ? "record" : "records"}, page {list.data.page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="md"
                  disabled={page <= 1}
                  onClick={() => setFilter("page", String(page - 1))}
                >
                  <ArrowLeft size={16} weight="bold" />
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  disabled={page >= totalPages}
                  onClick={() => setFilter("page", String(page + 1))}
                >
                  Next
                  <ArrowRight size={16} weight="bold" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
