-- 칼럼 영문 긴 글(본문 HTML)과 영문 썸네일 칸 추가 (2026-11-24)
-- Supabase SQL Editor에서 한 번 실행하세요. (column_article.sql 다음)
--   body_html_en : 한국어 긴 글(body_html)을 영어로 옮긴 본문. {{thumbnail}} 자리에 영문 썸네일이 들어갑니다.
--   thumbnail_en : 영문 썸네일 (data:image/jpeg;base64,..., 1200x630) → /column/글번호/thumbnail-en.jpg
alter table public.columns add column if not exists body_html_en text;
alter table public.columns add column if not exists thumbnail_en text;
