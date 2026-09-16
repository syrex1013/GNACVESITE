import { ArrowSquareOut, CircleNotch } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CopyEndpoint } from "@/components/CopyEndpoint";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { usePageTitle } from "@/lib/usePageTitle";

const PATHS = ["/api/gcve/publication", "/dumps/gna-115.ndjson", "/api/gcve/sync", "/api/gcve/health"];

/**
 * Shows what collectors see: sync state, liveness, exact pull URLs, and the
 * directory values that keep automatic aggregation pointed at this deployment.
 */
export function Ecosystem() {
  usePageTitle("Ecosystem sync");

  const sync = useQuery({ queryKey: ["admin", "ecosystem", "sync"], queryFn: api.gcveSync });
  const health = useQuery({ queryKey: ["admin", "ecosystem", "health"], queryFn: api.gcveHealth });

  return (
    <div>
      <h1 className="headline-lg">Ecosystem sync</h1>
      <p className="mt-2 max-w-[70ch] text-sm text-ink-soft">
        GCVE aggregation is pull based. Each publication is live on the pull API the moment it is awarded, and
        collectors follow the directory entry to this deployment. This page shows exactly what a runner sees.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="border border-surface-high bg-surface p-6">
          <h2 className="title-1">Sync state</h2>
          {sync.isPending ? (
            <div className="mt-4 space-y-3">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-5 w-1/2" />
            </div>
          ) : sync.isError ? (
            <p className="mt-4 text-sm text-ink-soft">Sync state could not be loaded. Reload the page to try again.</p>
          ) : (
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex flex-wrap gap-x-3">
                <dt className="font-semibold">Records</dt>
                <dd className="font-mono">{sync.data.count}</dd>
              </div>
              <div className="flex flex-wrap gap-x-3">
                <dt className="font-semibold">Latest</dt>
                <dd className="font-mono text-brand">{sync.data.latest_id ?? "None"}</dd>
              </div>
              <div className="flex flex-wrap gap-x-3">
                <dt className="font-semibold">Published</dt>
                <dd className="font-mono text-ink-soft">{sync.data.latest_published ?? "None"}</dd>
              </div>
              <div className="flex flex-wrap gap-x-3">
                <dt className="font-semibold">Health</dt>
                <dd className="inline-flex items-center gap-2">
                  {health.isPending ? (
                    <CircleNotch size={16} weight="bold" className="animate-spin" aria-label="Checking health" />
                  ) : health.isError ? (
                    <span className="text-ink-soft">Unknown</span>
                  ) : (
                    <span className="font-semibold text-success">
                      {health.data.status} ({health.data.records} records)
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          )}
          <div className="mt-6">
            <ButtonLink to={`/disclosures/${sync.data?.latest_id ?? ""}`} disabled={!sync.data?.latest_id}>
              View latest public record
            </ButtonLink>
          </div>
        </section>

        <section className="border border-surface-high bg-surface p-6">
          <h2 className="title-1">Collector URLs</h2>
          <ul className="mt-4 space-y-3">
            {PATHS.map((path) => (
              <CopyEndpoint key={path} path={path} />
            ))}
          </ul>
          <p className="mt-4 text-xs text-ink-soft">
            The pull API also answers under the legacy directory base path at{" "}
            <span className="font-mono">/api/gcve/pull-api/...</span> so existing collectors keep working.
          </p>
        </section>
      </div>

      <section className="mt-6 border border-surface-high bg-surface p-6">
        <h2 className="title-1">Directory entry checklist</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Automatic aggregation follows the GNA-115 entry in the GCVE directory. Keep these values pointed at this
          deployment:
        </p>
        <ul className="mt-4 space-y-2 font-mono text-xs">
          <li>
            <span className="text-outline">gcve_url </span>https://gna115.pages.dev
          </li>
          <li>
            <span className="text-outline">gcve_pull_api </span>https://gna115.pages.dev
          </li>
          <li>
            <span className="text-outline">gcve_api </span>/api/gcve/api
          </li>
          <li>
            <span className="text-outline">gcve_dump </span>/api/gcve/dump
          </li>
          <li>
            <span className="text-outline">gcve_allocation </span>/api/gcve/allocation
          </li>
        </ul>
        <p className="mt-4 text-sm text-ink-soft">
          After the registry update, verify from the outside with{" "}
          <span className="font-mono text-xs">GET /api/gcve/health</span> and one filtered pull such as{" "}
          <span className="font-mono text-xs">GET /api/gcve/publication?per_page=1</span>.
        </p>
      </section>
    </div>
  );
}

function ButtonLink({ to, disabled, children }: { to: string; disabled: boolean; children: string }) {
  if (disabled) {
    return (
      <span className="inline-flex h-10 items-center gap-2 border-2 border-surface-high px-4 text-sm font-semibold text-outline">
        {children}
        <ArrowSquareOut size={16} weight="bold" aria-hidden="true" />
      </span>
    );
  }
  return (
    <Link
      to={to}
      className="inline-flex h-10 items-center gap-2 border-2 border-brand px-4 text-sm font-semibold text-brand hover:bg-surface-dim"
    >
      {children}
      <ArrowSquareOut size={16} weight="bold" aria-hidden="true" />
    </Link>
  );
}
