-- 홈페이지 관리 자동화 (Supabase 대시보드 → SQL Editor에서 한 번 실행)
-- 관리자 화면 '자동화' 탭과 매일 자동 작업(/api/cron/daily)이 이 테이블들을 씁니다.
-- 여러 번 실행해도 안전합니다.

-- 1) 할 일 알림: 자동 작업이 찾아낸 '사람이 처리할 일' (초안 필요, 승인 대기, 구글 색인 요청 등)
create table if not exists public.automation_tasks (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  kind text not null,                -- column_draft / newsletter_draft / social_draft / google_index / seo_issue / gov_candidates
  ref text not null unique,          -- 같은 일을 두 번 만들지 않기 위한 키 (예: column:224012345678)
  title text not null,
  detail text,
  link text,                         -- 처리할 곳 주소 (관리자 화면, 서치 콘솔 등)
  status text not null default 'open' check (status in ('open', 'done', 'dismissed')),
  handled_at timestamptz
);
create index if not exists automation_tasks_status_idx on public.automation_tasks (status, created_at desc);

-- 2) 자동 작업 실행 기록
create table if not exists public.automation_runs (
  id bigint generated always as identity primary key,
  ran_at timestamptz not null default now(),
  job text not null,                 -- blog / newsletter / seo_new / seo_health / gov / social
  ok boolean not null default true,
  summary text
);
create index if not exists automation_runs_job_idx on public.automation_runs (job, ran_at desc);

-- 3) 사이트맵에서 본 주소 (새 페이지를 찾아 검색엔진에 알리기 위함)
create table if not exists public.seo_known_urls (
  url text primary key,
  first_seen timestamptz not null default now(),
  indexnow_at timestamptz
);

-- 4) 정부지원사업 후보 (K-Startup·기업마당에서 매월 자동 수집 → 관리자가 공고로 추가하거나 제외)
create table if not exists public.gov_candidates (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  source text not null,              -- kstartup / bizinfo
  source_id text not null,
  title text not null,
  url text not null,
  agency text,
  period text,
  posted_on date,
  score int not null default 0,      -- 관련도 (키워드 점수)
  matched text,                      -- 걸린 키워드
  status text not null default 'new' check (status in ('new', 'added', 'dismissed')),
  unique (source, source_id)
);
create index if not exists gov_candidates_status_idx on public.gov_candidates (status, score desc);

-- 5) 구글 비즈니스 프로필·네이버 플레이스 게시글 초안
create table if not exists public.social_posts (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  source_ref text unique,            -- 근거 글 (예: column:224012345678), 직접 쓴 글은 비움
  title text not null,               -- 관리용 제목
  body text not null,                -- 게시 본문 (구글 1,500자 이내)
  link_url text,                     -- 버튼 링크
  image_path text,                   -- 함께 올릴 사진 (예: design/naver-place/place_09.png)
  status text not null default 'draft' check (status in ('draft', 'approved', 'posted')),
  gbp_posted_at timestamptz,
  naver_posted_at timestamptz
);

-- 관리자(로그인 사용자)만 조회·처리. 자동 작업은 서버 비밀키로 접근(RLS 우회)
do $$
declare t text;
begin
  foreach t in array array['automation_tasks', 'automation_runs', 'seo_known_urls', 'gov_candidates', 'social_posts'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%s admin" on public.%I', t, t);
    execute format('create policy "%s admin" on public.%I for all to authenticated using (true) with check (true)', t, t);
  end loop;
end $$;
