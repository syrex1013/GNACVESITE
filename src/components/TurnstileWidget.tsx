import { useEffect, useRef } from "react";

const SCRIPT_ID = "cf-turnstile-script";
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const MOUNT_TIMEOUT_MS = 15000;
const POLL_INTERVAL_MS = 200;

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const ensureScript = (): void => {
  if (document.getElementById(SCRIPT_ID)) return;
  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.src = SCRIPT_SRC;
  script.async = true;
  script.defer = true;
  document.head.append(script);
};

/**
 * Renders a Turnstile widget with the explicit rendering API and reports the
 * token. The script loads at most once per document and mounting polls until
 * the API is available, so ordering between script load and React effects does
 * not matter. Nothing is rendered when no site key is configured.
 */
export function TurnstileWidget({ siteKey, onToken }: { siteKey: string | null; onToken: (token: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!siteKey || !container) return;

    let widgetId: string | null = null;
    let disposed = false;
    const deadline = Date.now() + MOUNT_TIMEOUT_MS;

    const mount = (): boolean => {
      if (disposed || widgetId !== null || !window.turnstile || !container.isConnected) return false;
      widgetId = window.turnstile.render(container, {
        sitekey: siteKey,
        theme: "light",
        callback: (token: string) => onToken(token),
        "expired-callback": () => onToken(""),
        "error-callback": () => onToken(""),
      });
      return true;
    };

    ensureScript();

    const timer = window.setInterval(() => {
      if (mount() || Date.now() > deadline) window.clearInterval(timer);
    }, POLL_INTERVAL_MS);
    mount();

    return () => {
      disposed = true;
      window.clearInterval(timer);
      if (widgetId !== null && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [siteKey, onToken]);

  if (!siteKey) return null;

  return <div ref={containerRef} />;
}
