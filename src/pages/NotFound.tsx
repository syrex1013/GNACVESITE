import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/lib/usePageTitle";

export function NotFound() {
  usePageTitle("Page not found");

  return (
    <div className="container-x py-24">
      <p className="font-mono text-sm text-brand">404</p>
      <h1 className="display-1 mt-3">Page not found</h1>
      <p className="mt-4 max-w-[56ch] text-ink-soft">
        That address does not match anything on this site. Published records are listed under disclosures.
      </p>
      <div className="mt-8 flex flex-wrap gap-4">
        <Button asChild>
          <Link to="/disclosures">Browse disclosures</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
