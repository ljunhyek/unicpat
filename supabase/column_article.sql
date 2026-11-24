-- 칼럼 긴 글(본문 HTML)과 썸네일 칸 추가 (2026-11-24)
-- Supabase SQL Editor에서 한 번 실행하세요.
--   body_html : 블로그 원문을 바탕으로 새로 쓴 긴 글 본문 (h2/h3/p/ul/table/blockquote HTML)
--               본문 안의 {{thumbnail}} 자리에 썸네일 주소가 들어갑니다.
--   thumbnail : 썸네일 이미지 (data:image/jpeg;base64,... 형식, 1200x630)
--               홈페이지에서는 /column/글번호/thumbnail.jpg 로 보이고, 공유 미리보기(og:image)에도 쓰입니다.
alter table public.columns add column if not exists body_html text;
alter table public.columns add column if not exists thumbnail text;
