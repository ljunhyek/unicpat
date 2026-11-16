-- 발송 대상 정리: 구독자 상태에 '보류(paused)' 추가 (Supabase 대시보드 → SQL Editor에서 한 번 실행)
-- 보류한 주소는 발송 대상에서 빠지고, 관리자 화면에서 언제든 '수신 가능'으로 되돌릴 수 있습니다.
alter table public.newsletter_subscribers drop constraint if exists newsletter_subscribers_status_check;
alter table public.newsletter_subscribers add constraint newsletter_subscribers_status_check
  check (status in ('active', 'unsubscribed', 'bounced', 'complained', 'paused'));

alter table public.newsletter_subscribers add column if not exists paused_at timestamptz;
