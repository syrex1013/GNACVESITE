import { CircleNotch } from "@phosphor-icons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { LogoMark } from "@/components/layout/LogoMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api";
import { usePageTitle } from "@/lib/usePageTitle";

export function AdminLogin() {
  usePageTitle("Admin sign in");

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const config = useQuery({ queryKey: ["public-config"], queryFn: api.publicConfig, staleTime: Infinity });

  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const signIn = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await api.login(password, token || undefined);
      queryClient.setQueryData(["admin", "session"], { ok: true });
      navigate("/admin", { replace: true });
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "Sign in failed. Check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-dim px-4 py-16">
      <div className="w-full max-w-md border border-surface-high bg-surface p-8">
        <div className="flex items-center gap-3">
          <LogoMark />
          <div>
            <p className="font-bold">GNA-115 Admin</p>
            <p className="text-xs text-outline">Submission review</p>
          </div>
        </div>

        <form onSubmit={signIn} className="mt-8 space-y-5">
          <div>
            <Label htmlFor="password">Password</Label>
            <div className="mt-2">
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
          </div>

          {config.data?.turnstileSiteKey ? <TurnstileWidget siteKey={config.data.turnstileSiteKey} onToken={setToken} /> : null}

          {error ? (
            <p role="alert" className="border-l-4 border-danger bg-surface-dim px-3 py-2 text-sm text-ink">
              {error}
            </p>
          ) : null}

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? <CircleNotch size={18} weight="bold" className="animate-spin" /> : null}
            {submitting ? "Signing in" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
