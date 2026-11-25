// 홈페이지 관리 자동화: 매일 1회(/api/cron/daily) 실행되어 날짜에 맞는 작업을 돌리고,
// 사람이 처리할 일은 automation_tasks에 '할 일'로 남깁니다. 관리자 화면 '자동화' 탭에서 같은 작업을 바로 실행할 수도 있습니다.
//
//   작업        언제                 하는 일
//   blog        매주 월요일          블로그 새 글 → 칼럼에 추가(요약 비움) + '초안 필요' 할 일
//   newsletter  매월 15일 이후       이번 달 회차가 없으면 '뉴스레터 초안 필요' 할 일 (이번 달 블로그 글 3개 첨부)
//   seo_new     매일                 사이트맵의 새 주소 → IndexNow(네이버·Bing) 전송, 메뉴 페이지는 '구글 색인 요청' 할 일,
//                                    새 한국어 칼럼은 '네이버 수집 요청' 할 일
//   seo_health  매월 1일             주요 페이지·robots·사이트맵 점검, 문제는 할 일로
//   gov         매주 월요일          K-Startup·기업마당 공고 수집·접수기간 채움 → 정부지원사업 탭 승인 대기
//   social      매일                 최근 공개한 칼럼 중 게시글 초안이 없는 글 → '게시글 초안 필요' 할 일
//
// 글 초안(칼럼 요약·FAQ, 뉴스레터, 게시글)은 비용 없이 Claude Code에 요청해 작성합니다 (.claude/skills/unic-automation).

const blogImport = require('./blog-import');
const govSearch = require('./gov-search');
const seo = require('./seo-monitor');
const { blogPostNo, filledColumnIds } = require('./columns');

const KST = 9 * 3600 * 1000;
const kstNow = (d = new Date()) => new Date(d.getTime() + KST);
const ADMIN = '/admin/dashboard#tab-automation';
const NAVER_CONSOLE = 'https://searchadvisor.naver.com/console/board';

const JOBS = {
  blog: { name: '블로그 새 글 확인', when: '매주 월요일' },
  newsletter: { name: '뉴스레터 초안 알림', when: '매월 15일' },
  seo_new: { name: '새 페이지 검색엔진 전송', when: '매일' },
  seo_health: { name: '검색엔진 등록 점검', when: '매월 1일' },
  gov: { name: '정부지원사업 공고 찾기', when: '매주 월요일' },
  social: { name: '게시글 초안 알림', when: '매일' }
};

// 같은 ref의 할 일은 한 번만 만듦 (처리 완료·제외한 일도 다시 만들지 않음)
async function addTask(supabase, task) {
  const { data, error } = await supabase.from('automation_tasks')
    .upsert(task, { onConflict: 'ref', ignoreDuplicates: true }).select('id');
  if (error) throw error;
  return (data || []).length > 0;
}

async function logRun(supabase, job, ok, summary) {
  const { error } = await supabase.from('automation_runs').insert({ job, ok, summary: String(summary).slice(0, 2000) });
  if (error) console.error('automation_runs insert error:', error.message);
}

// --- 작업들 ---

async function runBlog(supabase) {
  const posts = await blogImport.findNewPosts(supabase);
  // 오래된 글부터 넣어야 최신 글이 목록 맨 앞에 옴
  posts.sort((a, b) => (BigInt(a.no) < BigInt(b.no) ? -1 : 1));
  let created = 0;
  for (const post of posts) {
    const r = await blogImport.importPost(supabase, post);
    if (r.created) created++;
    await addTask(supabase, {
      kind: 'column_draft',
      ref: `column:${post.no}`,
      title: `칼럼 글 초안 필요: ${post.title}`,
      detail: `블로그 글(${post.published_on || '날짜 없음'})을 칼럼 목록에 추가했습니다. Claude Code에 "자동화 할 일 처리해줘"라고 요청하면 블로그 원문을 바탕으로 새 제목·긴 글 본문·썸네일·FAQ를 씁니다. 초안이 들어가면 칼럼 탭에서 미리보기 후 체크하면 공개됩니다.`,
      link: `/admin/columns/${r.id}/summary`
    });
  }
  return `새 글 ${posts.length}개 확인, 칼럼 ${created}개 추가`;
}

// 이번 달(KST) 블로그 글 최신 3개
async function monthPosts(supabase, ym) {
  const { data, error } = await supabase.from('columns').select('title, url, published_on')
    .gte('published_on', `${ym}-01`).lte('published_on', `${ym}-31`).order('published_on', { ascending: false }).limit(3);
  if (error) throw error;
  return data || [];
}

async function runNewsletter(supabase, { force = false } = {}) {
  const now = kstNow();
  const ym = now.toISOString().slice(0, 7);
  if (!force && now.getUTCDate() < 15) return `${ym}: 15일 이전이라 건너뜀`;

  // 이번 달에 만든 회차가 이미 있으면 알림 필요 없음
  const { data: camps, error } = await supabase.from('newsletter_campaigns')
    .select('id, subject, status, created_at').gte('created_at', new Date(`${ym}-01T00:00:00+09:00`).toISOString());
  if (error) throw error;
  if ((camps || []).length) return `${ym}: 이번 달 회차 있음 (${camps.map(c => `${c.subject} [${c.status}]`).join(', ')})`;

  const posts = await monthPosts(supabase, ym);
  const list = posts.map((p, i) => `${i + 1}. ${p.title} (${p.published_on}) ${p.url}`).join('\n');
  const made = await addTask(supabase, {
    kind: 'newsletter_draft',
    ref: `newsletter:${ym}`,
    title: `${Number(ym.slice(5))}월호 뉴스레터 초안 필요`,
    detail: `이번 달 블로그 글 ${posts.length}개로 초안을 만듭니다. Claude Code에 "자동화 할 일 처리해줘"라고 요청하면 프로젝트 폴더 초안/뉴스레터_${ym}.html 파일로 저장합니다. 파일을 열어 확인한 뒤 '뉴스레터 발송' 탭 → 회차 만들기에서 그 파일을 올리고, 미리보기·테스트 발송 후 [발송 시작]을 누르면 매일 오전 10시에 97명씩 자동 발송됩니다.\n${list || '(이번 달 블로그 글이 아직 없습니다)'}`,
    link: '/admin/dashboard#tab-mailing'
  });
  return made ? `${ym}: 초안 알림 생성 (블로그 글 ${posts.length}개)` : `${ym}: 알림 이미 있음`;
}

async function runSeoNew(supabase) {
  const r = await seo.findNewPages(supabase);
  if (r.seeded) return `처음 실행: 사이트맵 주소 ${r.seeded}개 기록`;
  for (const path of r.googleTasks) {
    await addTask(supabase, {
      kind: 'google_index',
      ref: `index:${path}`,
      title: `구글 색인 요청 필요: ${path}`,
      detail: `새 메뉴 페이지입니다. 네이버·Bing에는 IndexNow로 자동 전송했습니다. 구글 서치 콘솔 맨 위 검색창에 https://www.unicpat.com${path} 를 넣고 [색인 생성 요청]을 누른 뒤 '처리 완료'를 눌러 주세요. (칼럼·뉴스레터 글은 사이트맵으로 충분해 요청할 필요 없음)`,
      link: seo.GSC_INSPECT
    });
  }
  // 새로 공개한 한국어 칼럼 → 네이버 서치어드바이저 '웹 페이지 수집 요청' 할 일 (IndexNow와 별도로 직접 요청해 수집을 앞당김)
  const naverPaths = r.newPaths.filter(p => /^\/column\/\d+$/.test(p));
  for (const path of naverPaths) {
    const no = path.split('/').pop();
    const { data } = await supabase.from('columns').select('title').like('url', `%/unicpat/${no}%`).limit(1);
    const name = (data && data[0] && data[0].title) || path;
    await addTask(supabase, {
      kind: 'naver_index',
      ref: `naver:${path}`,
      title: `네이버 수집 요청: ${name}`,
      detail: `새 칼럼이 공개됐습니다. 네이버 서치어드바이저 → www.unicpat.com → 요청 → [웹 페이지 수집]에 https://www.unicpat.com${path} 를 넣고 [확인]을 누른 뒤 '처리 완료'를 눌러 주세요.`,
      link: NAVER_CONSOLE
    });
  }
  const ok = (r.indexNow || []).filter(x => x.status === 200 || x.status === 202).length;
  return r.newPaths.length
    ? `새 주소 ${r.newPaths.length}개 (IndexNow ${ok}/${(r.indexNow || []).length}곳 접수, 구글 요청 할 일 ${r.googleTasks.length}개, 네이버 수집 요청 할 일 ${naverPaths.length}개): ${r.newPaths.join(', ')}`
    : '새 주소 없음';
}

async function runSeoHealth(supabase, { force = false } = {}) {
  const now = kstNow();
  if (!force && now.getUTCDate() !== 1) return '매월 1일에만 실행';
  const ym = now.toISOString().slice(0, 7);
  const r = await seo.healthCheck();
  for (const p of r.problems) {
    await addTask(supabase, {
      kind: 'seo_issue',
      ref: `seo:${ym}:${p.path}:${p.issue}`.slice(0, 300),
      title: `검색엔진 점검 문제: ${p.path}`,
      detail: `${p.issue}\nClaude Code에 이 내용을 보여 주고 고쳐 달라고 요청하세요.`,
      link: `https://www.unicpat.com${p.path}`
    });
  }
  // 매월 직접 확인할 것 (공개 API가 없어 자동 확인 불가)
  await addTask(supabase, {
    kind: 'seo_issue',
    ref: `seo:${ym}:manual`,
    title: `${Number(ym.slice(5))}월 서치 콘솔·서치어드바이저 확인`,
    detail: '① 구글 서치 콘솔 → 페이지(색인 생성): "색인이 생성되지 않음" 사유에 새로 늘어난 것이 없는지\n② 구글 서치 콘솔 → Sitemaps: sitemap.xml 상태 "성공"인지\n③ 네이버 서치어드바이저 → 리포트 → 수집 현황·사이트맵: 오류가 없는지\n확인 후 \'처리 완료\'를 눌러 주세요.',
    link: seo.GSC_INSPECT
  });
  return `점검 ${r.checked}곳 (사이트맵 ${r.sitemapCount}개 주소), 문제 ${r.problems.length}건${r.problems.length ? ': ' + r.problems.map(p => `${p.path} ${p.issue}`).join(' / ') : ''}`;
}

async function runGov(supabase) {
  const now = kstNow();
  const r = await govSearch.collect(supabase);
  if (r.added) {
    await addTask(supabase, {
      kind: 'gov_candidates',
      ref: `gov:${now.toISOString().slice(0, 10)}`,
      title: `정부지원사업 공고 ${r.added}건 승인 대기`,
      detail: '정부지원사업 탭 맨 위 "승인 대기 공고"에서 홈페이지에 올릴 공고는 [승인], 아닌 것은 [제외]를 눌러 주세요. 접수기간은 자동으로 채워져 있습니다(비어 있으면 공고 링크에서 확인해 입력). 마감이 지나면 홈페이지에서 자동으로 사라집니다.',
      link: '/admin/dashboard#tab-gov-support'
    });
  }
  return `수집 ${r.scanned}건 중 관련 ${r.picked}건, 새 후보 ${r.added}건, 승인 대기 ${r.pending}건 (${r.notes.join(', ')})`;
}

async function runSocial(supabase) {
  const since = kstNow(new Date(Date.now() - 30 * 86400000)).toISOString().slice(0, 10);
  const [{ data: cols, error }, { data: posts, error: e2 }] = await Promise.all([
    supabase.from('columns').select('id, title, url, published_on').eq('summary_ready', true).gte('published_on', since),
    supabase.from('social_posts').select('source_ref')
  ]);
  if (error) throw error;
  if (e2) throw e2;
  const have = new Set((posts || []).map(p => p.source_ref));
  let made = 0;
  for (const c of cols || []) {
    const no = blogPostNo(c.url);
    if (!no || have.has(`column:${no}`)) continue;
    if (await addTask(supabase, {
      kind: 'social_draft',
      ref: `social:column:${no}`,
      title: `게시글 초안 필요: ${c.title}`,
      detail: `공개된 칼럼으로 구글 비즈니스 프로필·네이버 플레이스 소식 초안을 만듭니다. Claude Code에 "자동화 할 일 처리해줘"라고 요청하면 초안/게시글_${no}.txt 파일로 저장합니다(본문, 버튼 링크, 첨부 사진). 복사해 두 곳에 게시한 뒤 '처리 완료'를 눌러 주세요.`,
      link: `https://www.unicpat.com/column/${no}`
    })) made++;
  }
  return `최근 30일 공개 칼럼 ${(cols || []).length}개, 새 할 일 ${made}개`;
}

const RUNNERS = { blog: runBlog, newsletter: runNewsletter, seo_new: runSeoNew, seo_health: runSeoHealth, gov: runGov, social: runSocial };

// 작업 하나 실행 (관리자 화면의 [지금 실행]은 force=true로 날짜 조건 무시)
async function runJob(supabase, job, opts = {}) {
  const fn = RUNNERS[job];
  if (!fn) throw new Error(`알 수 없는 작업: ${job}`);
  try {
    const summary = await fn(supabase, opts);
    await logRun(supabase, job, true, summary);
    return { job, ok: true, summary };
  } catch (err) {
    const summary = err.message || String(err);
    await logRun(supabase, job, false, summary);
    return { job, ok: false, summary };
  }
}

// 매일 자동 실행: 오늘 해당하는 작업만
async function runDaily(supabase, date = new Date()) {
  const now = kstNow(date);
  const jobs = ['seo_new', 'social'];
  if (now.getUTCDay() === 1) jobs.unshift('blog', 'gov');   // 월요일 (공고는 접수기간이 짧아 매주)
  if (now.getUTCDate() >= 15) jobs.push('newsletter');      // 15일부터 (이번 달 회차가 생기면 저절로 멈춤)
  if (now.getUTCDate() === 1) jobs.push('seo_health');
  const results = [];
  for (const job of jobs) results.push(await runJob(supabase, job)); // 블로그 → 게시글 순서가 중요해 차례로
  await autoClose(supabase).catch(err => console.error('autoClose error:', err.message || err));
  return results;
}

// 실제 일이 끝난 할 일은 저절로 '처리 완료'로 바꿈
//  - 칼럼 초안: 요약을 공개(체크)하면  - 뉴스레터 초안: 그 달 회차를 발송 시작하면  - 게시글 초안: 초안이 올라오면
async function autoClose(supabase) {
  const { data: open, error } = await supabase.from('automation_tasks').select('id, kind, ref')
    .eq('status', 'open').in('kind', ['column_draft', 'newsletter_draft', 'social_draft']);
  if (error || !open || !open.length) return 0;

  const [{ data: cols }, { data: posts }, { data: camps }] = await Promise.all([
    supabase.from('columns').select('url, summary_ready').eq('summary_ready', true),
    supabase.from('social_posts').select('source_ref'),
    supabase.from('newsletter_campaigns').select('status, created_at').neq('status', 'draft')
  ]);
  const published = new Set((cols || []).map(c => blogPostNo(c.url)).filter(Boolean));
  const socialDone = new Set((posts || []).map(p => p.source_ref));
  const sentMonths = new Set((camps || []).map(c => kstNow(new Date(c.created_at)).toISOString().slice(0, 7)));

  const done = open.filter(t => {
    const key = t.ref.split(':').pop();
    if (t.kind === 'column_draft') return published.has(key);
    if (t.kind === 'newsletter_draft') return sentMonths.has(key);
    if (t.kind === 'social_draft') return socialDone.has(`column:${key}`);
    return false;
  }).map(t => t.id);
  if (done.length) {
    await supabase.from('automation_tasks').update({ status: 'done', handled_at: new Date().toISOString() }).in('id', done);
  }
  return done.length;
}

// 자동화 탭 화면에 필요한 값
async function getOverview(supabase) {
  const ym = kstNow().toISOString().slice(0, 7);
  await autoClose(supabase).catch(err => console.error('autoClose error:', err.message || err));
  const [tasks, runs, gov, social, cols, camps] = await Promise.all([
    supabase.from('automation_tasks').select('*').eq('status', 'open').order('created_at', { ascending: false }).limit(200),
    supabase.from('automation_runs').select('*').order('ran_at', { ascending: false }).limit(40),
    supabase.from('gov_candidates').select('*').eq('status', 'new').order('score', { ascending: false }).order('posted_on', { ascending: false }).limit(100),
    supabase.from('social_posts').select('*').neq('status', 'posted').order('created_at', { ascending: false }).limit(50),
    supabase.from('columns').select('id, title, url, summary_ready'),
    supabase.from('newsletter_campaigns').select('id, subject, status, created_at').order('created_at', { ascending: false }).limit(3)
  ]);
  const missing = [tasks, runs, gov, social].find(r => r.error);
  if (missing) return { setupNeeded: true, error: missing.error.message };

  const filled = await filledColumnIds(supabase).catch(() => new Set());
  const colRows = (cols.data || []).map(c => ({ ...c, filled: filled.has(c.id) }));
  const lastRun = {};
  for (const r of runs.data || []) if (!lastRun[r.job]) lastRun[r.job] = r;

  return {
    setupNeeded: false,
    jobs: JOBS,
    lastRun,
    tasks: tasks.data || [],
    runs: runs.data || [],
    govCandidates: gov.data || [],
    socialPosts: social.data || [],
    columns: {
      needDraft: colRows.filter(c => !c.filled && blogPostNo(c.url)),
      awaiting: colRows.filter(c => c.filled && !c.summary_ready)
    },
    campaigns: camps.data || [],
    month: ym
  };
}

module.exports = { JOBS, runJob, runDaily, getOverview, addTask, autoClose };
