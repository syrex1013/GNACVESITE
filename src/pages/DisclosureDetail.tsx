import { ArrowLeft, ArrowUpRight, Download } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { SeverityBadge } from "@/components/SeverityBadge";
import { Reveal } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError } from "@/lib/api";
import { formatCvss, formatDate } from "@/lib/format";
import { usePageTitle } from "@/lib/usePageTitle";

const downloadRecord = (id: string, record: unknown) => {
  const blob = new Blob([`${JSON.stringify(record, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${id}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
};

function MetaRow({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-surface-high py-3 last:border-b-0">
      <dt className="label-sm uppercase tracking-[0.12em] text-outline">{term}</dt>
      <dd className="text-sm text-ink">{children}</dd>
    </div>
  );
}

export function DisclosureDetail() {
  const { id = "" } = useParams();
  const detail = useQuery({ queryKey: ["gcve", id], queryFn: () => api.getGcve(id), retry: false });

  usePageTitle(detail.data ? `${detail.data.id}` : "Disclosure");

  if (detail.isPending) {
    return (
      <div className="container-x space-y-4 py-14">
        <Skeleton className="h-6 w-52" />
        <Skeleton className="h-10 w-full max-w-2xl" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (detail.isError) {
    const notFound = detail.error instanceof ApiError && detail.error.status === 404;
    return (
      <div className="container-x py-24">
        <h1 className="headline-lg">{notFound ? "Disclosure not found" : "Disclosure unavailable"}</h1>
        <p className="mt-4 max-w-[60ch] text-ink-soft">
          {notFound
            ? "No published record matches that identifier. It may have been published by another numbering authority."
            : "The record could not be loaded. Reload the page to try again."}
        </p>
        <Button asChild variant="secondary" className="mt-8">
          <Link to="/disclosures">
            <ArrowLeft size={16} weight="bold" />
            All disclosures
          </Link>
        </Button>
      </div>
    );
  }

  const { record, meta } = detail.data;
  const cweIds = (meta.submission.cweIds ?? "").split(/\s+/).filter(Boolean);
  const cvss = formatCvss(meta.cvssScore);

  return (
    <div className="container-x py-14">
      <Link to="/disclosures" className="inline-flex items-center gap-2 text-sm font-semibold text-ink-soft hover:text-brand">
        <ArrowLeft size={16} weight="bold" />
        All disclosures
      </Link>

      <Reveal className="mt-8">
        <p className="font-mono text-sm text-brand">{detail.data.id}</p>
        <h1 className="display-1 mt-3 max-w-[24ch]">{meta.submission.title}</h1>
      </Reveal>

      <div className="mt-12 grid gap-12 lg:grid-cols-[8fr_4fr]">
        <div className="space-y-10">
          <section>
            <h2 className="title-1">Description</h2>
            <p className="mt-3 whitespace-pre-line text-ink-soft">{meta.submission.description}</p>
          </section>

          {meta.submission.technicalDetails ? (
            <section>
              <h2 className="title-1">Technical details</h2>
              <p className="mt-3 whitespace-pre-line text-ink-soft">{meta.submission.technicalDetails}</p>
            </section>
          ) : null}

          {meta.submission.poc ? (
            <section>
              <h2 className="title-1">Proof of concept</h2>
              <pre className="mt-3 overflow-x-auto border border-surface-high bg-surface-dim p-4 text-xs leading-relaxed text-ink">
                {meta.submission.poc}
              </pre>
            </section>
          ) : null}

          {meta.submission.references.length > 0 ? (
            <section>
              <h2 className="title-1">References</h2>
              <ul className="mt-3 space-y-2">
                {meta.submission.references.map((reference) => (
                  <li key={reference}>
                    <a
                      href={reference}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="link-body inline-flex items-center gap-1 text-sm break-all"
                    >
                      {reference}
                      <ArrowUpRight size={14} weight="bold" />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="lg:pt-2">
          <div className="border border-surface-high p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SeverityBadge severity={meta.severity} />
              <span className="label-sm uppercase tracking-[0.12em] text-outline">{meta.submission.vulnerabilityType}</span>
            </div>

            <dl className="mt-5">
              <MetaRow term="Published">
                <time dateTime={meta.publishedAt}>{formatDate(meta.publishedAt)}</time>
              </MetaRow>

              {cvss ? (
                <MetaRow term="CVSS score">
                  <span className="font-mono">{cvss}</span>
                  {meta.cvssVector ? (
                    <span className="mt-1 block font-mono text-xs break-all text-ink-soft">{meta.cvssVector}</span>
                  ) : null}
                </MetaRow>
              ) : null}

              <MetaRow term="Affected">
                <span className="font-mono text-xs">
                  {meta.submission.vendor} / {meta.submission.product}
                </span>
                <span className="mt-1 block text-ink-soft">{meta.submission.affectedVersions}</span>
              </MetaRow>

              {cweIds.length > 0 ? (
                <MetaRow term="Weaknesses">
                  <span className="flex flex-wrap gap-2">
                    {cweIds.map((cweId) => (
                      <span key={cweId} className="rounded-full bg-surface-mid px-2.5 py-0.5 font-mono text-xs">
                        {cweId}
                      </span>
                    ))}
                  </span>
                </MetaRow>
              ) : null}

              {meta.cveRef ? (
                <MetaRow term="CVE">
                  <a
                    href={`https://nvd.nist.gov/vuln/detail/${meta.cveRef}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="link-body inline-flex items-center gap-1 font-mono text-xs"
                  >
                    {meta.cveRef}
                    <ArrowUpRight size={12} weight="bold" />
                  </a>
                </MetaRow>
              ) : null}

              <MetaRow term="Credits">{meta.submission.credits}</MetaRow>
            </dl>

            <div className="mt-6 flex flex-col gap-3">
              <Button variant="secondary" onClick={() => downloadRecord(detail.data.id, record)}>
                <Download size={16} weight="bold" />
                Download JSON
              </Button>
              <a
                href={`https://db.gcve.eu/vuln/${detail.data.id.toLowerCase()}`}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-info hover:text-ink"
              >
                View in db.gcve.eu
                <ArrowUpRight size={14} weight="bold" />
              </a>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
