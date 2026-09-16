import { Suspense, lazy, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { DisclosureDetail } from "@/pages/DisclosureDetail";
import { Disclosures } from "@/pages/Disclosures";
import { Home } from "@/pages/Home";
import { NotFound } from "@/pages/NotFound";
import { Policy } from "@/pages/Policy";
import { RequestForm } from "@/pages/RequestForm";

const AdminLogin = lazy(() => import("@/pages/admin/Login").then((module) => ({ default: module.AdminLogin })));
const Dashboard = lazy(() => import("@/pages/admin/Dashboard").then((module) => ({ default: module.Dashboard })));
const SubmissionDetail = lazy(() =>
  import("@/pages/admin/SubmissionDetail").then((module) => ({ default: module.SubmissionDetail })),
);

function ScrollManager() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const target = document.getElementById(hash.slice(1));
      if (target) {
        target.scrollIntoView();
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}

function AdminFallback() {
  return (
    <div className="container-x py-24">
      <p className="text-sm text-ink-soft">Loading admin…</p>
    </div>
  );
}

export function App() {
  return (
    <>
      <ScrollManager />
      <Suspense fallback={<AdminFallback />}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/disclosures" element={<Disclosures />} />
            <Route path="/disclosures/:id" element={<DisclosureDetail />} />
            <Route path="/request" element={<RequestForm />} />
            <Route path="/policy" element={<Policy />} />
            <Route path="*" element={<NotFound />} />
          </Route>
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="submissions/:id" element={<SubmissionDetail />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
