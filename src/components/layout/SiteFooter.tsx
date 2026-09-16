import { Link } from "react-router-dom";
import { LogoMark } from "@/components/layout/LogoMark";

const SITE_LINKS = [
  { label: "Disclosures", to: "/disclosures" },
  { label: "Request an ID", to: "/request" },
  { label: "Disclosure policy", to: "/policy" },
];

const ECOSYSTEM_LINKS = [
  { label: "gcve.eu", href: "https://gcve.eu" },
  { label: "db.gcve.eu", href: "https://db.gcve.eu" },
  { label: "GNA directory", href: "https://gcve.eu/dist/gcve.json" },
  { label: "security.txt", href: "/.well-known/security.txt" },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-surface-high bg-surface-dim">
      <div className="container-x grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="flex gap-4">
          <LogoMark />
          <div>
            <p className="font-bold">GCVE Numbering Authority 115</p>
            <p className="mt-1 text-sm text-ink-soft">Adrian &quot;syrex1013&quot; Dacka</p>
            <p className="mt-3 max-w-[42ch] text-sm text-ink-soft">
              Independent numbering authority issuing GCVE identifiers for disclosed vulnerabilities.
            </p>
          </div>
        </div>

        <nav aria-label="Site" className="text-sm">
          <p className="label-sm mb-3 uppercase tracking-[0.12em] text-outline">Site</p>
          <ul className="space-y-2">
            {SITE_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="text-ink-soft transition-colors hover:text-brand">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Ecosystem" className="text-sm">
          <p className="label-sm mb-3 uppercase tracking-[0.12em] text-outline">Ecosystem</p>
          <ul className="space-y-2">
            {ECOSYSTEM_LINKS.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  rel="noreferrer noopener"
                  target={link.href.startsWith("http") ? "_blank" : undefined}
                  className="text-ink-soft transition-colors hover:text-brand"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="container-x border-t border-surface-high py-5">
        <p className="text-xs text-outline">
          © {new Date().getFullYear()} Adrian Dacka. GCVE identifiers issued under GNA-115. Records published in the
          GCVE BCP-05 format.
        </p>
      </div>
    </footer>
  );
}
