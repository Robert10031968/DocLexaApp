-- Migration: Create view public.free_pages_30d summarizing free pages over last 30 days
-- Idempotent: uses CREATE OR REPLACE VIEW

-- View definition
create or replace view public.free_pages_30d as
select
  al.user_id,
  coalesce(sum(al.pages_free), 0)::bigint as free_pages_30d,
  count(*)::bigint as analyses_count
from public.analysis_logs al
where
  al.pages_free > 0
  and al.analyzed_at > now() - interval '30 days'
group by al.user_id;

-- Optional grants (uncomment if needed)
-- grant select on public.free_pages_30d to anon, authenticated, service_role;

-- Helper query examples (not executed):
-- 1) Free pages by user (top 20)
-- select f.user_id, f.free_pages_30d, f.analyses_count
-- from public.free_pages_30d f
-- order by f.free_pages_30d desc
-- limit 20;

-- 2) Free pages total (last 30 days)
-- select coalesce(sum(free_pages_30d), 0) as free_pages_total_30d
-- from public.free_pages_30d;

-- 3) Optional: breakdown by plan (adjust join/table names to your schema)
-- Example joining to a profiles table that stores current plan label:
-- select coalesce(p.plan, 'unknown') as plan,
--        sum(f.free_pages_30d)::bigint as free_pages_30d,
--        sum(f.analyses_count)::bigint as analyses_count
-- from public.free_pages_30d f
-- left join public.profiles p on p.id = f.user_id
-- group by coalesce(p.plan, 'unknown')
-- order by free_pages_30d desc;


