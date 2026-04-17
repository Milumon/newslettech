import type { DigestResult } from "@/lib/digest/types";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function createDigestEmailHtml(digest: DigestResult): string {
  const sectionHtml = digest.sections
    .map((section) => {
      const items =
        section.items.length === 0
          ? "<li>No items found for your current filters.</li>"
          : section.items
              .map((item) => {
                return `<li style=\"margin: 0 0 12px;\">\n<a href=\"${escapeHtml(item.url)}\" style=\"font-weight:700;color:#0a4a92;text-decoration:none;\">${escapeHtml(item.title)}</a><br/>\n<span style=\"color:#3f3f46;\">${escapeHtml(item.description)}</span>${
                  item.score ? `<br/><small style=\"color:#52525b;\">${escapeHtml(item.score)}</small>` : ""
                }\n</li>`;
              })
              .join("\n");

      return `<section style=\"margin: 20px 0;\">\n<h2 style=\"margin:0 0 10px;color:#18181b;\">${escapeHtml(section.heading)}</h2>\n<ul style=\"padding-left: 20px; margin: 0;\">${items}</ul>\n</section>`;
    })
    .join("\n");

  return `<!doctype html>
<html>
  <body style="font-family: -apple-system, Segoe UI, Arial, sans-serif; background:#f4f4f5; margin:0; padding:24px; color:#111827;">
    <main style="max-width:680px; margin:0 auto; background:#fff; border-radius:14px; border:1px solid #e4e4e7; padding:24px;">
      <h1 style="margin:0 0 8px;">Your Newslettech Digest</h1>
      <p style="margin:0 0 12px; color:#52525b;">Generated at ${escapeHtml(new Date(digest.generatedAt).toLocaleString())}</p>
      <p style="margin:0 0 6px;"><strong>Topics:</strong> ${escapeHtml(digest.preferences.topics || "General")}</p>
      <p style="margin:0 0 6px;"><strong>GitHub:</strong> ${escapeHtml(
        digest.preferences.githubLanguage || "All languages",
      )} (${escapeHtml(digest.preferences.githubSince)})</p>
      <p style="margin:0;"><strong>Subreddits:</strong> ${escapeHtml(
        digest.preferences.subreddits || "programming, webdev, javascript",
      )}</p>
      ${sectionHtml}
    </main>
  </body>
</html>`;
}
