import { ArrowUpRight, CircleNotch, Plus, SealCheck, Trash } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useFieldArray, useForm, type Path } from "react-hook-form";
import { Link } from "react-router-dom";
import { Field, SectionHeading } from "@/components/FormField";
import { Stagger, StaggerItem } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, ApiError, type FieldIssue, type GcveRecordPayload } from "@/lib/api";
import { downloadJson } from "@/lib/download";
import { severityLabel } from "@/lib/format";
import { usePageTitle } from "@/lib/usePageTitle";
import { gcveRecordCreateSchema } from "@/shared/schemas";
import { SEVERITIES, VULNERABILITY_TYPES, type GcveCreateResponse } from "@/shared/types";

type FormValues = {
  title: string;
  vulnerability_type: string;
  severity: string;
  vendor: string;
  product: string;
  affected_versions: string;
  cvss_score: string;
  cvss_vector: string;
  cve_id: string;
  cwe_ids: string;
  description: string;
  technical_details: string;
  poc: string;
  references: { url: string }[];
  credits: string;
  date_public: string;
};

const EMPTY_FORM: FormValues = {
  title: "",
  vulnerability_type: "",
  severity: "",
  vendor: "",
  product: "",
  affected_versions: "",
  cvss_score: "",
  cvss_vector: "",
  cve_id: "",
  cwe_ids: "",
  description: "",
  technical_details: "",
  poc: "",
  references: [{ url: "" }],
  credits: "",
  date_public: "",
};

/**
 * Allocates a GCVE identifier straight away, for advisories the authority
 * writes itself rather than ones submitted through the public form.
 */
export function NewRecord() {
  usePageTitle("Add GCVE record");

  const queryClient = useQueryClient();
  const [banner, setBanner] = useState<string | null>(null);
  const [created, setCreated] = useState<GcveCreateResponse | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: EMPTY_FORM });

  const references = useFieldArray({ control, name: "references" });

  const applyIssues = (issues: FieldIssue[]) => {
    for (const issue of issues) {
      const path = issue.path.replace(/^references\.(\d+)$/, "references.$1.url");
      setError(path as Path<FormValues>, { type: "validation", message: issue.message });
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    setBanner(null);

    const payload: GcveRecordPayload = {
      title: values.title,
      vulnerability_type: values.vulnerability_type,
      severity: values.severity,
      vendor: values.vendor,
      product: values.product,
      affected_versions: values.affected_versions,
      cvss_score: values.cvss_score,
      cvss_vector: values.cvss_vector,
      cve_id: values.cve_id,
      cwe_ids: values.cwe_ids,
      description: values.description,
      technical_details: values.technical_details,
      poc: values.poc,
      references: values.references.map((entry) => entry.url).filter((url) => url.trim() !== ""),
      credits: values.credits,
      date_public: values.date_public,
    };

    const local = gcveRecordCreateSchema.safeParse(payload);
    if (!local.success) {
      applyIssues(local.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })));
      setBanner("Check the highlighted fields before allocating.");
      return;
    }

    try {
      const result = await api.createGcve(payload);
      setCreated(result);
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
      void queryClient.invalidateQueries({ queryKey: ["gcves"] });
    } catch (error) {
      if (error instanceof ApiError) {
        applyIssues(error.issues);
        setBanner(error.message);
      } else {
        setBanner("The record could not be created. Check your connection and try again.");
      }
    }
  });

  if (created) {
    return (
      <div className="mx-auto max-w-2xl">
        <Stagger className="border border-surface-high bg-surface p-8">
          <StaggerItem>
            <SealCheck size={40} weight="fill" className="text-success" aria-hidden="true" />
          </StaggerItem>
          <StaggerItem>
            <h1 className="headline-lg mt-4">Identifier allocated</h1>
          </StaggerItem>
          <StaggerItem>
            <p className="mt-4 font-mono text-2xl font-bold text-brand">{created.gcveId}</p>
            <p className="mt-2 text-sm text-ink-soft">
              Intake reference <span className="font-mono">{created.reference}</span>. The record is published and served
              through the GCVE pull API immediately.
            </p>
          </StaggerItem>
          <StaggerItem>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild variant="secondary">
                <Link to={`/disclosures/${created.gcveId}`}>
                  View public record
                  <ArrowUpRight size={16} weight="bold" />
                </Link>
              </Button>
              <Button variant="ghost" onClick={() => downloadJson(`${created.gcveId}.json`, created.record)}>
                Download JSON
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setCreated(null);
                  reset(EMPTY_FORM);
                }}
              >
                <Plus size={16} weight="bold" />
                Add another record
              </Button>
            </div>
          </StaggerItem>
        </Stagger>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="headline-lg">Add GCVE record</h1>
      <p className="mt-2 max-w-[70ch] text-sm text-ink-soft">
        Allocates the next free GCVE-115 identifier for the current year and publishes a BCP-05 record straight away,
        without a submission from the public form.
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-10 space-y-12">
        <section className="space-y-6">
          <SectionHeading index={1} title="Advisory" body="What is affected and how severe the impact is." />

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
              hint="0 to 10, matching the vector below."
              error={errors.cvss_score?.message}
            >
              <Input id="cvss_score" inputMode="decimal" {...register("cvss_score")} />
            </Field>
            <Field
              label="CVSS vector (optional)"
              htmlFor="cvss_vector"
              hint="CVSS 3.1 or 4.0."
              error={errors.cvss_vector?.message}
            >
              <Input id="cvss_vector" className="font-mono text-sm" {...register("cvss_vector")} />
            </Field>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Field
              label="Existing CVE (optional)"
              htmlFor="cve_id"
              hint="Links the record to a CVE as an equal relationship."
              error={errors.cve_id?.message}
            >
              <Input id="cve_id" className="font-mono text-sm" {...register("cve_id")} />
            </Field>
            <Field
              label="CWE identifiers (optional)"
              htmlFor="cwe_ids"
              hint="Comma separated, up to five."
              error={errors.cwe_ids?.message}
            >
              <Input id="cwe_ids" className="font-mono text-sm" {...register("cwe_ids")} />
            </Field>
          </div>
        </section>

        <section className="space-y-6">
          <SectionHeading index={2} title="Content" body="Written up the way it should appear in the register." />

          <Field label="Description" htmlFor="description" error={errors.description?.message}>
            <Textarea id="description" rows={6} {...register("description")} />
          </Field>

          <Field label="Technical details (optional)" htmlFor="technical_details" error={errors.technical_details?.message}>
            <Textarea id="technical_details" rows={6} {...register("technical_details")} />
          </Field>

          <Field label="Proof of concept (optional)" htmlFor="poc" error={errors.poc?.message}>
            <Textarea id="poc" rows={6} className="font-mono text-sm" {...register("poc")} />
          </Field>

          <div>
            <p className="text-sm font-semibold text-ink">References (optional)</p>
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
          <SectionHeading index={3} title="Attribution" body="Optional credit and publication date." />

          <div className="grid gap-6 md:grid-cols-2">
            <Field
              label="Credits (optional)"
              htmlFor="credits"
              hint="Defaults to the authority name."
              error={errors.credits?.message}
            >
              <Input id="credits" {...register("credits")} />
            </Field>
            <Field
              label="Public date (optional)"
              htmlFor="date_public"
              hint="Original disclosure date, YYYY-MM-DD."
              error={errors.date_public?.message}
            >
              <Input id="date_public" placeholder="2018-10-15" {...register("date_public")} />
            </Field>
          </div>
        </section>

        {banner ? (
          <p role="alert" className="border-l-4 border-danger bg-surface-dim px-4 py-3 text-sm text-ink">
            {banner}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-4 border-t border-surface-high pt-6">
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? <CircleNotch size={18} weight="bold" className="animate-spin" /> : null}
            {isSubmitting ? "Allocating" : "Allocate GCVE identifier"}
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link to="/admin">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
