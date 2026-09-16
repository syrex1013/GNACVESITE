import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";

type FieldProps = {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
};

/** Label above the control, hint under the label, error under the control. */
export function Field({ label, htmlFor, hint, error, children }: FieldProps) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      {hint ? <p className="mt-1 text-xs text-ink-soft">{hint}</p> : null}
      <div className="mt-2">{children}</div>
      {error ? (
        <p role="alert" className="mt-1 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SectionHeading({ index, title, body }: { index: number; title: string; body: string }) {
  return (
    <div className="border-b border-surface-high pb-4">
      <span className="font-mono text-xs text-outline" aria-hidden="true">
        {String(index).padStart(2, "0")}
      </span>
      <h2 className="headline-md mt-1">{title}</h2>
      <p className="mt-2 text-sm text-ink-soft">{body}</p>
    </div>
  );
}
