-- 방문 통계 확장 (Supabase 대시보드 → SQL Editor에서 한 번 실행)
-- utm_source: 링크에 붙인 ?utm_source= 값 (뉴스레터 메일 링크는 newsletter로 자동 표시)
-- is_new: 처음 방문한 브라우저인지 여부 (일별 '신규 방문자' 집계용)
-- 실행하기 전에도 사이트는 정상 동작하며, 이 두 값만 기록되지 않습니다.
alter table public.page_views add column if not exists utm_source text;
alter table public.page_views add column if not exists is_new boolean;
