import { CircleNotch, SealCheck, Trash } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Controller, useFieldArray, useForm, type Path } from "react-hook-form";
import { Link } from "react-router-dom";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, ApiError, type FieldIssue, type SubmissionPayload } from "@/lib/api";
import { severityLabel } from "@/lib/format";
import { usePageTitle } from "@/lib/usePageTitle";
import { submissionCreateSchema } from "@/shared/schemas";
import { SEVERITIES, VULNERABILITY_TYPES } from "@/shared/types";

type FormValues = {
  reporter_name: string;
  reporter_email: string;
  reporter_org: string;
  title: string;
  vulnerability_type: string;
  vendor: string;
  product: string;
  affected_versions: string;
  severity: string;
  cvss_score: string;
  cvss_vector: string;
  cve_id: string;
  cwe_ids: string;
  description: string;
  technical_details: string;
  poc: string;
  references: { url: string }[];
  consent: boolean;
  company_website: string;
};

const EMPTY_FORM: FormValues = {
  reporter_name: "",
  reporter_email: "",
  reporter_org: "",
  title: "",
  vulnerability_type: "",
  vendor: "",
  product: "",
  affected_versions: "",
  severity: "",
  cvss_score: "",
  cvss_vector: "",
  cve_id: "",
  cwe_ids: "",
  description: "",
  technical_details: "",
  poc: "",
  references: [{ url: "" }],
  consent: false,
  company_website: "",
};

function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
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

function SectionHeading({ index, title, body }: { index: number; title: string; body: string }) {
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

export function RequestForm() {
  usePageTitle("Request a GCVE identifier");

  const config = useQuery({ queryKey: ["public-config"], queryFn: api.publicConfig, staleTime: Infinity });
  const [token, setToken] = useState("");
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: EMPTY_FORM, mode: "onSubmit" });

  const references = useFieldArray({ control, name: "references" });
  const descriptionLength = watch("description").length;

  const applyIssues = (issues: FieldIssue[]) => {
    for (const issue of issues) {
      const path = issue.path.replace(/^references\.(\d+)$/, "references.$1.url");
      setError(path as Path<FormValues>, { type: "validation", message: issue.message });
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    setBanner(null);

    const payload: SubmissionPayload = {
      reporter_name: values.reporter_name,
      reporter_email: values.reporter_email,
      reporter_org: values.reporter_org,
      title: values.title,
      vulnerability_type: values.vulnerability_type,
      vendor: values.vendor,
      product: values.product,
      affected_versions: values.affected_versions,
      severity: values.severity,
      cvss_score: values.cvss_score,
      cvss_vector: values.cvss_vector,
      cve_id: values.cve_id,
      cwe_ids: values.cwe_ids,
      description: values.description,
      technical_details: values.technical_details,
      poc: values.poc,
      references: values.references.map((entry) => entry.url).filter((url) => url.trim() !== ""),
      consent: values.consent,
      turnstile_token: token || undefined,
      company_website: values.company_website,
    };

    const local = submissionCreateSchema.safeParse(payload);
    if (!local.success) {
      applyIssues(local.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })));
      setBanner("Check the highlighted fields before submitting.");
      return;
    }

    try {
      const result = await api.submitReport(payload);
      setReference(result.reference);
    } catch (error) {
      if (error instanceof ApiError) {
        applyIssues(error.issues);
        setBanner(error.message);
      } else {
        setBanner("The report could not be sent. Check your connection and try again.");
      }
      setToken("");
      setTurnstileKey((value) => value + 1);
    }
  });

  if (reference) {
    return (
      <div className="container-x py-20">
        <Stagger className="mx-auto max-w-2xl border border-surface-high p-10 text-center">
          <StaggerItem>
            <SealCheck size={44} weight="fill" className="mx-auto text-success" aria-hidden="true" />
          </StaggerItem>
          <StaggerItem>
            <h1 className="headline-lg mt-6">Report received</h1>
          </StaggerItem>
          <StaggerItem>
            <p className="font-mono text-2xl font-bold text-brand mt-6">{reference}</p>
          </StaggerItem>
          <StaggerItem>
            <p className="mt-6 text-ink-soft">
              Keep this reference for correspondence. You will be contacted at the address provided. Most reports are
              triaged within five business days.
            </p>
          </StaggerItem>
          <StaggerItem>
            <Button asChild variant="secondary" className="mt-8">
              <Link to="/disclosures">Browse disclosures</Link>
            </Button>
          </StaggerItem>
        </Stagger>
      </div>
    );
  }

  return (
    <div className="container-x py-14">
      <Reveal>
        <h1 className="display-1 max-w-[26ch]">Request a GCVE identifier</h1>
        <p className="body-lg mt-4 max-w-[62ch] text-ink-soft">
          Report a vulnerability to GNA-115. If the report is accepted, it is published with a GCVE identifier in the
          public register.
        </p>
      </Reveal>

      <form onSubmit={onSubmit} noValidate className="mt-14 max-w-3xl space-y-14">
        <section className="space-y-6">
          <SectionHeading index={1} title="Contact" body="Used to coordinate the report. Never published." />
          <div className="grid gap-6 md:grid-cols-2">
            <Field label="Your name" htmlFor="reporter_name" error={errors.reporter_name?.message}>
              <Input id="reporter_name" autoComplete="name" {...register("reporter_name")} />
            </Field>
            <Field label="Email" htmlFor="reporter_email" error={errors.reporter_email?.message}>
              <Input id="reporter_email" type="email" autoComplete="email" {...register("reporter_email")} />
            </Field>
          </div>
          <Field label="Organization (optional)" htmlFor="reporter_org" error={errors.reporter_org?.message}>
            <Input id="reporter_org" autoComplete="organization" {...register("reporter_org")} />
          </Field>
        </section>

        <section className="space-y-6">
          <SectionHeading index={2} title="Vulnerability" body="What is affected, and how severe the impact is." />
          <Field label="Title" htmlFor="title" error={errors.title?.message}>
            <Input id="title" placeholder="Unauthenticated device reset in the web interface" {...register("title")} />
          </Field>

          <div className="grid gap-6 md:grid-cols-2">
            <Field label="Vulnerability type" error={errors.vulnerability_type?.message}>
              <Controller
                control={control}
                name="vulnerability_type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger aria-label="Vulnerability type">
                      <SelectValue placeholder="Select a type" />
                    </SelectTrigger>
                    <SelectContent>
                      {VULNERABILITY_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field label="Severity" error={errors.severity?.message}>
              <Controller
                control={control}
                name="severity"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger aria-label="Severity">
                      <SelectValue placeholder="Select a severity" />
                    </SelectTrigger>
                    <SelectContent>
                      {SEVERITIES.map((severity) => (
                        <SelectItem key={severity} value={severity}>
                          {severityLabel(severity)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Field label="Vendor" htmlFor="vendor" error={errors.vendor?.message}>
              <Input id="vendor" {...register("vendor")} />
            </Field>
            <Field label="Product" htmlFor="product" error={errors.product?.message}>
              <Input id="product" {...register("product")} />
            </Field>
          </div>

          <Field label="Affected versions" htmlFor="affected_versions" error={errors.affected_versions?.message}>
            <Input id="affected_versions" placeholder="1.4.2 and earlier" {...register("affected_versions")} />
          </Field>

          <div className="grid gap-6 md:grid-cols-2">
            <Field
              label="CVSS score (optional)"
              htmlFor="cvss_score"
              error={errors.cvss_score?.message}
              hint="0 to 10, matching the vector below."
            >
              <Input id="cvss_score" inputMode="decimal" {...register("cvss_score")} />
            </Field>
            <Field
              label="CVSS vector (optional)"
              htmlFor="cvss_vector"
              error={errors.cvss_vector?.message}
              hint="CVSS 3.1 or 4.0, for example CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"
            >
              <Input id="cvss_vector" className="font-mono text-sm" {...register("cvss_vector")} />
            </Field>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Field
              label="Existing CVE (optional)"
              htmlFor="cve_id"
              error={errors.cve_id?.message}
              hint="Leave empty unless a CVE already exists for this vulnerability."
            >
              <Input id="cve_id" className="font-mono text-sm" {...register("cve_id")} />
            </Field>
            <Field
              label="CWE identifiers (optional)"
              htmlFor="cwe_ids"
              error={errors.cwe_ids?.message}
              hint="Comma separated, up to five, for example CWE-79, CWE-862."
            >
              <Input id="cwe_ids" className="font-mono text-sm" {...register("cwe_ids")} />
            </Field>
          </div>
        </section>

        <section className="space-y-6">
          <SectionHeading index={3} title="Details" body="What the vulnerability does and how to reproduce it." />
          <Field
            label="Description"
            htmlFor="description"
            error={errors.description?.message}
            hint={`${descriptionLength} of 8000 characters, minimum 50.`}
          >
            <Textarea id="description" rows={6} {...register("description")} />
          </Field>

          <Field label="Technical details (optional)" htmlFor="technical_details" error={errors.technical_details?.message}>
            <Textarea id="technical_details" rows={6} {...register("technical_details")} />
          </Field>

          <Field label="Proof of concept (optional)" htmlFor="poc" error={errors.poc?.message}>
            <Textarea id="poc" rows={6} className="font-mono text-sm" {...register("poc")} />
          </Field>

          <div>
            <Label>References (optional)</Label>
            <p className="mt-1 text-xs text-ink-soft">Up to ten links to advisories, patches, or write ups.</p>
            <div className="mt-2 space-y-3">
              {references.fields.map((entry, index) => (
                <div key={entry.id}>
                  <div className="flex gap-2">
                    <Input
                      aria-label={`Reference ${index + 1}`}
                      placeholder="https://"
                      {...register(`references.${index}.url` as const)}
                    />
                    {references.fields.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => references.remove(index)}
                        aria-label={`Remove reference ${index + 1}`}
                      >
                        <Trash size={16} weight="bold" />
                      </Button>
                    ) : null}
                  </div>
                  {errors.references?.[index]?.url?.message ? (
                    <p role="alert" className="mt-1 text-sm text-danger">
                      {errors.references[index]?.url?.message}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
            {references.fields.length < 10 ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => references.append({ url: "" })}
              >
                Add reference
              </Button>
            ) : null}
          </div>
        </section>

        <section className="space-y-6">
          <SectionHeading index={4} title="Review" body="Confirm the policy and pass bot verification." />
          <Controller
            control={control}
            name="consent"
            render={({ field }) => (
              <div>
                <div className="flex items-start gap-3">
                  <Checkbox id="consent" checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
                  <Label htmlFor="consent" className="font-normal text-ink-soft">
                    I agree to the{" "}
                    <Link to="/policy" className="link-body">
                      disclosure policy
                    </Link>{" "}
                    and to being contacted about this report.
                  </Label>
                </div>
                {errors.consent?.message ? (
                  <p role="alert" className="mt-2 text-sm text-danger">
                    {errors.consent.message}
                  </p>
                ) : null}
              </div>
            )}
          />

          <input
            {...register("company_website")}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="sr-only"
            aria-label="Leave this field empty"
          />

          <TurnstileWidget
            key={turnstileKey}
            siteKey={config.data?.turnstileSiteKey ?? null}
            onToken={setToken}
          />

          {banner ? (
            <p role="alert" className="border-l-4 border-danger bg-surface-dim px-4 py-3 text-sm text-ink">
              {banner}
            </p>
          ) : null}

          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? <CircleNotch size={18} weight="bold" className="animate-spin" /> : null}
            {isSubmitting ? "Sending report" : "Submit report"}
          </Button>
        </section>
      </form>
    </div>
  );
}
