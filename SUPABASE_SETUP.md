# Supabase Setup

1. Open Supabase -> SQL Editor.
2. Run `supabase/schema.sql`.
3. Add these env vars to `.env`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
GEMINI_API_KEY=
GROQ_API_KEY=
LLM_PROVIDER=groq
GROQ_MODEL=llama-3.1-8b-instant
```

4. Restart dev server:

```bash
bun run dev
```

## What is ready after this

- Landing asks for email and routes to preferences.
- Preferences page loads existing data by email.
- Save button upserts subscriber + preferences in Supabase.

## Scheduler (Supabase Cron + Edge Function)

1. Deploy Edge Function:

```bash
supabase functions deploy send-digests
```

2. Set secrets in Supabase project:

```bash
supabase secrets set CRON_SECRET=... NEXT_APP_URL=https://your-app-domain.com
```

3. Run `supabase/cron.sql` in SQL Editor (replace placeholders first):
   - `<PROJECT-REF>`
   - `<CRON_SECRET>`

4. Manual test from your app (optional):

```bash
curl -X POST "https://your-app-domain.com/api/cron/send-digests" -H "Authorization: Bearer <CRON_SECRET>"
```

## Optional next step

- Enable RLS policies and add lightweight email verification flow.
