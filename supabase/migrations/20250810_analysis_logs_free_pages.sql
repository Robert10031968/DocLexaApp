-- Migration: Ensure analysis_logs has required columns and constraints; update free_pages_30d view; add RLS policies

-- 1) Add missing columns to analysis_logs (idempotent)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'analysis_logs'
  ) then
    -- source column
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'analysis_logs' and column_name = 'source'
    ) then
      alter table public.analysis_logs add column source text;
    end if;

    -- pages_free column
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'analysis_logs' and column_name = 'pages_free'
    ) then
      alter table public.analysis_logs add column pages_free integer;
    end if;

    -- source CHECK constraint (upload/camera/pasted)
    if not exists (
      select 1 from information_schema.table_constraints
      where table_schema = 'public' and table_name = 'analysis_logs' and constraint_name = 'analysis_logs_source_check'
    ) then
      alter table public.analysis_logs
        add constraint analysis_logs_source_check
        check (source is null or source in ('upload','camera','pasted'));
    end if;
  end if;
end$$;

-- 2) View: free_pages_30d (idempotent via CREATE OR REPLACE VIEW)
create or replace view public.free_pages_30d as
select
  al.user_id,
  coalesce(sum(al.pages_free), 0)::bigint as free_pages_30d,
  count(*)::bigint as analyses_count
from public.analysis_logs al
where
  coalesce(al.pages_free, 0) > 0
  and al.analyzed_at > now() - interval '30 days'
  and (al.source is null or al.source in ('upload','camera','pasted'))
group by al.user_id;

-- 3) RLS: enable and add policies to restrict access to own rows
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'analysis_logs'
  ) then
    -- enable RLS (idempotent)
    alter table public.analysis_logs enable row level security;

    -- select own rows policy
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = 'analysis_logs' and policyname = 'select_own_analysis_logs'
    ) then
      create policy select_own_analysis_logs on public.analysis_logs
        for select using (user_id = auth.uid());
    end if;

    -- insert own rows policy
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = 'analysis_logs' and policyname = 'insert_own_analysis_logs'
    ) then
      create policy insert_own_analysis_logs on public.analysis_logs
        for insert with check (user_id = auth.uid());
    end if;
  end if;
end$$;


