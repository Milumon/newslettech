"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!normalized) return;
    router.push(`/preferences?email=${encodeURIComponent(normalized)}`);
  }

  return (
    <div className="ds-page">
      <main className="relative z-10 mx-auto flex w-full justify-center px-4 py-8 md:px-8 md:py-12">
        <div className="premium-container">
          <section className="premium-panel">
            <div>
              <span className="premium-brand">Newslettech</span>
              <h1 className="mt-4 text-[42px] font-extrabold leading-[0.95] tracking-[-0.04em] md:text-[58px]">
                Radar diario de tecnología.
              </h1>
              <p className="ds-muted mt-5 max-w-xl text-[18px] leading-[1.6]">
                Claro, breve y accionable. Seleccionamos lo más relevante para que no pierdas
                tiempo filtrando ruido.
              </p>

              <div className="mt-8 flex flex-wrap gap-2">
                <span className="premium-source-tag">Product Hunt</span>
                <span className="premium-source-tag">GitHub</span>
                <span className="premium-source-tag">Reddit</span>
              </div>

              <div className="mt-10 space-y-6">
                <div className="premium-step">
                  <span className="premium-step-num">01</span>
                  <h3 className="mt-2 text-[18px] font-semibold">Escribe tu correo</h3>
                  <p className="ds-muted mt-1 text-[14px] leading-[1.5]">
                    Si ya eras usuario, recuperamos tu configuración automáticamente. Sin contraseñas.
                  </p>
                </div>
                <div className="premium-step">
                  <span className="premium-step-num">02</span>
                  <h3 className="mt-2 text-[18px] font-semibold">Ajusta tus intereses</h3>
                  <p className="ds-muted mt-1 text-[14px] leading-[1.5]">
                    Elige temas, frecuencia y fuentes favoritas para un resumen a medida.
                  </p>
                </div>
                <div className="premium-step">
                  <span className="premium-step-num">03</span>
                  <h3 className="mt-2 text-[18px] font-semibold">Recibe insights</h3>
                  <p className="ds-muted mt-1 text-[14px] leading-[1.5]">
                    No solo titulares: contexto estratégico para decidir rápido y con criterio.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-end">
              <div className="rounded-[20px] border border-white/10 bg-white/5 p-6">
                <h2 className="text-[26px] font-semibold">Empieza ahora</h2>
                <p className="ds-muted mt-2 text-[14px]">Te toma menos de un minuto configurar tu resumen.</p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="tu-correo@ejemplo.com"
                    className="ds-input w-full rounded-[12px] px-4 py-3 text-[16px] outline-none transition focus:ring-4 focus:ring-[#a855f7]/20"
                  />

                  <button
                    type="submit"
                    className="ds-btn-primary w-full px-5 py-3 text-[16px] font-bold transition"
                  >
                    Configurar mi resumen
                  </button>
                </form>

                <p className="ds-soft mt-4 text-center text-[12px]">
                  Vuelve cuando quieras para ajustar tus preferencias.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
