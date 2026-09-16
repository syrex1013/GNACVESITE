import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, SignOut } from "@phosphor-icons/react";
import { useEffect } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { LogoMark } from "@/components/layout/LogoMark";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export function AdminLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = useQuery({ queryKey: ["admin", "session"], queryFn: api.session, retry: false });

  useEffect(() => {
    if (session.isError) navigate("/admin/login", { replace: true });
  }, [session.isError, navigate]);

  if (session.isPending || session.isError) {
    return (
      <div className="container-x py-24">
        <p className="text-sm text-ink-soft">Checking session…</p>
      </div>
    );
  }

  const signOut = async () => {
    await api.logout();
    queryClient.clear();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface-dim">
      <header className="border-b border-surface-high bg-surface">
        <div className="container-x flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <LogoMark />
            <span className="font-bold">GNA-115 Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/">
                <ArrowLeft size={16} weight="bold" />
                Public site
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <SignOut size={16} weight="bold" />
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="container-x flex-1 py-8">
        <Outlet />
      </main>
    </div>
  );
}
