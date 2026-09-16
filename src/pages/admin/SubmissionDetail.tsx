import { ArrowLeft, ArrowUpRight, CheckCircle, Download, SealCheck } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { SeverityBadge } from "@/components/SeverityBadge";
import { StatusBadge, statusLabel } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError } from "@/lib/api";
import { downloadJson } from "@/lib/download";
import { formatCvss, formatDateTime } from "@/lib/format";
import { usePageTitle } from "@/lib/usePageTitle";
import { EDITABLE_STATUSES, type EditableStatus } from "@/shared/types";

function DetailField({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="border-b border-surface-mid py-4 last:border-b-0">
      <p className="label-sm uppercase tracking-[0.12em] text-outline">{term}</p>
      <div className="mt-2 text-sm text-ink">{children}</div>
    </div>
  );
}

export function SubmissionDetail() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();

  const [statusDraft, setStatusDraft] = useState<EditableStatus | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [awarded, setAwarded] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [recordOpen, setRecordOpen] = useState(false);

  const submission = useQuery({
    queryKey: ["admin", "submission", id],
    queryFn: () => api.adminSubmission(id),
    retry: false,
  });

  usePageTitle(submission.data ? `${submission.data.reference}` : "Submission");

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin"] });
  };

  const updateStatus = useMutation({
    mutationFn: (status: EditableStatus) => api.updateStatus(id, status),
    onSuccess: () => {
      setActionError(null);
      setStatusDraft(null);
      invalidate();
    },
    onError: (error) => setActionError(error instanceof ApiError ? error.message : "The status could not be updated."),
  });

  const publish = useMutation({
    mutationFn: () => api.publish(id),
    onSuccess: (result) => {
      setActionError(null);
      setAwarded(result.gcveId);
      setConfirmOpen(false);
      invalidate();
    },
    onError: (error) => {
      setActionError(error instanceof ApiError ? error.message : "The record could not be published.");
      setConfirmOpen(false);
    },
  });

  if (submission.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-10 w-full max-w-xl" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (submission.isError) {
    return (
      <div>
        <h1 className="headline-lg">Submission not found</h1>
        <p className="mt-3 text-sm text-ink-soft">This report may have been removed, or the link is incorrect.</p>
        <Button asChild variant="secondary" className="mt-6">
          <Link to="/admin">
            <ArrowLeft size={16} weight="bold" />
            All submissions
          </Link>
        </Button>
      </div>
    );
  }

  const data = submission.data;
  const currentStatus = statusDraft ?? (data.status === "published" ? null : (data.status as EditableStatus));
  const gcveId = awarded ?? data.gcve?.id ?? null;
  const record = data.gcve?.record ?? null;

  const downloadRecord = () => {
    if (!record || !gcveId) return;
    downloadJson(`${gcveId}.json`, record);
  };

  return (
    <div>
      <Link to="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-ink-soft hover:text-brand">
        <ArrowLeft size={16} weight="bold" />
        All submissions
      </Link>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span className="font-mono text-sm text-brand">{data.reference}</span>
        <StatusBadge status={data.status} />
        <span className="text-xs text-outline">Received {formatDateTime(data.createdAt)}</span>
      </div>
      <h1 className="headline-md mt-3 max-w-[60ch]">{data.title}</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[8fr_4fr]">
        <div className="border border-surface-high bg-surface p-6">
          <h2 className="title-1">Report</h2>
          <div className="mt-4">
            <DetailField term="Type">{data.vulnerabilityType}</DetailField>
            <DetailField term="Affected">
              <span className="font-mono text-xs">
                {data.vendor} / {data.product}
              </span>
              <span className="mt-1 block text-ink-soft">{data.affectedVersions}</span>
            </DetailField>
            <DetailField term="Severity">
              <span className="flex flex-wrap items-center gap-3">
                <SeverityBadge severity={data.severity} />
                {formatCvss(data.cvssScore) ? (
                  <span className="font-mono text-xs text-ink-soft">CVSS {formatCvss(data.cvssScore)}</span>
                ) : null}
              </span>
              {data.cvssVector ? (
                <span className="mt-2 block font-mono text-xs break-all text-ink-soft">{data.cvssVector}</span>
              ) : null}
            </DetailField>
            {data.cveId ? (
              <DetailField term="Existing CVE">
                <span className="font-mono text-xs">{data.cveId}</span>
              </DetailField>
            ) : null}
            {data.cweIds ? (
              <DetailField term="Weaknesses">
                <span className="font-mono text-xs">{data.cweIds}</span>
              </DetailField>
            ) : null}
            <DetailField term="Description">
              <p className="whitespace-pre-line">{data.description}</p>
            </DetailField>
            {data.technicalDetails ? (
              <DetailField term="Technical details">
                <p className="whitespace-pre-line">{data.technicalDetails}</p>
              </DetailField>
            ) : null}
            {data.poc ? (
              <DetailField term="Proof of concept">
                <pre className="overflow-x-auto bg-surface-dim p-3 text-xs text-ink">{data.poc}</pre>
              </DetailField>
            ) : null}
            {data.references.length > 0 ? (
              <DetailField term="References">
                <ul className="space-y-1">
                  {data.references.map((reference) => (
                    <li key={reference}>
                      <a
                        href={reference}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="link-body text-xs break-all"
                      >
                        {reference}
                      </a>
                    </li>
                  ))}
                </ul>
              </DetailField>
            ) : null}
          </div>
        </div>

        <div className="space-y-8">
          <div className="border border-surface-high bg-surface p-6">
            <h2 className="title-1">Contact</h2>
            <div className="mt-4">
              <DetailField term="Name">{data.reporterName}</DetailField>
              <DetailField term="Email">
                {data.reporterEmail ? (
                  <a href={`mailto:${data.reporterEmail}`} className="link-body break-all">
                    {data.reporterEmail}
                  </a>
                ) : (
                  <span className="text-ink-soft">Not recorded</span>
                )}
              </DetailField>
              <DetailField term="Organization">{data.reporterOrg ?? <span className="text-ink-soft">Not provided</span>}</DetailField>
              <DetailField term="Note">{data.reporterNote ?? <span className="text-ink-soft">None</span>}</DetailField>
              <DetailField term="Submitter hash">
                <span className="font-mono text-xs break-all text-ink-soft">
                  {data.ipHash ? data.ipHash.slice(0, 16) : "Not recorded"}
                </span>
              </DetailField>
            </div>
          </div>

          <div className="border border-surface-high bg-surface p-6">
            <h2 className="title-1">Actions</h2>

            {data.status === "published" && gcveId ? (
              <div className="mt-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-success">
                  <SealCheck size={18} weight="fill" />
                  Published
                </p>
                <p className="mt-3 font-mono text-lg font-bold text-brand">{gcveId}</p>
                <div className="mt-4 flex flex-col gap-3">
                  <Button asChild variant="secondary">
                    <Link to={`/disclosures/${gcveId}`}>
                      View public record
                      <ArrowUpRight size={16} weight="bold" />
                    </Link>
                  </Button>
                  <Button variant="ghost" onClick={downloadRecord}>
                    <Download size={16} weight="bold" />
                    Download JSON
                  </Button>
                  <Button variant="ghost" onClick={() => setRecordOpen((open) => !open)}>
                    {recordOpen ? "Hide record JSON" : "Show record JSON"}
                  </Button>
                </div>
                {recordOpen && record ? (
                  <pre className="mt-4 max-h-72 overflow-auto bg-surface-dim p-3 text-xs text-ink">
                    {JSON.stringify(record, null, 2)}
                  </pre>
                ) : null}
              </div>
            ) : (
              <div className="mt-4 space-y-5">
                <div>
                  <Select value={currentStatus ?? undefined} onValueChange={(value) => setStatusDraft(value as EditableStatus)}>
                    <SelectTrigger aria-label="Submission status">
                      <SelectValue placeholder="Select a status" />
                    </SelectTrigger>
                    <SelectContent>
                      {EDITABLE_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {statusLabel(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    className="mt-3 w-full"
                    variant="secondary"
                    disabled={statusDraft === null || updateStatus.isPending}
                    onClick={() => statusDraft && updateStatus.mutate(statusDraft)}
                  >
                    Update status
                  </Button>
                </div>

                {data.status !== "queued" ? (
                  <Button
                    variant="ghost"
                    className="w-full"
                    disabled={updateStatus.isPending}
                    onClick={() => updateStatus.mutate("queued")}
                  >
                    <CheckCircle size={16} weight="bold" />
                    Add to queue
                  </Button>
                ) : null}

                <div className="border-t border-surface-mid pt-5">
                  <Button className="w-full" onClick={() => setConfirmOpen(true)} disabled={publish.isPending}>
                    Publish
                  </Button>
                  <p className="mt-2 text-xs text-ink-soft">
                    Publishing awards the next GCVE identifier and creates a permanent public record.
                  </p>
                </div>
              </div>
            )}

            {actionError ? (
              <p role="alert" className="mt-4 border-l-4 border-danger bg-surface-dim px-3 py-2 text-sm text-ink">
                {actionError}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogTitle>Publish this report?</DialogTitle>
          <DialogDescription>
            Publishing awards the next GCVE identifier and creates a permanent public record that is served to the GCVE
            ecosystem. This cannot be undone.
          </DialogDescription>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => publish.mutate()} disabled={publish.isPending}>
              {publish.isPending ? "Publishing" : "Publish record"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
