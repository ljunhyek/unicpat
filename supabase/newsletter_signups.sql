-- 홈페이지 뉴스레터 구독 신청 (Supabase 대시보드 → SQL Editor에서 한 번 실행)
-- /subscribe 페이지의 신청이 여기에 쌓이고, 관리자 → 뉴스레터 발송 탭에서 발송 대상(newsletter_subscribers)에 추가합니다.

create table if not exists public.newsletter_signups (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null,
  company_name text,
  email text not null,                 -- 소문자로 저장
  status text not null default 'pending' check (status in ('pending', 'added', 'dismissed')),
  handled_at timestamptz
);

create index if not exists newsletter_signups_status_idx on public.newsletter_signups (status, created_at desc);

-- 발송 대상 고객 DB에 담당자 이름 칸 추가 (구독 신청자의 이름)
alter table public.newsletter_subscribers add column if not exists contact_name text;

-- 관리자(로그인 사용자)만 조회·처리
alter table public.newsletter_signups enable row level security;
drop policy if exists "newsletter_signups admin" on public.newsletter_signups;
create policy "newsletter_signups admin" on public.newsletter_signups
  for all to authenticated using (true) with check (true);

-- 사이트 방문자는 이 함수로만 신청 가능 (같은 이메일의 처리 전 신청이 있으면 다시 넣지 않음)
create or replace function public.newsletter_signup(p_name text, p_company text, p_email text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.newsletter_signups (name, company_name, email)
  select left(trim(p_name), 100), nullif(left(trim(coalesce(p_company, '')), 200), ''), lower(left(trim(p_email), 254))
  where not exists (
    select 1 from public.newsletter_signups
     where email = lower(trim(p_email)) and status = 'pending'
  );
$$;

revoke all on function public.newsletter_signup(text, text, text) from public;
grant execute on function public.newsletter_signup(text, text, text) to anon, authenticated;
