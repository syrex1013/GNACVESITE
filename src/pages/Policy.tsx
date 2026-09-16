import { ArrowUpRight } from "@phosphor-icons/react";
import { Reveal } from "@/components/motion/Reveal";
import { usePageTitle } from "@/lib/usePageTitle";

const SECTIONS = [
  {
    heading: "Scope",
    paragraphs: [
      "GNA-115 assigns GCVE identifiers to independently verified vulnerabilities in third-party software, firmware, and services. Reports covering a product you do not own or maintain are welcome.",
      "Identifiers are issued for vulnerabilities that can be reproduced and described precisely. Findings that depend solely on a vendor's intended behaviour, or on a configuration the vendor documents as unsupported, are out of scope.",
    ],
  },
  {
    heading: "What to submit",
    paragraphs: [
      "Send the affected vendor and product, the affected versions, a description of the impact, and reproduction steps or a proof of concept. References to vendor advisories, patches, or prior publications help the review move faster.",
      "A CVE identifier may already exist for the issue. Provide it in the report and the published record will link to it as an equal relationship.",
    ],
  },
  {
    heading: "Process and timelines",
    paragraphs: [
      "Reports are triaged within five business days. You receive a reference identifier such as SUB-2026-00042 to quote in correspondence, and replies go to the address you provide.",
      "Coordinated disclosure follows a 90 day default window from the date the vendor is notified. Shorter timelines apply when a vulnerability is already public or actively exploited, and longer windows are used when a vendor is demonstrably close to a fix.",
    ],
  },
  {
    heading: "Publication",
    paragraphs: [
      "Accepted reports receive a GCVE identifier in the form GCVE-115-YYYY-NNNNN and are published as a record in the GCVE BCP-05 format, based on the CVE Record Format. Every record includes the affected product, weaknesses, references, and credit to the finder.",
      "Published records are immutable in substance. Corrections and additions are published as updated records that reference the original advisory.",
    ],
  },
  {
    heading: "Grounds for rejection",
    paragraphs: [
      "A report may be declined when it does not describe a vulnerability, cannot be reproduced or verified, duplicates an existing record without adding information, or concerns a product the reporter cannot show is affected.",
      "Declined reports are kept with the reason recorded. A declined report can be reopened if new evidence is provided.",
    ],
  },
  {
    heading: "Privacy",
    paragraphs: [
      "Contact details are used only to coordinate the report. They are never published. Published records credit the finder by name, and a pseudonym can be used on request.",
      "Submitting addresses are stored only as one way hashes, used to correlate abuse and to apply submission limits.",
    ],
  },
];

const ENDPOINTS = [
  {
    method: "GET",
    path: "/api/gcve/publication",
    description:
      "BCP-03 pull endpoint returning full published records. Parameters: per_page (default 30, maximum 100), page, date_sort (published or updated), sort_order, since, cwe, product, source.",
    format: "JSON array of GCVE BCP-05 records",
  },
  {
    method: "GET",
    path: "/dumps/gna-115.ndjson",
    description: "Static dump of every published record, one JSON document per line.",
    format: "NDJSON",
  },
  {
    method: "GET",
    path: "/api/gcves/{id}",
    description:
      "Single published record with display metadata. Accepts a GCVE identifier or the cross referenced CVE identifier.",
    format: "JSON object",
  },
  {
    method: "GET",
    path: "/api/gcves",
    description: "Search published records by identifier, title, product, vendor, severity, or year.",
    format: "JSON object with items and total",
  },
  {
    method: "GET",
    path: "/api/gcve/api, /api/gcve/dump, /api/gcve/allocation, /api/gcve/pull-api",
    description: "Endpoints declared in the GCVE GNA directory, kept for existing integrations.",
    format: "JSON object",
  },
  {
    method: "POST",
    path: "/api/submissions",
    description: "Submit a vulnerability report for review. Requests are rate limited and verified.",
    format: "JSON object with the assigned reference",
  },
];

export function Policy() {
  usePageTitle("Disclosure policy");

  return (
    <div className="container-x py-14">
      <Reveal>
        <h1 className="display-1">Disclosure policy</h1>
        <p className="body-lg mt-4 max-w-[62ch] text-ink-soft">
          This policy describes how GNA-115 handles vulnerability reports, when identifiers are issued, and how records
          are published.
        </p>
      </Reveal>

      <div className="mt-14 grid gap-12 lg:grid-cols-[3fr_1fr]">
        <div className="prose-body space-y-12">
          {SECTIONS.map((section) => (
            <section key={section.heading}>
              <h2 className="headline-md">{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="mt-4 text-ink-soft">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}

          <section id="api" className="scroll-mt-24">
            <h2 className="headline-md">API and open data</h2>
            <p className="mt-4 text-ink-soft">
              Every published record is available as CVE JSON 5.1 with the GCVE extension, per GCVE BCP-05. This site
              implements GCVE BCP-03, BCP-04, and BCP-05 and is listed in the GNA directory as Adrian Dacka.
            </p>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="border-b border-surface-high">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-outline">
                      Endpoint
                    </th>
                    <th scope="col" className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-outline">
                      Description
                    </th>
                    <th scope="col" className="hidden px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-outline md:table-cell">
                      Format
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-mid">
                  {ENDPOINTS.map((endpoint) => (
                    <tr key={endpoint.path}>
                      <td className="px-3 py-4 align-top">
                        <span className="block font-mono text-xs text-outline">{endpoint.method}</span>
                        <span className="mt-1 block font-mono text-xs break-all text-ink">{endpoint.path}</span>
                      </td>
                      <td className="px-3 py-4 align-top text-ink-soft">{endpoint.description}</td>
                      <td className="hidden px-3 py-4 align-top text-ink-soft md:table-cell">{endpoint.format}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-6 text-ink-soft">
              Machine endpoints send permissive CORS headers and are cached for five minutes. The GCVE project
              aggregates these records at{" "}
              <a href="https://db.gcve.eu" target="_blank" rel="noreferrer noopener" className="link-body">
                db.gcve.eu
              </a>
              .
            </p>
          </section>
        </div>

        <aside className="lg:pt-2">
          <div className="border border-surface-high p-6">
            <p className="title-1">Report a vulnerability</p>
            <p className="mt-3 text-sm text-ink-soft">
              Reports are triaged within five business days. You receive a reference identifier to quote in
              correspondence.
            </p>
            <a
              href="/request"
              className="mt-5 inline-flex h-10 items-center justify-center bg-brand px-4 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-hover"
            >
              Request an ID
            </a>
            <a
              href="/.well-known/security.txt"
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-info hover:text-ink"
            >
              security.txt
              <ArrowUpRight size={14} weight="bold" />
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}
