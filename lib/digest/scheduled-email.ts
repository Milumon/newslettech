import type { DigestResult } from "@/lib/digest/types";
import type { DigestSummary } from "@/lib/digest/gemini";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeQuickScanForEmail(value: string): string {
  return value
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .replace(/`/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sourceEmoji(source: string): string {
  if (source === "producthunt") return "🚀";
  if (source === "github") return "💻";
  return "💬";
}

function formatDate(): string {
  const now = new Date();
  const months = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  return `${now.getDate()} de ${months[now.getMonth()]} ${now.getFullYear()}`;
}

export function createScheduledDigestEmailHtml(digest: DigestResult, summary: DigestSummary): string {
  const quickScan = normalizeQuickScanForEmail(summary.quickScanSummary);

  const sectionsHtml = summary.sectionSummaries
    .map((section) => {
      const itemRows = section.itemInsights
        .map((item) => {
          const topBadge = item.isTopPick
            ? `<span style="display:inline-block;background:#0071e3;color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;margin-left:8px;vertical-align:middle;">TOP PICK</span>`
            : "";

          return `<tr>
  <td style="padding:12px 24px;border-bottom:1px solid #f0f0f2;">
    <a href="${esc(item.url)}" style="font-size:15px;font-weight:600;color:#1d1d1f;text-decoration:none;">${esc(item.title)}${topBadge}</a>
    <p style="margin:4px 0 0;font-size:13px;line-height:1.5;color:#6e6e73;">${esc(item.summary)}</p>
    <a href="${esc(item.url)}" style="display:inline-block;margin-top:6px;font-size:12px;color:#0066cc;text-decoration:none;">Ver fuente →</a>
  </td>
</tr>`;
        })
        .join("\n");

      return `<!-- Section: ${esc(section.heading)} -->
<tr>
  <td style="padding:20px 24px 10px;">
    <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#0071e3;">${sourceEmoji(section.source)} ${esc(section.heading)}</p>
    <p style="margin:6px 0 0;font-size:13px;color:#6e6e73;line-height:1.4;">${esc(section.editorial)}</p>
  </td>
</tr>
${itemRows || `<tr><td style="padding:12px 24px;color:#86868b;font-size:13px;">Sin novedades relevantes hoy.</td></tr>`}
<tr><td style="height:8px;"></td></tr>`;
    })
    .join("\n");

  const actionsHtml = summary.actionItems
    .map(
      (action, index) => `<tr>
  <td style="padding:6px 24px;font-size:14px;color:#1d1d1f;line-height:1.5;">
    <span style="display:inline-block;width:22px;height:22px;background:#0071e3;color:#fff;font-size:11px;font-weight:700;text-align:center;line-height:22px;border-radius:50%;margin-right:10px;vertical-align:middle;">${index + 1}</span>
    ${esc(action)}
  </td>
</tr>`,
    )
    .join("\n");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,'Segoe UI','Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:24px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;">

          <tr>
            <td style="background:#000;padding:28px 24px;">
              <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;color:#2997ff;">Newslettech</p>
              <h1 style="margin:8px 0 0;font-size:24px;font-weight:600;color:#fff;line-height:1.15;letter-spacing:-0.02em;">Tu resumen de hoy</h1>
              <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.6);">${esc(formatDate())} · Lectura de 2 min</p>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 24px;background:#f5f5f7;border-bottom:1px solid #e8e8ed;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#86868b;">🔍 Lectura rapida</p>
              <p style="margin:0;font-size:15px;line-height:1.65;color:#1d1d1f;font-weight:400;">${esc(quickScan)}</p>
            </td>
          </tr>

          ${sectionsHtml}

          <tr><td style="padding:0 24px;"><hr style="border:none;border-top:1px solid #e8e8ed;margin:8px 0;"></td></tr>

          <tr>
            <td style="padding:16px 24px 8px;">
              <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#86868b;">📝 Que hacer hoy</p>
            </td>
          </tr>
          ${actionsHtml}

          <tr>
            <td style="padding:20px 24px;border-top:1px solid #e8e8ed;margin-top:12px;">
              <p style="margin:0;font-size:11px;color:#86868b;line-height:1.5;">Configurado para ${digest.preferences.maxItems} resultados por fuente · Ajusta tus preferencias cuando quieras.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
