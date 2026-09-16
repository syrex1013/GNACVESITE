import { ArrowLeft, ArrowRight, Lock, LockOpen, MagnifyingGlass, Plus } from "@phosphor-icons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SeverityBadge } from "@/components/SeverityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TwoFactorCard } from "@/components/TwoFactorCard";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { usePageTitle } from "@/lib/usePageTitle";
const TABS = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "in_review", label: "In review" },
  { value: "queued", label: "Queued" },
  { value: "rejected", label: "Rejected" },
  { value: "published", label: "Published" },
];

export function Dashboard() {
  usePageTitle("Submissions");

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [status, setStatus] = useState("all");
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [locked, setLocked] = useState<boolean | null>(null);
  const [togglingLock, setTogglingLock] = useState(false);
  const [notificationEmail, setNotificationEmail] = useState("");
  const [statusEmailsEnabled, setStatusEmailsEnabled] = useState(true);
  const [savingEmailSettings, setSavingEmailSettings] = useState(false);
  const [emailSettingsMessage, setEmailSettingsMessage] = useState<string | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(draft.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [draft]);

  const stats = useQuery({ queryKey: ["admin", "stats"], queryFn: api.adminStats });
  const settings = useQuery({ queryKey: ["admin", "settings"], queryFn: api.adminSettings });

  const toggleLock = async () => {
    if (locked === null) return;
    setTogglingLock(true);
    try {
      const updated = await api.updateAdminSettings({ submissions_locked: !locked });
      setLocked(updated.submissions_locked);
      queryClient.setQueryData(["admin", "settings"], updated);
    } catch {
      alert("Could not update lock state");
    } finally {
      setTogglingLock(false);
    }
  };

  const saveEmailSettings = async () => {
    setSavingEmailSettings(true);
    setEmailSettingsMessage(null);
    try {
      const updated = await api.updateAdminSettings({
        submission_notification_email: notificationEmail,
        status_emails_enabled: statusEmailsEnabled,
      });
      setNotificationEmail(updated.submission_notification_email);
      setStatusEmailsEnabled(updated.status_emails_enabled);
      queryClient.setQueryData(["admin", "settings"], updated);
      setEmailSettingsMessage("Email settings saved.");
    } catch {
      setEmailSettingsMessage("Could not save email settings.");
    } finally {
      setSavingEmailSettings(false);
    }
  };

  useEffect(() => {
    if (settings.data?.submissions_locked !== undefined) setLocked(settings.data.submissions_locked);
    if (settings.data?.submission_notification_email !== undefined) setNotificationEmail(settings.data.submission_notification_email);
    if (settings.data?.status_emails_enabled !== undefined) setStatusEmailsEnabled(settings.data.status_emails_enabled);
  }, [settings.data]);

  const list = useQuery({
    queryKey: ["admin", "submissions", status, search, page],
    queryFn: () => api.adminSubmissions({ status: status === "all" ? undefined : status, q: search, page }),
  });

  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.perPage)) : 1;
  const currentPage = list.data?.page ?? page;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="headline-lg">Submissions</h1>
          <p className="mt-2 text-sm text-ink-soft">
            {stats.data
              ? `${stats.data.new} new, ${stats.data.inReview} in review, ${stats.data.queued} queued, ${stats.data.published} published`
              : "Loading counts…"}
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          <div className="relative w-full max-w-sm flex-1">
            <MagnifyingGlass
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline"
              aria-hidden="true"
            />
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Search reference or title"
              aria-label="Search submissions"
              className="pl-10"
            />
          </div>
          <Button
            variant="secondary"
            className={locked ? "border-danger text-danger hover:bg-danger/10" : ""}
            onClick={toggleLock}
            disabled={togglingLock || locked === null}
          >
            {locked ? <Lock size={16} weight="bold" /> : <LockOpen size={16} weight="bold" />}
            {locked ? "Unlock" : "Lock"}
          </Button>
          <Button asChild>
            <Link to="/admin/records/new">
              <Plus size={16} weight="bold" />
              Add GCVE record
            </Link>
          </Button>
        </div>
      </div>
      <section className="mt-6 border border-surface-high bg-surface p-6">
        <h2 className="title-1">Email notifications</h2>
        <p className="mt-2 text-sm text-ink-soft">Choose where new submission alerts go and whether reporters receive status updates.</p>
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <Label htmlFor="submission-notification-email">New submission recipient</Label>
            <Input
              id="submission-notification-email"
              type="email"
              value={notificationEmail}
              onChange={(event) => setNotificationEmail(event.target.value)}
              className="mt-2"
            />
          </div>
          <div className="flex items-start gap-3">
            <Checkbox
              id="status-emails-enabled"
              checked={statusEmailsEnabled}
              onCheckedChange={(checked) => setStatusEmailsEnabled(checked === true)}
            />
            <Label htmlFor="status-emails-enabled" className="font-normal text-ink-soft">
              Send automatic emails to reporters when submission status changes.
            </Label>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <Button variant="secondary" onClick={saveEmailSettings} disabled={savingEmailSettings || settings.isPending}>
            {savingEmailSettings ? "Saving" : "Save email settings"}
          </Button>
          {emailSettingsMessage ? <p className="text-sm text-ink-soft" role="status">{emailSettingsMessage}</p> : null}
        </div>
      </section>
      <Tabs
        value={status}
        onValueChange={(value) => {
          setStatus(value);
          setPage(1);
        }}
        className="mt-8"
      >
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="mt-6 border border-surface-high bg-surface">
        {list.isPending ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2, 3, 4].map((index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : list.isError ? (
          <p className="p-6 text-sm text-ink-soft">Submissions could not be loaded. Reload the page to try again.</p>
        ) : list.data.items.length === 0 ? (
          <p className="p-6 text-sm text-ink-soft">No submissions match this view.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH className="w-[150px]">Reference</TH>
                  <TH>Title</TH>
                  <TH className="hidden md:table-cell">Reporter</TH>
                  <TH className="w-[120px]">Severity</TH>
                  <TH className="w-[120px]">Status</TH>
                  <TH className="hidden w-[120px] lg:table-cell">Received</TH>
                </TR>
              </THead>
              <TBody>
                {list.data.items.map((item) => (
                  <TR
                    key={item.id}
                    className="cursor-pointer transition-colors hover:bg-surface-dim"
                    onClick={() => navigate(`/admin/submissions/${item.id}`)}
                  >
                    <TD className="font-mono text-xs">{item.reference}</TD>
                    <TD>
                      <span className="font-medium">{item.title}</span>
                      <span className="mt-1 block text-xs text-outline">
                        {item.vulnerabilityType} · {item.product}
                      </span>
                    </TD>
                    <TD className="hidden text-ink-soft md:table-cell">{item.reporterName}</TD>
                    <TD>
                      <SeverityBadge severity={item.severity} />
                    </TD>
                    <TD>
                      <StatusBadge status={item.status} />
                    </TD>
                    <TD className="hidden font-mono text-xs text-ink-soft lg:table-cell">
                      {formatDate(item.createdAt)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        )}

      </div>
      <TwoFactorCard />

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-ink-soft">
          {list.data ? `${list.data.total} submissions, page ${currentPage} of ${totalPages}` : ""}
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" size="md" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
            <ArrowLeft size={16} weight="bold" />
            Previous
          </Button>
          <Button
            variant="secondary"
            size="md"
            disabled={currentPage >= totalPages}
            onClick={() => setPage(currentPage + 1)}
          >
            Next
            <ArrowRight size={16} weight="bold" />
          </Button>
        </div>
      </div>
    </div>
  );
}
