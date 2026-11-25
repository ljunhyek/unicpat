-- 칼럼 수정 날짜 칸 추가 (2026-11-25)
-- Supabase SQL Editor에서 한 번 실행하세요.
--   updated_at : 글 내용(제목·본문·요약·FAQ·썸네일·영어 글)이 바뀐 시각
--                사이트맵 <lastmod>에 쓰여, 구글이 바뀐 글을 알아보고 다시 수집합니다.
--                관리자 화면·scripts/auto.js 등 어디서 저장하든 아래 트리거가 자동으로 기록합니다.
alter table public.columns add column if not exists updated_at timestamptz;

create or replace function public.columns_touch_updated_at() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT'
     or new.title         is distinct from old.title
     or new.body_html     is distinct from old.body_html
     or new.body_html_en  is distinct from old.body_html_en
     or new.title_en      is distinct from old.title_en
     or new.summary       is distinct from old.summary
     or new.summary_en    is distinct from old.summary_en
     or new.key_points    is distinct from old.key_points
     or new.key_points_en is distinct from old.key_points_en
     or new.checkpoint    is distinct from old.checkpoint
     or new.checkpoint_en is distinct from old.checkpoint_en
     or new.faq           is distinct from old.faq
     or new.thumbnail     is distinct from old.thumbnail then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists columns_touch_updated_at on public.columns;
create trigger columns_touch_updated_at
  before insert or update on public.columns
  for each row execute function public.columns_touch_updated_at();

-- 2026-11-24에 긴 글로 새로 쓴 칼럼은 그날을 수정 날짜로 기록
update public.columns
   set updated_at = '2026-11-24 18:00:00+09'
 where body_html is not null and updated_at is null;
