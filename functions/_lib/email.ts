type EmailParams = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

const DEFAULT_FROM = "GNA-115 Disclosures <onboarding@resend.dev>";

export const emailSender = (from: string | undefined): string => from || DEFAULT_FROM;

export async function sendEmail(
  apiKey: string | undefined,
  from: string | undefined,
  params: EmailParams,
): Promise<void> {
  if (!apiKey) return;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: emailSender(from), ...params }),
  });
  if (!response.ok) {
    throw new Error(`Resend API error: ${await response.text()}`);
  }
}

const statusLabel = (status: string): string =>
  status
    .split("_")
    .map((word) => (word ? word[0]!.toUpperCase() + word.slice(1) : word))
    .join(" ");

export function statusChangeEmail(
  reference: string,
  status: string,
  gcveId: string | null,
  siteUrl: string,
): { subject: string; html: string; text: string } {
  const label = statusLabel(status);
  const subject = `Submission ${reference} status: ${label}`;
  const statusUrl = `${siteUrl}/status`;
  const html =
    `<p>Your vulnerability report <strong>${reference}</strong> has been updated.</p>` +
    `<p><strong>Status:</strong> ${label}</p>` +
    (gcveId ? `<p><strong>GCVE ID:</strong> ${gcveId}</p>` : "") +
    `<p>Track it any time with your secret link: <a href="${statusUrl}">${statusUrl}</a></p>`;
  const text =
    `Your vulnerability report ${reference} has been updated.\n\nStatus: ${label}\n` +
    (gcveId ? `GCVE ID: ${gcveId}\n` : "") +
    `\nTrack it any time with your secret link: ${statusUrl}`;
  return { subject, html, text };
}

const escapeHtml = (value: string): string =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

export function newSubmissionEmail(
  reference: string,
  title: string,
  reporterName: string,
  siteUrl: string,
): { subject: string; html: string; text: string } {
  const safeReference = escapeHtml(reference);
  const safeTitle = escapeHtml(title);
  const safeReporterName = escapeHtml(reporterName);
  const submissionsUrl = `${siteUrl}/admin`;
  return {
    subject: `New submission ${reference}: ${title}`,
    html:
      "<p>A new vulnerability report was submitted.</p>" +
      `<p><strong>Reference:</strong> ${safeReference}</p>` +
      `<p><strong>Title:</strong> ${safeTitle}</p>` +
      `<p><strong>Reporter:</strong> ${safeReporterName}</p>` +
      `<p>Review it in the admin panel: <a href="${submissionsUrl}">${submissionsUrl}</a></p>`,
    text: `A new vulnerability report was submitted.\n\nReference: ${reference}\nTitle: ${title}\nReporter: ${reporterName}\n\nReview it in the admin panel: ${submissionsUrl}`,
  };
}
