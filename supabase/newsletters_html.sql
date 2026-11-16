-- 관리자 → 뉴스레터 탭에서 HTML 파일로 올린 뉴스레터 본문 저장 (Supabase 대시보드 → SQL Editor에서 한 번 실행)
-- 본문은 홈페이지 /newsletter/<id> 주소로 표시됩니다.
alter table public.newsletters add column if not exists html text;
