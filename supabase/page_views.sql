-- 방문 통계 테이블 (Supabase 대시보드 → SQL Editor에서 한 번 실행)
create table if not exists public.page_views (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  path text not null,
  referrer text,
  visitor_id text,
  device text,
  country text,
  city text,
  lang text
);

create index if not exists page_views_created_at_idx on public.page_views (created_at desc);

alter table public.page_views enable row level security;

-- 사이트 방문자(anon)는 기록만 가능
drop policy if exists "page_views insert" on public.page_views;
create policy "page_views insert" on public.page_views
  for insert to anon, authenticated with check (true);

-- 조회는 로그인한 관리자만
drop policy if exists "page_views select" on public.page_views;
create policy "page_views select" on public.page_views
  for select to authenticated using (true);
