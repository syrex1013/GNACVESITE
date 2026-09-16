import { List } from "@phosphor-icons/react";
import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { LogoMark } from "@/components/layout/LogoMark";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/cn";

const NAV_ITEMS = [
  { label: "Disclosures", to: "/disclosures" },
  { label: "Policy", to: "/policy" },
  { label: "API", to: "/policy#api" },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-surface-high bg-surface">
      <div className="container-x flex h-16 items-center justify-between gap-6">
        <Link to="/" className="flex items-center gap-3" aria-label="GNA-115 home">
          <LogoMark />
          <span className="flex flex-col leading-tight">
            <span className="text-base font-bold">GNA-115</span>
            <span className="label-sm text-outline">Adrian Dacka</span>
          </span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-7 lg:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn("text-sm font-semibold transition-colors", isActive ? "text-brand" : "text-ink-soft hover:text-ink")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden lg:block">
          <Button asChild>
            <Link to="/request">Request an ID</Link>
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          className="p-2 text-ink lg:hidden"
        >
          <List size={22} weight="bold" />
        </button>
      </div>

      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent variant="right">
          <DialogTitle>Menu</DialogTitle>
          <nav aria-label="Main" className="mt-6 flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className="border-b border-surface-mid py-3 text-base font-semibold text-ink"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Button asChild size="lg" className="mt-6 w-full">
            <Link to="/request" onClick={() => setMenuOpen(false)}>
              Request an ID
            </Link>
          </Button>
        </DialogContent>
      </Dialog>
    </header>
  );
}
