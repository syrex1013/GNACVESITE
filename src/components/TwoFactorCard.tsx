import { CircleNotch, ShieldCheck } from "@phosphor-icons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

/**
 * Enrolls or removes the authenticator (TOTP) factor for the admin account.
 * Enabling needs a live code from the authenticator app before it activates.
 */
export function TwoFactorCard() {
  const queryClient = useQueryClient();
  const status = useQuery({ queryKey: ["admin", "2fa", "status"], queryFn: api.twoFactorStatus });

  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const enabled = status.data?.enabled === true;

  useEffect(() => {
    if (setup && !enabled) return;
    setSetup(null);
  }, [enabled, setup]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "2fa", "status"] });

  const startSetup = async () => {
    setError(null);
    setBusy(true);
    try {
      const created = await api.twoFactorSetup();
      const qr = await QRCode.toDataURL(created.otpauth_uri, { margin: 1, width: 160 });
      setSetup({ secret: created.secret, qr });
    } catch {
      setError("Setup could not be started. Reload the page and try again.");
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (action: "enable" | "disable", event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (action === "enable") {
        await api.twoFactorEnable(code);
        setSetup(null);
      } else {
        await api.twoFactorDisable(code);
      }
      setCode("");
      await invalidate();
    } catch (caught) {
      setError(caught instanceof Error && caught.message ? caught.message : "The code was rejected. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-6 border border-surface-high bg-surface p-6">
      <div className="flex items-center gap-2">
        <ShieldCheck size={18} weight="bold" className={enabled ? "text-success" : "text-outline"} aria-hidden="true" />
        <h2 className="title-1">Two-factor authentication</h2>
      </div>

      {status.isPending ? (
        <SkeletonLine />
      ) : enabled ? (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-ink-soft">Enabled. Sign in requires a six-digit code from your authenticator app.</p>
          <form onSubmit={(event) => confirm("disable", event)} className="flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="totp-disable">Current code</Label>
              <div className="mt-2">
                <Input
                  id="totp-disable"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  maxLength={6}
                  className="w-40"
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                />
              </div>
            </div>
            <Button variant="secondary" type="submit" disabled={busy || code.length !== 6}>
              {busy ? <CircleNotch size={16} weight="bold" className="animate-spin" /> : null}
              Disable two-factor
            </Button>
          </form>
        </div>
      ) : setup ? (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-ink-soft">
            Scan the code with your authenticator app, or add it manually with the secret, then confirm with a live
            six-digit code.
          </p>
          <div className="flex flex-wrap items-start gap-6">
            <img src={setup.qr} alt="Authenticator QR code" width={160} height={160} />
            <div>
              <p className="font-mono text-xs break-all">{setup.secret}</p>
              <p className="mt-2 text-xs text-outline">6 digits, SHA1, 30 second period</p>
            </div>
          </div>
          <form onSubmit={(event) => confirm("enable", event)} className="flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="totp-enable">Verification code</Label>
              <div className="mt-2">
                <Input
                  id="totp-enable"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  maxLength={6}
                  className="w-40"
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                />
              </div>
            </div>
            <Button type="submit" disabled={busy || code.length !== 6}>
              {busy ? <CircleNotch size={16} weight="bold" className="animate-spin" /> : null}
              Enable two-factor
            </Button>
          </form>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-ink-soft">
            Not enabled. Add an authenticator app so sign in also needs a rotating six-digit code.
          </p>
          <Button onClick={startSetup} disabled={busy}>
            {busy ? <CircleNotch size={16} weight="bold" className="animate-spin" /> : null}
            Set up authenticator
          </Button>
        </div>
      )}

      {error ? (
        <p role="alert" className="mt-4 border-l-4 border-danger bg-surface-dim px-3 py-2 text-sm text-ink">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function SkeletonLine() {
  return <div className="mt-4 h-4 w-48 bg-surface-dim" />;
}
