"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Frequency = "daily" | "weekly";

interface PreferencesForm {
  topics: string;
  githubLanguage: string;
  subreddits: string;
  maxItems: number;
  frequency: Frequency;
}

const initialForm: PreferencesForm = {
  topics: "ai, developer tools, startups",
  githubLanguage: "typescript",
  subreddits: "programming, webdev, startups",
  maxItems: 5,
  frequency: "daily",
};

function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function formatNextDeliveryDate(frequency: Frequency, timezone: string): string {
  const next = new Date();
  next.setDate(next.getDate() + (frequency === "weekly" ? 7 : 1));

  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
    timeZoneName: "short",
  }).format(next);
}

function PreferencesContent() {
  const params = useSearchParams();
  const [form, setForm] = useState<PreferencesForm>(initialForm);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [deliveryMessage, setDeliveryMessage] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalText, setSuccessModalText] = useState("");
  const [userTimezone] = useState<string>(getUserTimezone);

  const email = useMemo(() => params.get("email") ?? "", [params]);

  useEffect(() => {
    if (!email) return;

    const controller = new AbortController();

    async function loadPreferences() {
      setLoading(true);
      setErrorMessage("");

      try {
        const res = await fetch(`/api/preferences/lookup?email=${encodeURIComponent(email)}`, {
          signal: controller.signal,
        });

        const payload = (await res.json()) as {
          data?: {
            topics: string;
            githubLanguage: string;
            subreddits: string;
            maxItems: number;
            frequency: Frequency;
          } | null;
        };

        if (!res.ok) {
          throw new Error("No pudimos cargar tu configuracion.");
        }

        if (!payload.data) {
          setForm(initialForm);
          return;
        }

        setForm({
          topics: payload.data.topics,
          githubLanguage: payload.data.githubLanguage,
          subreddits: payload.data.subreddits,
          maxItems: payload.data.maxItems,
          frequency: payload.data.frequency,
        });
      } catch {
        if (controller.signal.aborted) return;
        setErrorMessage("No pudimos cargar tu configuracion.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadPreferences();
    return () => controller.abort();
  }, [email]);

  async function handleSave() {
    if (!email) {
      setErrorMessage("Necesitamos tu correo para guardar.");
      return;
    }

    setSaving(true);
    setSaved(false);
    setErrorMessage("");
    setDeliveryMessage("");

    try {
      const res = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          topics: form.topics,
          githubLanguage: form.githubLanguage,
          subreddits: form.subreddits,
          maxItems: form.maxItems,
          frequency: form.frequency,
        }),
      });

      const payload = (await res.json()) as {
        data?: { nextDelivery?: Frequency };
        error?: unknown;
      };

      if (!res.ok || payload.error) {
        throw new Error("No pudimos guardar tu configuracion.");
      }

      const nextFrequency = payload.data?.nextDelivery ?? form.frequency;
      const nextDateLabel = formatNextDeliveryDate(nextFrequency, userTimezone);

      setSaved(true);
      setDeliveryMessage(`Te enviamos tu resumen ahora. El proximo envio sera el ${nextDateLabel}.`);
      setSuccessModalText(`Resumen enviado con exito. Tu proximo envio sera el ${nextDateLabel}.`);
      setShowSuccessModal(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch {
      setErrorMessage("No pudimos guardar tu configuracion.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePreview() {
    if (!email) {
      setErrorMessage("Necesitamos tu correo para generar la vista previa.");
      return;
    }

    setPreviewLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/preferences/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          topics: form.topics,
          githubLanguage: form.githubLanguage,
          subreddits: form.subreddits,
          maxItems: form.maxItems,
          frequency: form.frequency,
        }),
      });

      const payload = (await res.json()) as { data?: { html?: string }; error?: unknown };

      if (!res.ok || payload.error || !payload.data?.html) {
        throw new Error("No pudimos generar la vista previa.");
      }

      setPreviewHtml(payload.data.html);
      setShowPreview(true);
    } catch {
      setErrorMessage("No pudimos generar la vista previa.");
    } finally {
      setPreviewLoading(false);
    }
  }

  return (
    <div className="ds-page">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-7 px-4 py-8 md:px-8 md:py-12">
        <header className="ds-hero-dark rounded-[28px] px-6 py-7 md:px-10 md:py-10">
          <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#2997ff]">
            Configuracion
          </p>
          <h1 className="mt-2 text-[34px] font-semibold leading-[1.07] tracking-[-0.02em] md:text-[48px]">
            Tu resumen por correo
          </h1>
          <p className="mt-3 max-w-2xl text-[17px] leading-[1.47] tracking-[-0.01em] text-white/82">
            Ajusta lo que quieres recibir y nosotros nos encargamos de enviarlo en el horario elegido.
          </p>
          {email ? (
            <p className="mt-5 inline-block rounded-[980px] border border-white/25 px-4 py-2 text-[14px] leading-[1.29] text-white/95">
              Correo activo: {email}
            </p>
          ) : (
            <p className="mt-5 inline-block rounded-[980px] border border-white/25 px-4 py-2 text-[14px] leading-[1.29] text-white/95">
              No detectamos correo. Vuelve al inicio para continuar.
            </p>
          )}
        </header>

        <section className="ds-card rounded-[24px] p-6 md:p-10">
          {loading && (
            <p className="mb-5 text-[14px] leading-[1.29] tracking-[-0.01em] text-black/65" role="status" aria-live="polite">
              Cargando tu configuracion...
            </p>
          )}

          <div className="flex flex-col gap-10">
            {/* GENERAL SECTION */}
            <div>
              <div className="mb-5">
                <h3 className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#86868b]">
                  General
                </h3>
                <p className="mt-1 text-[14px] text-black/55">
                  Configuracion base del resumen completo.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <label className="block md:col-span-2">
                  <span className="text-[15px] font-semibold text-[#1d1d1f]">
                    Temas que quieres seguir
                  </span>
                  <p className="mb-2 text-[13px] text-black/55">Escribe conceptos abstractos o tecnologias especificas.</p>
                  <textarea
                    value={form.topics}
                    onChange={(event) => setForm((prev) => ({ ...prev, topics: event.target.value }))}
                    className="ds-input h-24 w-full rounded-[12px] border-black/10 px-4 py-3 text-[17px] outline-none transition focus:border-transparent focus:ring-4 focus:ring-[#0071e3]/20"
                  />
                </label>

                <label className="block">
                  <span className="text-[15px] font-semibold text-[#1d1d1f]">
                    Lenguaje preferido (GitHub)
                  </span>
                  <p className="mb-2 text-[13px] text-black/55">Proyectos destacados diarios.</p>
                  <input
                    value={form.githubLanguage}
                    onChange={(event) => setForm((prev) => ({ ...prev, githubLanguage: event.target.value }))}
                    className="ds-input w-full rounded-[12px] border-black/10 px-4 py-3 text-[17px] outline-none transition focus:border-transparent focus:ring-4 focus:ring-[#0071e3]/20"
                  />
                </label>

                <label className="block">
                  <span className="text-[15px] font-semibold text-[#1d1d1f]">
                    Cantidad por fuente
                  </span>
                  <p className="mb-2 text-[13px] text-black/55">Recomendamos entre 3 y 5.</p>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={form.maxItems}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, maxItems: Number(event.target.value) }))
                    }
                    className="ds-input w-full rounded-[12px] border-black/10 px-4 py-3 text-[17px] outline-none transition focus:border-transparent focus:ring-4 focus:ring-[#0071e3]/20"
                  />
                </label>
              </div>
            </div>

            <hr className="border-black/5" />

            {/* REDDIT SECTION */}
            <div>
              <div className="mb-5">
                <h3 className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#86868b]">
                  Reddit
                </h3>
                <p className="mt-1 text-[14px] text-black/55">
                  Comunidades iniciales para buscar perspectivas y discusiones.
                </p>
              </div>

              <label className="block">
                <span className="text-[15px] font-semibold text-[#1d1d1f]">
                  Subreddits
                </span>
                <p className="mb-2 text-[13px] text-black/55">Separados por comas.</p>
                <input
                  value={form.subreddits}
                  onChange={(event) => setForm((prev) => ({ ...prev, subreddits: event.target.value }))}
                  className="ds-input w-full rounded-[12px] border-black/10 px-4 py-3 text-[17px] outline-none transition focus:border-transparent focus:ring-4 focus:ring-[#0071e3]/20"
                />
              </label>
            </div>

            <hr className="border-black/5" />

            {/* DELIVERY SECTION */}
            <div>
              <div className="mb-5">
                <h3 className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#86868b]">
                  Programacion
                </h3>
                <p className="mt-1 text-[14px] text-black/55">
                  Decide que tan seguido recibes este correo.
                </p>
              </div>

              <fieldset>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, frequency: "daily" }))}
                    className={`rounded-[12px] border px-4 py-4 text-center text-[17px] font-medium transition ${
                      form.frequency === "daily"
                        ? "border-[#0071e3] bg-[#0071e3]/5 text-[#0071e3] shadow-[0_0_0_1px_#0071e3]"
                        : "border-black/10 bg-[#fafafc] text-black/70 hover:bg-black/5"
                    }`}
                  >
                    Resumen Diario
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, frequency: "weekly" }))}
                    className={`rounded-[12px] border px-4 py-4 text-center text-[17px] font-medium transition ${
                      form.frequency === "weekly"
                        ? "border-[#0071e3] bg-[#0071e3]/5 text-[#0071e3] shadow-[0_0_0_1px_#0071e3]"
                        : "border-black/10 bg-[#fafafc] text-black/70 hover:bg-black/5"
                    }`}
                  >
                    Resumen Semanal
                  </button>
                </div>
              </fieldset>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-black/5 pt-8 sm:flex-row">
            <button
              type="button"
              onClick={handlePreview}
              disabled={previewLoading || loading || !email}
              className="ds-btn-secondary px-5 py-3 text-[17px] font-semibold leading-[1.24] transition hover:bg-black/[0.03] disabled:opacity-60"
            >
              {previewLoading ? "Generando vista previa..." : "Ver vista previa"}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading || !email}
              className="ds-btn-primary px-5 py-3 text-[17px] font-semibold leading-[1.24] transition disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar y enviar ahora"}
            </button>
            <Link
              href="/"
              className="ds-btn-secondary ml-auto px-5 py-3 text-[17px] font-semibold leading-[1.24] transition hover:bg-black/[0.03]"
            >
              Volver al inicio
            </Link>
          </div>

          <div className="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-[13px] text-black/55">
              Zona horaria detectada: {userTimezone}
            </p>

            {(saved || deliveryMessage || errorMessage) && (
              <div className="text-right">
                {saved && (
                  <p className="text-[14px] leading-[1.29] font-medium tracking-[-0.01em] text-[#007a43]" role="status" aria-live="polite">
                    Configuracion guardada.
                  </p>
                )}
                {deliveryMessage && (
                  <p className="mt-1 text-[13px] leading-[1.29] tracking-[-0.01em] text-black/75" role="status" aria-live="polite">
                    {deliveryMessage}
                  </p>
                )}
                {errorMessage && (
                  <p className="text-[14px] font-medium leading-[1.29] tracking-[-0.01em] text-[#b42318]" role="status" aria-live="polite">
                    {errorMessage}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      {showPreview && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-4xl rounded-[24px] bg-white p-4 shadow-[rgba(0,0,0,0.22)_3px_5px_30px_0px] md:p-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-[21px] font-semibold">Vista previa del correo</h2>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="ds-btn-secondary px-4 py-2 text-[14px] font-semibold"
              >
                Cerrar
              </button>
            </div>
            <div className="h-[65vh] overflow-auto rounded-[11px] border border-black/15">
              <iframe
                title="Vista previa del correo"
                srcDoc={previewHtml}
                className="h-full w-full"
              />
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-[24px] bg-white p-6 text-[#1d1d1f] shadow-[rgba(0,0,0,0.22)_3px_5px_30px_0px]">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#0071e3]">Envio listo</p>
            <h3 className="mt-2 text-[28px] font-semibold leading-[1.14]">Todo salio bien</h3>
            <p className="mt-3 text-[17px] leading-[1.47] text-black/78">{successModalText}</p>
            <button
              type="button"
              onClick={() => setShowSuccessModal(false)}
              className="ds-btn-primary mt-5 w-full px-5 py-3 text-[17px] font-semibold leading-[1.24]"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PreferencesPage() {
  return (
    <Suspense fallback={<div className="ds-page"><main className="mx-auto flex w-full max-w-5xl px-4 py-8"><p>Cargando...</p></main></div>}>
      <PreferencesContent />
    </Suspense>
  );
}
