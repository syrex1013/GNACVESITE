import { cn } from "@/lib/cn";
import type { SubmissionStatus } from "@/shared/types";

const STATUS: Record<SubmissionStatus, { label: string; className: string }> = {
  new: { label: "New", className: "bg-info text-white" },
  in_review: { label: "In review", className: "bg-ink-soft text-white" },
  queued: { label: "Queued", className: "bg-sev-high text-white" },
  rejected: { label: "Rejected", className: "bg-surface-high text-ink-soft" },
  published: { label: "Published", className: "bg-success text-white" },
};

export function StatusBadge({ status, className }: { status: SubmissionStatus; className?: string }) {
  const entry = STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        entry.className,
        className,
      )}
    >
      {entry.label}
    </span>
  );
}

export const statusLabel = (status: SubmissionStatus): string => STATUS[status].label;
