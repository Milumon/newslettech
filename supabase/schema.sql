create extension if not exists pgcrypto;

create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  status text not null default 'active' check (status in ('active', 'paused', 'unsubscribed')),
  frequency text not null default 'daily' check (frequency in ('daily', 'weekly')),
  timezone text not null default 'UTC',
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.preferences (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null unique references public.subscribers(id) on delete cascade,
  topics text not null default '',
  github_language text not null default '',
  subreddits text not null default '',
  max_items int not null default 5 check (max_items between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.digest_runs (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references public.subscribers(id) on delete cascade,
  run_at timestamptz not null default now(),
  status text not null check (status in ('success', 'failed')),
  error_message text,
  payload jsonb
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_subscribers_updated_at on public.subscribers;
create trigger trg_subscribers_updated_at
before update on public.subscribers
for each row
execute function public.set_updated_at();

drop trigger if exists trg_preferences_updated_at on public.preferences;
create trigger trg_preferences_updated_at
before update on public.preferences
for each row
execute function public.set_updated_at();

create index if not exists idx_digest_runs_subscriber_run_at
on public.digest_runs(subscriber_id, run_at desc);

create or replace function public.upsert_subscriber_preferences(
  p_email text,
  p_frequency text,
  p_topics text,
  p_github_language text,
  p_subreddits text,
  p_max_items int
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_subscriber_id uuid;
begin
  insert into public.subscribers (email, frequency)
  values (lower(trim(p_email)), p_frequency)
  on conflict (email)
  do update set
    frequency = excluded.frequency,
    updated_at = now()
  returning id into v_subscriber_id;

  insert into public.preferences (subscriber_id, topics, github_language, subreddits, max_items)
  values (v_subscriber_id, p_topics, p_github_language, p_subreddits, p_max_items)
  on conflict (subscriber_id)
  do update set
    topics = excluded.topics,
    github_language = excluded.github_language,
    subreddits = excluded.subreddits,
    max_items = excluded.max_items,
    updated_at = now();

  return v_subscriber_id;
end;
$$;
