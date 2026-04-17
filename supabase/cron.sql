create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Replace URL and secret before running:
-- https://<PROJECT-REF>.supabase.co/functions/v1/send-digests
-- CRON_SECRET value from your env/secrets

select cron.schedule(
  'newslettech-daily-digest',
  '5 9 * * *',
  $$
    select
      net.http_post(
        url := 'https://mtvvisgcqqwmqhepvoiz.supabase.co/functions/v1/send-digests',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer <CRON_SECRET>'
        ),
        body := '{}'::jsonb
      );
  $$
);
