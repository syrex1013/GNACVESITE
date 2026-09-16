import type { Severity } from "@/shared/types";

const SEVERITY_LABELS: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  none: "None",
};

export const severityLabel = (severity: Severity): string => SEVERITY_LABELS[severity];

const SEVERITY_CLASSES: Record<Severity, string> = {
  critical: "bg-sev-critical text-white",
  high: "bg-sev-high text-white",
  medium: "bg-sev-medium text-ink",
  low: "bg-sev-low text-white",
  none: "bg-sev-none text-white",
};

export const severityClass = (severity: Severity): string => SEVERITY_CLASSES[severity];

/** ISO timestamp or date to YYYY-MM-DD. */
export const formatDate = (value: string): string => value.slice(0, 10);

export const formatDateTime = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString().replace("T", " ").slice(0, 16);
};

export const formatCvss = (score: number | null): string | null =>
  score === null ? null : score.toFixed(1);
