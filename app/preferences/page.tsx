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

        setForm(payload.data);
      } catch {
        if (!controller.signal.aborted) {
          setErrorMessage("No pudimos cargar tu configuracion.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
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
    setErrorMessage("");

    try {
      const res = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, ...form }),
      });

      const payload = (await res.json()) as { data?: { nextDelivery?: Frequency }; error?: unknown };

      if (!res.ok || payload.error) {
        throw new Error("No pudimos guardar tu configuracion.");
      }

      const nextDateLabel = formatNextDeliveryDate(payload.data?.nextDelivery ?? form.frequency, userTimezone);
      setDeliveryMessage(`Resumen enviado. El proximo envio sera el ${nextDateLabel}.`);
      setSuccessModalText(`Tu resumen se envio correctamente. El proximo envio sera el ${nextDateLabel}.`);
      setShowSuccessModal(true);
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
        body: JSON.stringify({ email, ...form }),
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
      <main className="relative z-10 mx-auto flex w-full justify-center px-4 py-8 md:px-8 md:py-12">
        <div className="premium-container">
          <section className="premium-panel">
            <div>
              <span className="premium-brand">Configuracion</span>
              <h1 className="mt-4 text-[38px] font-extrabold leading-[0.98] tracking-[-0.04em] md:text-[52px]">
                Personaliza tu newsletter
              </h1>
              <p className="ds-muted mt-4 max-w-xl text-[16px] leading-[1.6]">
                Ajusta tus temas y frecuencia en una sola pantalla. El resumen llega al mismo correo.
              </p>

              <div className="mt-8 space-y-3 text-[14px]">
                <p className="ds-soft">Correo activo</p>
                <p className="rounded-[12px] border border-white/10 bg-white/5 px-4 py-3 break-all">
                  {email || "No detectamos correo. Vuelve al inicio para continuar."}
                </p>
              </div>

              <div className="mt-8 space-y-6">
                <div className="premium-step">
                  <span className="premium-step-num">GENERAL</span>
                  <div className="mt-2 grid gap-4">
                    <label>
                      <p className="text-[14px] font-semibold">Temas que quieres seguir</p>
                      <textarea
                        value={form.topics}
                        onChange={(event) => setForm((prev) => ({ ...prev, topics: event.target.value }))}
                        className="ds-input mt-2 h-22 w-full rounded-[12px] px-4 py-3 text-[15px] outline-none transition focus:ring-4 focus:ring-[#a855f7]/20"
                      />
                    </label>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label>
                        <p className="text-[14px] font-semibold">Lenguaje de programación (GitHub)</p>
                        <input
                          value={form.githubLanguage}
                          onChange={(event) => setForm((prev) => ({ ...prev, githubLanguage: event.target.value }))}
                          className="ds-input mt-2 w-full rounded-[12px] px-4 py-3 text-[15px] outline-none transition focus:ring-4 focus:ring-[#a855f7]/20"
                        />
                      </label>

                      <label>
                        <p className="text-[14px] font-semibold">Cantidad por fuente</p>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={form.maxItems}
                          onChange={(event) =>
                            setForm((prev) => ({ ...prev, maxItems: Number(event.target.value) }))
                          }
                          className="ds-input mt-2 w-full rounded-[12px] px-4 py-3 text-[15px] outline-none transition focus:ring-4 focus:ring-[#a855f7]/20"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="premium-step">
                  <span className="premium-step-num">REDDIT</span>
                  <label className="mt-2 block">
                    <p className="text-[14px] font-semibold">Subreddits (separados por coma)</p>
                    <input
                      value={form.subreddits}
                      onChange={(event) => setForm((prev) => ({ ...prev, subreddits: event.target.value }))}
                      className="ds-input mt-2 w-full rounded-[12px] px-4 py-3 text-[15px] outline-none transition focus:ring-4 focus:ring-[#a855f7]/20"
                    />
                  </label>
                </div>

                <div className="premium-step">
                  <span className="premium-step-num">FRECUENCIA</span>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, frequency: "daily" }))}
                      className={`rounded-[12px] border px-4 py-3 text-center text-[15px] font-semibold transition ${
                        form.frequency === "daily"
                          ? "border-[#a855f7] bg-[#a855f7]/10 text-[#d8b4fe]"
                          : "border-white/10 bg-white/5 text-white/70"
                      }`}
                    >
                      Diario
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, frequency: "weekly" }))}
                      className={`rounded-[12px] border px-4 py-3 text-center text-[15px] font-semibold transition ${
                        form.frequency === "weekly"
                          ? "border-[#a855f7] bg-[#a855f7]/10 text-[#d8b4fe]"
                          : "border-white/10 bg-white/5 text-white/70"
                      }`}
                    >
                      Semanal
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-end">
              <div className="ds-surface-soft rounded-[20px] p-6">
                <h2 className="text-[24px] font-semibold">Acciones</h2>
                <p className="ds-muted mt-2 text-[14px]">Previsualiza o envia de inmediato.</p>

                <div className="mt-5 space-y-3">
                  <button
                    type="button"
                    onClick={handlePreview}
                    disabled={previewLoading || loading || !email}
                    className="ds-btn-secondary w-full px-5 py-3 text-[15px] font-semibold disabled:opacity-60"
                  >
                    {previewLoading ? "Generando vista previa..." : "Ver vista previa"}
                  </button>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || loading || !email}
                    className="ds-btn-primary w-full px-5 py-3 text-[15px] font-bold disabled:opacity-60"
                  >
                    {saving ? "Guardando..." : "Guardar y enviar ahora"}
                  </button>

                  <Link
                    href="/"
                    className="ds-btn-secondary block w-full px-5 py-3 text-center text-[15px] font-semibold"
                  >
                    Volver al inicio
                  </Link>
                </div>

                <p className="ds-soft mt-4 text-[12px]">Zona horaria detectada: {userTimezone}</p>

                {deliveryMessage && <p className="ds-muted mt-3 text-[13px]">{deliveryMessage}</p>}
                {errorMessage && <p className="mt-3 text-[13px] text-[#fca5a5]">{errorMessage}</p>}
              </div>
            </div>
          </section>
        </div>
      </main>

      {showPreview && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
          <div className="ds-card w-full max-w-4xl rounded-[24px] p-4 md:p-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-[20px] font-semibold">Vista previa del correo</h2>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="ds-btn-secondary px-4 py-2 text-[14px] font-semibold"
              >
                Cerrar
              </button>
            </div>
            <div className="h-[65vh] overflow-auto rounded-[11px] border border-white/15">
              <iframe title="Vista previa del correo" srcDoc={previewHtml} className="h-full w-full" />
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="ds-card w-full max-w-md rounded-[24px] p-6">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#a855f7]">Envio listo</p>
            <h3 className="mt-2 text-[28px] font-semibold leading-[1.14]">Todo salio bien</h3>
            <p className="ds-muted mt-3 text-[16px] leading-[1.5]">{successModalText}</p>
            <button
              type="button"
              onClick={() => setShowSuccessModal(false)}
              className="ds-btn-primary mt-5 w-full px-5 py-3 text-[16px] font-bold"
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
    <Suspense
      fallback={
        <div className="ds-page">
          <main className="relative z-10 mx-auto flex w-full max-w-5xl px-4 py-8">
            <p className="ds-muted">Cargando...</p>
          </main>
        </div>
      }
    >
      <PreferencesContent />
    </Suspense>
  );
}
