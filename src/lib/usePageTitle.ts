import { useEffect } from "react";

const SUFFIX = "GNA-115";

/** Sets a per view document title; the suffix is added when absent. */
export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = title.includes(SUFFIX) ? title : `${title} · ${SUFFIX}`;
  }, [title]);
}
