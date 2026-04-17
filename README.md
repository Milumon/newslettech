# Newslettech

Newslettech genera un newsletter tecnico personalizado desde Product Hunt, GitHub Trending y Reddit. El usuario deja su correo, configura preferencias y recibe un resumen curado por email de forma inmediata y programada.

## Features

- Landing simple con flujo email-first (sin password)
- Pantalla de preferencias por correo (carga/edicion)
- Generacion de digest multi-fuente con filtros por usuario
- Envio inmediato al guardar configuracion
- Programacion de envios diarios/semanales (cron)
- Resumen editorial asistido por LLM (Groq/Gemini + fallback)
- Preview del correo antes de enviar

## Stack

- Next.js 16.2.4 + React 19.2.4 (App Router)
- TypeScript strict
- Bun (`bun.lock`)
- Supabase (DB + RPC + scheduler integration)
- Resend (email delivery)
- Groq / Gemini (summarization)

## Quick Start

### 1) Install

```bash
bun install
```

### 2) Environment variables

Create `.env` with at least:

```bash
RESEND_API_KEY=
RESEND_FROM_EMAIL=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

CRON_SECRET=

# LLM (Groq default)
LLM_PROVIDER=groq
GROQ_API_KEY=
GROQ_MODEL=llama-3.1-8b-instant

# Optional fallback provider
GEMINI_API_KEY=
```

### 3) Database setup

Run in Supabase SQL Editor:

- `supabase/schema.sql`

This creates:
- `subscribers`
- `preferences`
- `digest_runs`
- RPC: `upsert_subscriber_preferences(...)`

### 4) Run locally

```bash
bun run dev
```

Open `http://localhost:3000`.

## Core User Flow

1. User enters email on landing.
2. App routes to preferences (`/preferences?email=...`).
3. User saves preferences.
4. Backend upserts subscriber + preferences in Supabase.
5. Backend sends digest immediately by email.
6. Cron sends future digests based on selected frequency.

## API Overview

### Preferences

- `GET /api/preferences/lookup?email=...`
  - Load existing preferences by email.
- `POST /api/preferences`
  - Upsert preferences + send digest now.
- `POST /api/preferences/preview`
  - Build email HTML preview without sending.

### Digest

- `POST /api/digest`
  - Build digest payload from preferences.
- `POST /api/digest/send`
  - Send a provided digest to target email.

### Scheduler

- `POST /api/cron/send-digests`
  - Protected by `Authorization: Bearer <CRON_SECRET>`
  - Sends due digests for active subscribers.

## Scheduler (Supabase Cron + Edge Function)

See `SUPABASE_SETUP.md` for full steps.

Minimal flow:

1. Deploy edge function:

```bash
supabase functions deploy send-digests
```

2. Configure secrets:

```bash
supabase secrets set CRON_SECRET=... NEXT_APP_URL=https://your-app-domain.com
```

3. Run `supabase/cron.sql` (replace placeholders first).

## Validation Commands

Use this order for meaningful changes:

```bash
bun run lint
bun x tsc --noEmit
bun run build
```

## Known Notes

- Source ingestion depends on third-party HTML/API behavior (selectors can drift).
- If LLM provider fails or quota is hit, summary falls back to deterministic text.
- Current product flow is email-based without auth; add verification if stronger ownership checks are needed.

## Repo Structure (high-signal)

- `app/page.tsx` - Landing
- `app/preferences/page.tsx` - Preferences UI
- `app/api/**/route.ts` - Backend endpoints
- `lib/digest/*` - Scraping, summarization, email composition
- `lib/supabase/server.ts` - Supabase server client
- `supabase/schema.sql` - DB schema + RPC
- `supabase/cron.sql` - cron scheduling SQL

## Troubleshooting

### Newsletter content formatting issues

- Ensure `LLM_PROVIDER` and provider keys are set.
- Preview before sending via `Ver vista previa`.
- If provider output degrades, fallback sanitization is applied automatically.

### Empty Reddit section

- Validate subreddit seeds in preferences.
- Check network/rate limits and source availability.

### Cron not sending

- Verify `CRON_SECRET` matches between scheduler and app.
- Check `digest_runs` table for failure logs.
