import { cn } from "@/lib/cn";
import { severityClass, severityLabel } from "@/lib/format";
import type { Severity } from "@/shared/types";

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        severityClass(severity),
        className,
      )}
    >
      {severityLabel(severity)}
    </span>
  );
}
