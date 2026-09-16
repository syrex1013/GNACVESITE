import { Check, Copy } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

/** Endpoint row with a copy to clipboard button. */
export function CopyEndpoint({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
    setCopied(true);
  };

  return (
    <li className="flex items-center justify-between gap-4 border-b border-surface-mid py-3">
      <code className="text-sm text-ink">
        <span className="text-outline">GET </span>
        {path}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ${path}`}
        className="p-2 text-outline transition-colors hover:text-brand"
      >
        {copied ? <Check size={16} weight="bold" className="text-success" /> : <Copy size={16} />}
      </button>
    </li>
  );
}
