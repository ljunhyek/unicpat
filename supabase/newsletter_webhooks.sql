-- 반송·스팸 신고 기록 (Resend 웹훅) — Supabase 대시보드 → SQL Editor에서 한 번 실행

-- 1. 구독자 상태에 '스팸 신고(complained)' 추가
alter table public.newsletter_subscribers drop constraint if exists newsletter_subscribers_status_check;
alter table public.newsletter_subscribers add constraint newsletter_subscribers_status_check
  check (status in ('active', 'unsubscribed', 'bounced', 'complained'));

alter table public.newsletter_subscribers add column if not exists bounced_at timestamptz;
alter table public.newsletter_subscribers add column if not exists complained_at timestamptz;

-- 2. Resend가 보내 준 이벤트 원본 (대시보드 기록은 금방 사라지므로 여기에 영구 보관)
create table if not exists public.newsletter_email_events (
  id bigint generated always as identity primary key,
  received_at timestamptz not null default now(),
  webhook_id text not null unique,      -- svix-id: 같은 이벤트가 다시 와도 한 번만 기록
  type text not null,                   -- email.bounced / email.complained ...
  email text,
  resend_id text,
  bounce_type text,                     -- Permanent(영구) / Transient(일시) / Undetermined
  campaign_id bigint references public.newsletter_campaigns (id) on delete set null,
  subscriber_id bigint references public.newsletter_subscribers (id) on delete set null,
  payload jsonb not null
);

create index if not exists newsletter_email_events_subscriber_idx on public.newsletter_email_events (subscriber_id);
create index if not exists newsletter_recipients_resend_id_idx on public.newsletter_recipients (resend_id);

-- 관리자(로그인 사용자)만 조회. 웹훅은 서버 비밀 키로 기록
alter table public.newsletter_email_events enable row level security;

drop policy if exists "newsletter_email_events admin" on public.newsletter_email_events;
create policy "newsletter_email_events admin" on public.newsletter_email_events
  for all to authenticated using (true) with check (true);
