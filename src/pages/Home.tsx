import { ArrowRight, ArrowUpRight, Check, Copy } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-network.webp";
import { SeverityBadge } from "@/components/SeverityBadge";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { usePageTitle } from "@/lib/usePageTitle";

const STEPS = [
  {
    title: "Submit a report",
    body: "Send the affected product, impact, and proof of concept through the request form.",
  },
  {
    title: "Triage and coordination",
    body: "Each report is reviewed, validated, and coordinated with the vendor where relevant.",
  },
  {
    title: "GCVE ID and publication",
    body: "Accepted reports receive a GCVE-115 identifier and a public record, exported in open formats.",
  },
];

const ENDPOINTS = ["/api/gcve/publication", "/dumps/gna-115.ndjson", "/api/gcves/{id}"];

const AUTHORITY_FACTS = [
  { term: "Authority ID", detail: "115" },
  { term: "Short name", detail: "Adrian Dacka" },
  { term: "Full name", detail: 'Adrian "syrex1013" Dacka' },
  { term: "CPE vendor name", detail: "syrex1013" },
];

function CopyEndpoint({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
    setCopied(true);
  };

  return (
    <li className="flex items-center justify-between gap-4 border-b border-surface-mid py-3">
      <code className="text-sm text-ink">
        <span className="text-outline">GET </span>
        {path}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ${path}`}
        className="p-2 text-outline transition-colors hover:text-brand"
      >
        {copied ? <Check size={16} weight="bold" className="text-success" /> : <Copy size={16} />}
      </button>
    </li>
  );
}

export function Home() {
  usePageTitle("GNA-115 · Adrian Dacka · GCVE Vulnerability Disclosures");

  const recent = useQuery({
    queryKey: ["gcves", "home"],
    queryFn: () => api.listGcves({ perPage: 5 }),
  });

  const total = recent.data?.total;

  return (
    <>
      <section className="container-x pb-16 pt-14 md:pb-24 md:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[7fr_5fr]">
          <Stagger>
            <StaggerItem>
              <p className="eyebrow">GCVE Numbering Authority 115</p>
            </StaggerItem>
            <StaggerItem>
              <h1 className="display-1 mt-4 text-balance">
                Independent vulnerability numbering, published in the open.
              </h1>
            </StaggerItem>
            <StaggerItem>
              <p className="body-lg mt-6 max-w-[54ch] text-ink-soft">
                GNA-115 awards GCVE identifiers to disclosed vulnerabilities and publishes every record as open,
                machine-readable data.
              </p>
            </StaggerItem>
            <StaggerItem>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Button asChild size="lg">
                  <Link to="/request">Request an ID</Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <Link to="/disclosures">Browse disclosures</Link>
                </Button>
              </div>
            </StaggerItem>
          </Stagger>

          <Reveal delay={0.15}>
            <img
              src={heroImage}
              alt="Red lattice structure standing in for a network of linked vulnerability records"
              width={1254}
              height={1254}
              className="mx-auto w-full max-w-[520px]"
            />
          </Reveal>
        </div>
      </section>

      <section className="border-y border-surface-high bg-surface-dim">
        <dl className="container-x grid grid-cols-2 gap-px md:grid-cols-4">
          <div className="px-2 py-6 md:px-4">
            <dt className="label-sm uppercase tracking-[0.12em] text-outline">Authority ID</dt>
            <dd className="mt-2 font-mono text-2xl font-bold">115</dd>
          </div>
          <div className="px-2 py-6 md:px-4">
            <dt className="label-sm uppercase tracking-[0.12em] text-outline">Published records</dt>
            <dd className="mt-2 font-mono text-2xl font-bold">
              {total === undefined ? <Skeleton className="h-7 w-12" /> : total}
            </dd>
          </div>
          <div className="px-2 py-6 md:px-4">
            <dt className="label-sm uppercase tracking-[0.12em] text-outline">First disclosure</dt>
            <dd className="mt-2 font-mono text-2xl font-bold">2018</dd>
          </div>
          <div className="px-2 py-6 md:px-4">
            <dt className="label-sm uppercase tracking-[0.12em] text-outline">Record format</dt>
            <dd className="mt-2 font-mono text-2xl font-bold">BCP-05</dd>
          </div>
        </dl>
      </section>

      <Reveal className="container-x py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="headline-lg">Recent disclosures</h2>
          <Link to="/disclosures" className="link-body inline-flex items-center gap-1 text-sm font-semibold">
            View all disclosures
            <ArrowRight size={14} weight="bold" />
          </Link>
        </div>

        <div className="mt-8 border-t border-surface-high">
          {recent.isPending ? (
            <div className="divide-y divide-surface-mid">
              {[0, 1, 2, 3, 4].map((index) => (
                <div key={index} className="flex items-center gap-4 py-4">
                  <Skeleton className="h-5 w-44" />
                  <Skeleton className="h-5 flex-1" />
                </div>
              ))}
            </div>
          ) : recent.isError ? (
            <p className="py-8 text-sm text-ink-soft">
              Published records could not be loaded. Reload the page to try again.
            </p>
          ) : recent.data.items.length === 0 ? (
            <p className="py-8 text-sm text-ink-soft">
              No disclosures are published yet. Reports accepted through the request form appear here.
            </p>
          ) : (
            <ul className="divide-y divide-surface-mid">
              {recent.data.items.map((item) => (
                <li key={item.id}>
                  <Link
                    to={`/disclosures/${item.id}`}
                    className="group grid gap-2 py-4 transition-colors hover:bg-surface-dim md:grid-cols-[200px_1fr_auto] md:items-center md:gap-6"
                  >
                    <span className="font-mono text-sm text-brand">{item.id}</span>
                    <span className="font-medium text-ink group-hover:text-brand">{item.title}</span>
                    <span className="flex items-center gap-4 md:justify-end">
                      <SeverityBadge severity={item.severity} />
                      <time className="font-mono text-xs text-outline" dateTime={item.datePublished}>
                        {formatDate(item.datePublished)}
                      </time>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Reveal>

      <Reveal className="border-t border-surface-high bg-surface-dim">
        <div className="container-x py-20">
          <h2 className="headline-lg">How disclosure works</h2>
          <ol className="mt-10">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="grid gap-4 border-b border-surface-high py-7 md:grid-cols-[80px_1fr] md:gap-8"
              >
                <span className="font-mono text-sm text-outline" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="title-1">{step.title}</h3>
                  <p className="mt-2 max-w-[68ch] text-ink-soft">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Reveal>

      <Reveal className="container-x py-20">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="headline-lg">Machine-readable data</h2>
            <p className="mt-6 max-w-[60ch] text-ink-soft">
              Every published record is available as CVE JSON 5.1 with the GCVE extension, per GCVE BCP-05. The pull
              API follows BCP-03 and is aggregated by db.gcve.eu.
            </p>
            <Link to="/policy#api" className="link-body mt-4 inline-block text-sm font-semibold">
              Read the API reference
            </Link>
          </div>
          <ul className="lg:pt-2">
            {ENDPOINTS.map((path) => (
              <CopyEndpoint key={path} path={path} />
            ))}
          </ul>
        </div>
      </Reveal>

      <Reveal className="border-t border-surface-high bg-surface-dim">
        <div className="container-x py-20">
          <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <h2 className="headline-lg">The authority</h2>
              <p className="mt-6 max-w-[62ch] text-ink-soft">
                GNA-115 is operated by Adrian &quot;syrex1013&quot; Dacka, an independent security researcher focusing
                on embedded devices and network equipment. The authority is listed in the public GCVE GNA directory.
              </p>
              <div className="mt-6 flex flex-wrap gap-6 text-sm font-semibold">
                <a
                  href="https://gcve.eu/dist/gcve.json"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="link-body inline-flex items-center gap-1"
                >
                  GNA directory
                  <ArrowUpRight size={14} weight="bold" />
                </a>
                <a
                  href="https://db.gcve.eu"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="link-body inline-flex items-center gap-1"
                >
                  db.gcve.eu
                  <ArrowUpRight size={14} weight="bold" />
                </a>
              </div>
            </div>

            <dl className="border-t border-surface-high lg:border-t-0">
              {AUTHORITY_FACTS.map((fact) => (
                <div
                  key={fact.term}
                  className="flex flex-wrap items-baseline justify-between gap-4 border-b border-surface-high py-4"
                >
                  <dt className="label-sm uppercase tracking-[0.12em] text-outline">{fact.term}</dt>
                  <dd className="font-mono text-sm text-ink">{fact.detail}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Reveal>
    </>
  );
}
