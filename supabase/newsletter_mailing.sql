-- 뉴스레터 직접 발송 (Supabase 대시보드 → SQL Editor에서 한 번 실행)

-- 1. 고객(수신자) DB
create table if not exists public.newsletter_subscribers (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  email text not null,      -- 소문자로 저장
  company_name text,
  ceo text,
  company_no text,          -- 기업 고유번호
  biz_no text,              -- 사업자등록번호
  homepage text,
  industry_name text,       -- 업종명
  products text,            -- 생산품
  employees integer,        -- 종업원 수
  phone text,
  factory_phone text,
  address text,             -- 소재지
  factory_address text,
  industry text,            -- 업종
  size text,                -- 규모
  traits text,              -- 특성
  region text,              -- 지역
  certification text,       -- 기업인증
  founded_on text,          -- 설립일
  source text,              -- 가져온 파일
  status text not null default 'active' check (status in ('active', 'unsubscribed', 'bounced')),
  unsubscribed_at timestamptz,
  unsubscribe_token uuid not null default gen_random_uuid()
);

create unique index if not exists newsletter_subscribers_email_idx on public.newsletter_subscribers (email);
create unique index if not exists newsletter_subscribers_token_idx on public.newsletter_subscribers (unsubscribe_token);

-- 2. 발송 회차
create table if not exists public.newsletter_campaigns (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  subject text not null,
  html text not null,
  target text not null default 'certified',   -- certified: 기업인증 있는 기업 / all: 전체
  status text not null default 'draft' check (status in ('draft', 'sending', 'done')),
  started_at timestamptz,
  finished_at timestamptz
);

-- 3. 회차별 수신자와 발송 결과
create table if not exists public.newsletter_recipients (
  id bigint generated always as identity primary key,
  campaign_id bigint not null references public.newsletter_campaigns (id) on delete cascade,
  subscriber_id bigint not null references public.newsletter_subscribers (id) on delete cascade,
  email text not null,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed', 'skipped')),
  error text,
  resend_id text,
  sent_at timestamptz,
  unique (campaign_id, subscriber_id)
);

create index if not exists newsletter_recipients_status_idx on public.newsletter_recipients (campaign_id, status);

-- 관리자(로그인 사용자)만 접근
alter table public.newsletter_subscribers enable row level security;
alter table public.newsletter_campaigns enable row level security;
alter table public.newsletter_recipients enable row level security;

drop policy if exists "newsletter_subscribers admin" on public.newsletter_subscribers;
create policy "newsletter_subscribers admin" on public.newsletter_subscribers
  for all to authenticated using (true) with check (true);

drop policy if exists "newsletter_campaigns admin" on public.newsletter_campaigns;
create policy "newsletter_campaigns admin" on public.newsletter_campaigns
  for all to authenticated using (true) with check (true);

drop policy if exists "newsletter_recipients admin" on public.newsletter_recipients;
create policy "newsletter_recipients admin" on public.newsletter_recipients
  for all to authenticated using (true) with check (true);

-- 수신거부 링크: 토큰을 아는 사람만 해당 주소 하나를 수신거부 처리
create or replace function public.newsletter_unsubscribe(p_token uuid)
returns text
language sql
security definer
set search_path = public
as $$
  update public.newsletter_subscribers
     set status = 'unsubscribed',
         unsubscribed_at = coalesce(unsubscribed_at, now())
   where unsubscribe_token = p_token
  returning email;
$$;

revoke all on function public.newsletter_unsubscribe(uuid) from public;
grant execute on function public.newsletter_unsubscribe(uuid) to anon, authenticated;

-- 지난 뉴스레터 보기: 발송을 시작한 회차의 제목·본문만 공개 (수신자 정보는 노출하지 않음)
-- 하루 발송 한도 때문에 회차가 며칠간 'sending'으로 남으므로 발송 중인 회차도 포함
drop function if exists public.newsletter_archive_list();
drop function if exists public.newsletter_archive_get(bigint);

create or replace function public.newsletter_archive_list()
returns table (id bigint, subject text, sent_on timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select id, subject, coalesce(started_at, created_at)
    from public.newsletter_campaigns
   where status in ('sending', 'done')
   order by coalesce(started_at, created_at) desc;
$$;

create or replace function public.newsletter_archive_get(p_id bigint)
returns table (id bigint, subject text, html text, sent_on timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select id, subject, html, coalesce(started_at, created_at)
    from public.newsletter_campaigns
   where status in ('sending', 'done') and id = p_id;
$$;

revoke all on function public.newsletter_archive_list() from public;
revoke all on function public.newsletter_archive_get(bigint) from public;
grant execute on function public.newsletter_archive_list() to anon, authenticated;
grant execute on function public.newsletter_archive_get(bigint) to anon, authenticated;
