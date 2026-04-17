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
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 md:px-8 md:py-12">
        <header className="ds-hero-dark rounded-[28px] px-6 py-8 md:px-10 md:py-12">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#2997ff]">
            Newslettech
          </p>
          <h1 className="max-w-4xl text-[34px] font-semibold leading-[1.07] tracking-[-0.02em] md:text-[56px]">
            Tu radar diario de tecnologia,
            <br className="hidden md:block" />
            claro, breve y accionable.
          </h1>
          <p className="mt-4 max-w-2xl text-[17px] leading-[1.47] tracking-[-0.01em] text-white/82">
            Seleccionamos lo mas relevante de Product Hunt, GitHub y Reddit para que no pierdas
            tiempo filtrando ruido.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-[12px] tracking-[-0.01em] text-white/72">
            <span className="rounded-full border border-white/25 px-3 py-1">Resumen por correo</span>
            <span className="rounded-full border border-white/25 px-3 py-1">Sin contrasena</span>
            <span className="rounded-full border border-white/25 px-3 py-1">Configurable</span>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <article className="ds-card rounded-[24px] p-6 md:p-8">
            <h2 className="text-[28px] font-semibold leading-[1.14] tracking-[0.01em]">Como funciona</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="ds-surface-soft rounded-[14px] p-4">
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#0071e3]">
                  Paso 1
                </p>
                <p className="mt-2 text-[17px] font-semibold leading-[1.24] tracking-[-0.01em]">
                  Escribe tu correo
                </p>
                <p className="mt-2 text-[14px] leading-[1.43] tracking-[-0.01em] text-black/70">
                  Si ya estabas, recuperamos tu configuracion automaticamente.
                </p>
              </div>
              <div className="ds-surface-soft rounded-[14px] p-4">
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#0071e3]">
                  Paso 2
                </p>
                <p className="mt-2 text-[17px] font-semibold leading-[1.24] tracking-[-0.01em]">
                  Ajusta tus intereses
                </p>
                <p className="mt-2 text-[14px] leading-[1.43] tracking-[-0.01em] text-black/70">
                  Elige temas, frecuencia y fuentes favoritas.
                </p>
              </div>
              <div className="ds-surface-soft rounded-[14px] p-4">
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#0071e3]">
                  Paso 3
                </p>
                <p className="mt-2 text-[17px] font-semibold leading-[1.24] tracking-[-0.01em]">
                  Recibe insights utiles
                </p>
                <p className="mt-2 text-[14px] leading-[1.43] tracking-[-0.01em] text-black/70">
                  No solo titulares: contexto y accion para decidir rapido.
                </p>
              </div>
            </div>
          </article>

          <aside className="ds-card rounded-[24px] p-6 md:p-8">
            <h2 className="text-[28px] font-semibold leading-[1.14] tracking-[0.01em]">Empieza ahora</h2>
            <p className="mt-3 text-[17px] leading-[1.47] tracking-[-0.01em] text-black/72">
              Te toma menos de un minuto configurar tu resumen.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <label className="block text-[14px] font-semibold leading-[1.29] tracking-[-0.01em]" htmlFor="email">
                Correo electronico
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="tu-correo@ejemplo.com"
                className="ds-input w-full rounded-[11px] px-4 py-3 text-[17px] leading-[1.24] tracking-[-0.01em] outline-none transition focus:ring-2 focus:ring-[#0071e3]/25"
              />

              <button
                type="submit"
                className="ds-btn-primary w-full px-5 py-3 text-[17px] font-semibold leading-[1.24] transition"
              >
                Configurar mi resumen
              </button>
            </form>

            <p className="mt-4 text-[12px] leading-[1.33] tracking-[-0.01em] text-black/55">
              Puedes volver con el mismo correo y ajustar tus preferencias cuando quieras.
            </p>
          </aside>
        </section>
      </main>
    </div>
  );
}
