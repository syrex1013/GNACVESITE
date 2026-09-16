import { ArrowSquareOut, Key, MagnifyingGlass } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { usePageTitle } from "@/lib/usePageTitle";

const TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function SubmissionStatus() {
  usePageTitle("Check report status");
  const { token: routeToken } = useParams();
  const [token, setToken] = useState(routeToken ?? "");
  const [submittedToken, setSubmittedToken] = useState<string | null>(routeToken ?? null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const statusQuery = useQuery({
    queryKey: ["submission-status", submittedToken],
    queryFn: () => api.submissionStatus(submittedToken as string),
    enabled: submittedToken !== null && TOKEN_RE.test(submittedToken),
    retry: false,
  });

  const lookup = (event: FormEvent) => {
    event.preventDefault();
    const value = token.trim();
    if (!TOKEN_RE.test(value)) {
      setValidationError("Enter the secret identifier issued when the report was submitted.");
      return;
    }
    setValidationError(null);
    setSubmittedToken(value);
  };

  return (
    <div className="container-x py-14">
      <h1 className="display-1 max-w-[26ch]">Check report status</h1>
      <p className="body-lg mt-4 max-w-[62ch] text-ink-soft">
        Private pre-publication tracking. Enter the secret identifier issued when the report was submitted.
      </p>

      <form onSubmit={lookup} className="mt-10 max-w-xl space-y-4">
        <div>
          <Label htmlFor="secret-token">Secret identifier</Label>
          <div className="mt-2">
            <Input
              id="secret-token"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>
        {validationError ? (
          <p role="alert" className="border-l-4 border-danger bg-surface-dim px-3 py-2 text-sm text-ink">
            {validationError}
          </p>
        ) : null}
        <Button type="submit">
          <MagnifyingGlass size={16} weight="bold" />
          Look up report
        </Button>
      </form>

      <div className="mt-10 max-w-3xl">
        {submittedToken === null ? (
          <p className="border border-dashed border-outline-soft bg-surface p-6 text-sm text-ink-soft">
            <Key size={16} weight="bold" className="mr-2 inline" aria-hidden="true" />
            Nothing to show yet. The secret identifier is shown once, immediately after a report is accepted.
          </p>
        ) : statusQuery.isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : statusQuery.isError ? (
          <p role="alert" className="border-l-4 border-danger bg-surface-dim px-3 py-2 text-sm text-ink">
            {statusQuery.error instanceof ApiError && statusQuery.error.status === 404
              ? "No report matches this identifier."
              : "Status could not be loaded. Check the identifier and try again."}
          </p>
        ) : statusQuery.data ? (
          <article className="border border-surface-high bg-surface p-6 sm:p-8">
            <p className="label-sm text-outline">Report status</p>
            <h2 className="headline-lg mt-2">{statusQuery.data.title}</h2>
            <p className="mt-2 font-mono text-sm text-brand">{statusQuery.data.reference}</p>
            <div className="mt-4">
              <StatusBadge status={statusQuery.data.status} />
            </div>
            <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-outline">Vendor</dt>
                <dd className="mt-1 font-medium">{statusQuery.data.vendor}</dd>
              </div>
              <div>
                <dt className="text-outline">Product</dt>
                <dd className="mt-1 font-medium">{statusQuery.data.product}</dd>
              </div>
              <div>
                <dt className="text-outline">Submitted</dt>
                <dd className="mt-1 font-medium">{formatDate(statusQuery.data.submitted_at)}</dd>
              </div>
              <div>
                <dt className="text-outline">Last update</dt>
                <dd className="mt-1 font-medium">{formatDate(statusQuery.data.updated_at)}</dd>
              </div>
            </dl>
            {statusQuery.data.gcve_id ? (
              <Button asChild variant="secondary" className="mt-8">
                <Link to={`/disclosures/${statusQuery.data.gcve_id}`}>
                  View published record
                  <ArrowSquareOut size={16} weight="bold" />
                </Link>
              </Button>
            ) : (
              <p className="mt-6 text-sm text-ink-soft">
                Not published yet. Status updates are also sent to the contact email on the report.
              </p>
            )}
          </article>
        ) : null}
      </div>
    </div>
  );
}
