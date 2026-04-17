import type { DigestItem, DigestResult, DigestSource } from "@/lib/digest/types";

export interface ItemInsight {
  id: string;
  source: DigestSource;
  title: string;
  url: string;
  summary: string;
  isTopPick: boolean;
}

export interface SectionInsight {
  source: DigestSource;
  heading: string;
  editorial: string;
  itemInsights: ItemInsight[];
}

export interface DigestSummary {
  sectionSummaries: SectionInsight[];
  quickScanSummary: string;
  actionItems: string[];
}

function clampText(value: string, maxChars: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, maxChars - 1).trimEnd()}…`;
}

function stripMarkdownNoise(value: string): string {
  return value
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .replace(/`/g, "")
    .replace(/^\s*#+\s*/gm, "")
    .replace(/^\s*>\s*/gm, "")
    .replace(/^\s*[\-•]\s*/gm, "")
    .replace(/[“”]/g, "\"")
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function stripLabelNoise(value: string): string {
  return value
    .replace(/\bsecci[oó]n\s*:\s*/gi, "")
    .replace(/\binsight\s*:\s*/gi, "")
    .replace(/\bresumen\s*:\s*/gi, "")
    .replace(/\baction\s*:\s*/gi, "Accion: ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeOutput(value: string, maxChars: number): string {
  return trimToSentence(stripLabelNoise(stripMarkdownNoise(value)), maxChars);
}

function looksLikeBadFormat(value: string): boolean {
  const text = value.toLowerCase();
  return /\*\*|__|`|secci[oó]n\s*:|insight\s*:|resumen\s*:/.test(text);
}

function trimToSentence(value: string, maxChars: number): string {
  const clean = stripMarkdownNoise(value);
  if (clean.length <= maxChars) return clean;

  const slice = clean.slice(0, maxChars);
  const lastBoundary = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("; "), slice.lastIndexOf(": "));

  if (lastBoundary > 120) {
    return slice.slice(0, lastBoundary + 1).trim();
  }

  return slice.trim();
}

function sourceLabel(source: DigestSource): string {
  if (source === "producthunt") return "Product Hunt";
  if (source === "github") return "GitHub Trending";
  return "Reddit";
}

function sourceLabelEs(source: DigestSource): string {
  if (source === "producthunt") return "en Product Hunt";
  if (source === "github") return "en GitHub";
  return "en Reddit";
}

function detectSignals(text: string): string[] {
  const normalized = text.toLowerCase();
  const signals: string[] = [];

  if (/(ai|ia|agent|agente|llm|gpt|claude|gemini)/.test(normalized)) {
    signals.push("la IA aplicada se esta volviendo infraestructura");
  }
  if (/(workflow|automatiz|integraci[oó]n|api|pipeline|n8n)/.test(normalized)) {
    signals.push("la automatizacion operativa gana prioridad");
  }
  if (/(open source|opensource|repo|github|stars)/.test(normalized)) {
    signals.push("el open source marca el ritmo de adopcion");
  }
  if (/(job|hiring|empleo|vacante|career|salario)/.test(normalized)) {
    signals.push("hay señales de reajuste en el mercado laboral tech");
  }

  if (signals.length === 0) {
    signals.push("el dia favorece mejoras tacticas de ejecucion");
  }

  return signals.slice(0, 2);
}

function itemSummaryFallback(item: DigestItem): string {
  const desc = item.description || item.title;
  return clampText(`${desc} ${sourceLabelEs(item.source)}.`, 200);
}

function sectionEditorialFallback(heading: string, items: DigestItem[]): string {
  if (items.length === 0) {
    return `Sin señales fuertes en ${heading}; mantén foco en prioridades abiertas y revisamos en el siguiente envio.`;
  }

  const text = items.map((item) => `${item.title} ${item.description}`).join(" ");
  const signals = detectSignals(text);

  return clampText(
    `En ${heading}, ${signals.join(" y ")}. La oportunidad real esta en probar solo una mejora concreta y medir resultado antes de escalar.`,
    210,
  );
}

function quickScanFallback(sections: SectionInsight[]): string {
  const allItems = sections.flatMap((section) => section.itemInsights);
  if (allItems.length === 0) {
    return "Dia liviano en señales fuertes. Conviene proteger foco y usar el tiempo en ejecutar pendientes de alto impacto.";
  }

  const sectionLines = sections
    .filter((section) => section.itemInsights.length > 0)
    .map((section) => {
      const pick = section.itemInsights.find((item) => item.isTopPick) ?? section.itemInsights[0];
      return `${section.heading}: ${pick.title}.`;
    })
    .slice(0, 3)
    .join(" ");

  const signals = detectSignals(allItems.map((item) => item.summary).join(" "));

  return clampText(
    `${sectionLines} En conjunto, ${signals.join(" y ")}. Riesgo de ignorarlo: perder velocidad frente a equipos que ya estan operando con flujos mas eficientes.`,
    850,
  );
}

function actionItemsFallback(sections: SectionInsight[]): string[] {
  const allItems = sections.flatMap((section) => section.itemInsights);
  const actions: string[] = [];

  const fromPH = allItems.find((item) => item.source === "producthunt");
  const fromGH = allItems.find((item) => item.source === "github");
  const fromRD = allItems.find((item) => item.source === "reddit");

  if (fromPH) {
    actions.push(`Probar ${fromPH.title} durante 20 min y validar si reduce friccion real`);
  }
  if (fromGH) {
    actions.push(`Revisar ${fromGH.title} y decidir hoy si entra a tu backlog tecnico`);
  }
  if (fromRD) {
    actions.push(`Leer la discusion de ${fromRD.title} para detectar riesgos y oportunidades`);
  }

  return actions.slice(0, 3);
}

async function callGroq(prompt: string, maxTokens: number): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.35,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) return null;

  const payload = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return payload.choices?.[0]?.message?.content ?? null;
}

async function callGeminiProvider(prompt: string, maxTokens: number): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: maxTokens,
        },
      }),
    },
  );

  if (!res.ok) return null;

  const payload = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  return payload.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

async function callLlm(prompt: string, maxTokens: number): Promise<string | null> {
  const preferred = process.env.LLM_PROVIDER?.toLowerCase();

  if (preferred === "gemini") {
    return (await callGeminiProvider(prompt, maxTokens)) ?? (await callGroq(prompt, maxTokens));
  }

  return (await callGroq(prompt, maxTokens)) ?? (await callGeminiProvider(prompt, maxTokens));
}

async function callText(prompt: string, maxChars: number, fallback: string, maxTokens: number) {
  const text = await callLlm(prompt, maxTokens);
  if (!text) return sanitizeOutput(fallback, maxChars);

  if (looksLikeBadFormat(text)) {
    const secondPass = await callLlm(
      `${prompt}\n\nIMPORTANTE FINAL: devuelve solo texto plano en una sola salida, sin markdown, sin etiquetas tipo 'Seccion:' o 'Insight:'.`,
      maxTokens,
    );
    return sanitizeOutput(secondPass ?? text, maxChars);
  }

  return sanitizeOutput(text, maxChars);
}

async function callLines(prompt: string, fallback: string[]): Promise<string[]> {
  const text = await callLlm(prompt, 220);
  if (!text) return fallback;

  const lines = text
    .split("\n")
    .map((line) => line.replace(/^[\d.\-•*]+\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((line) => sanitizeOutput(line, 120));

  return lines.length > 0 ? lines : fallback;
}

function itemSummaryPrompt(item: DigestItem, topics: string): string {
  return [
    "Eres editor de newsletter tecnico. Responde solo en espanol.",
    "Resume este item en 1 frase util (max 190 caracteres).",
    "Incluye por que importa para el lector. Sin relleno.",
    "Formato obligatorio: texto plano, sin markdown, sin etiquetas, sin comillas.",
    `Intereses: ${topics || "desarrollo de software"}`,
    `Fuente: ${sourceLabel(item.source)}`,
    `Titulo: ${item.title}`,
    `Descripcion: ${item.description}`,
  ].join("\n");
}

function sectionEditorialPrompt(heading: string, itemSummaries: string[], topics: string): string {
  return [
    "Eres editor jefe. Responde en espanol.",
    "Escribe 1 insight por seccion (max 210 caracteres).",
    "Debe capturar patron y relevancia para negocio/productividad.",
    "Formato obligatorio: texto plano, sin markdown, sin etiquetas tipo 'Seccion:' o 'Insight:'.",
    `Intereses: ${topics || "desarrollo de software"}`,
    `Seccion: ${heading}`,
    `Items: ${itemSummaries.join(" | ")}`,
  ].join("\n");
}

function quickScanPrompt(sectionEditorials: string[], topics: string): string {
  return [
    "Escribe un resumen editorial en espanol de ALTA SEÑAL.",
    "Formato: 3 a 5 frases, max 850 caracteres.",
    "Debe incluir: patron del dia, por que importa, riesgo de ignorarlo y foco recomendado.",
    "Sin frases genericas ni titulares copiados.",
    "Formato obligatorio: texto plano corrido, sin markdown, sin asteriscos, sin encabezados, sin etiquetas.",
    `Intereses: ${topics || "desarrollo de software"}`,
    `Insights por seccion: ${sectionEditorials.join(" | ")}`,
  ].join("\n");
}

function actionItemsPrompt(sections: SectionInsight[], topics: string): string {
  const context = sections
    .flatMap((section) => section.itemInsights.map((item) => `${item.title}: ${item.summary}`))
    .join(" | ");

  return [
    "Genera 3 acciones concretas en espanol para hoy.",
    "Max 95 caracteres por accion.",
    "Deben ser diferentes y accionables en menos de 30 min.",
    "Formato obligatorio: una accion por linea, texto plano, sin numeracion, sin markdown.",
    `Intereses: ${topics || "desarrollo de software"}`,
    `Contexto: ${context}`,
  ].join("\n");
}

export async function summarizeDigestWithGemini(digest: DigestResult): Promise<DigestSummary> {
  const sectionSummaries: SectionInsight[] = [];

  for (const section of digest.sections) {
    const itemInsights: ItemInsight[] = [];

    for (const item of section.items) {
      const summary = await callText(
        itemSummaryPrompt(item, digest.preferences.topics),
        200,
        itemSummaryFallback(item),
        120,
      );

      itemInsights.push({
        id: item.id,
        source: item.source,
        title: item.title,
        url: item.url,
        summary,
        isTopPick: false,
      });
    }

    if (itemInsights.length > 0) {
      itemInsights[0].isTopPick = true;
    }

    const editorial = await callText(
      sectionEditorialPrompt(
        section.heading,
        itemInsights.map((item) => item.summary),
        digest.preferences.topics,
      ),
      210,
      sectionEditorialFallback(section.heading, section.items),
      120,
    );

    sectionSummaries.push({
      source: section.source,
      heading: section.heading,
      editorial,
      itemInsights,
    });
  }

  const quickScanSummary = await callText(
    quickScanPrompt(
      sectionSummaries.map((section) => section.editorial),
      digest.preferences.topics,
    ),
    1200,
    quickScanFallback(sectionSummaries),
    520,
  );

  const cleanQuickScanSummary = trimToSentence(quickScanSummary, 900);

  const actionItems = await callLines(
    actionItemsPrompt(sectionSummaries, digest.preferences.topics),
    actionItemsFallback(sectionSummaries),
  );

  return {
    sectionSummaries,
    quickScanSummary: cleanQuickScanSummary,
    actionItems,
  };
}
