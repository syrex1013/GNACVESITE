type EmailParams = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

const DEFAULT_FROM = "GNA-115 Disclosures <onboarding@resend.dev>";

export async function sendEmail(
  apiKey: string | undefined,
  from: string | undefined,
  params: EmailParams,
): Promise<void> {
  if (!apiKey) return;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: from || DEFAULT_FROM, ...params }),
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
