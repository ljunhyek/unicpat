// 검색엔진 등록 모니터링
// 1) 새 페이지 찾기(매일): 사이트맵 주소를 지난번 목록과 비교해 새 주소를 IndexNow(네이버·Bing)로 보내고,
//    메뉴 페이지처럼 구글에 직접 색인 요청할 만한 주소는 '할 일'로 남깁니다.
// 2) 점검(매월 1일): 주요 페이지가 열리는지, 제목·설명·대표주소(canonical)가 있는지, noindex가 없는지,
//    robots.txt·사이트맵·확인 파일이 제대로 있는지, 홈페이지 메뉴 링크가 사이트맵에 다 들어 있는지 확인합니다.
// 구글 서치 콘솔·네이버 서치어드바이저의 '색인됨' 여부는 공개 API가 없어 직접 확인하는 링크를 함께 남깁니다.

const indexNow = require('./indexnow');

const SITE = () => (process.env.SITE_URL || 'https://www.unicpat.com').replace(/\/$/, '');
const GSC_INSPECT = 'https://search.google.com/search-console?resource_id=sc-domain%3Aunicpat.com';

// 칼럼·뉴스레터 글은 사이트맵 + IndexNow로 충분 → 구글 직접 요청은 메뉴(고정) 페이지만
const isArticle = path => /^\/(column|newsletter)\/[^/]+$/.test(path);

async function fetchText(url, timeout = 15000) {
  const res = await fetch(url, { headers: { 'User-Agent': 'UnicpatSiteMonitor/1.0' }, redirect: 'follow', signal: AbortSignal.timeout(timeout) });
  return { status: res.status, text: await res.text(), finalUrl: res.url };
}

async function sitemapPaths() {
  const { status, text } = await fetchText(`${SITE()}/sitemap.xml`);
  if (status !== 200) throw new Error(`sitemap.xml HTTP ${status}`);
  return [...text.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => new URL(m[1].trim()).pathname);
}

// 새 주소 찾기 → IndexNow 전송. { newPaths, googleTasks } 돌려줌
async function findNewPages(supabase) {
  const paths = await sitemapPaths();
  const { data: known, error } = await supabase.from('seo_known_urls').select('url');
  if (error) throw error;
  const knownSet = new Set((known || []).map(r => r.url));

  // 처음 실행: 지금 있는 주소를 모두 '이미 본 주소'로 기록만 함 (이미 등록 작업을 마친 상태)
  if (!knownSet.size) {
    const rows = paths.map(url => ({ url }));
    for (let i = 0; i < rows.length; i += 500) {
      const { error: e } = await supabase.from('seo_known_urls').upsert(rows.slice(i, i + 500), { ignoreDuplicates: true });
      if (e) throw e;
    }
    return { newPaths: [], googleTasks: [], seeded: paths.length };
  }

  const newPaths = paths.filter(p => !knownSet.has(p));
  if (!newPaths.length) return { newPaths, googleTasks: [] };

  const results = await indexNow.submitUrls(newPaths);
  const sent = results.some(r => r.status === 200 || r.status === 202);
  const { error: e } = await supabase.from('seo_known_urls')
    .upsert(newPaths.map(url => ({ url, indexnow_at: sent ? new Date().toISOString() : null })), { ignoreDuplicates: true });
  if (e) throw e;
  return { newPaths, googleTasks: newPaths.filter(p => !isArticle(p)), indexNow: results };
}

function checkPage(path, { status, text }) {
  const problems = [];
  if (status !== 200) return [`HTTP ${status}`];
  if (!/<title>[^<]{5,}<\/title>/i.test(text)) problems.push('제목(title) 없음');
  if (!/<meta[^>]+name=["']description["'][^>]+content=["'][^"']{20,}/i.test(text)) problems.push('설명(meta description) 없음·너무 짧음');
  if (!/<link[^>]+rel=["']canonical["']/i.test(text)) problems.push('대표 주소(canonical) 없음');
  if (/<meta[^>]+name=["']robots["'][^>]+noindex/i.test(text)) problems.push('noindex 설정됨 (검색 제외)');
  return problems;
}

// 홈페이지의 내부 링크 중 사이트맵에 없는 메뉴 페이지
function menuLinks(html) {
  const skip = /^\/(admin|api|set-lang|thanks|unsubscribe|nl|css|js|images|fonts|newsletter\/|column\/\d)|\.(png|jpe?g|svg|pdf|css|js|ico|webp|txt|xml)$/i;
  return [...new Set([...html.matchAll(/href=["'](\/[^"'#?\s]*)/g)].map(m => m[1].replace(/\/$/, '') || '/'))]
    .filter(p => !skip.test(p));
}

// 월간 점검. problems: [{ path, issue }]
async function healthCheck() {
  const site = SITE();
  const problems = [];
  const add = (path, issue) => problems.push({ path, issue });

  const paths = await sitemapPaths();
  const pathSet = new Set(paths);
  const fixed = paths.filter(p => !isArticle(p));

  // 고정 페이지는 모두, 글 페이지는 최근 것 몇 개만 표본 점검
  const sample = [...fixed, ...paths.filter(isArticle).slice(0, 5)];
  const pages = await Promise.allSettled(sample.map(p => fetchText(site + p)));
  pages.forEach((r, i) => {
    if (r.status === 'rejected') return add(sample[i], `열리지 않음: ${r.reason && r.reason.message}`);
    checkPage(sample[i], r.value).forEach(issue => add(sample[i], issue));
  });

  // 홈페이지 메뉴 링크가 사이트맵에 있는지
  const home = pages[sample.indexOf('/')];
  if (home && home.status === 'fulfilled') {
    menuLinks(home.value.text).filter(p => !pathSet.has(p))
      .forEach(p => add(p, '홈페이지에 링크가 있지만 사이트맵에 없음 (routes/pages.js SITEMAP_PAGES에 추가 필요)'));
  }

  // robots.txt, IndexNow 키 파일, 네이버 사이트 확인 파일
  const extra = await Promise.allSettled([
    fetchText(`${site}/robots.txt`),
    fetchText(`${site}/${indexNow.KEY}.txt`),
    fetchText(`${site}/naver67b06eeebac92e32d8ba856024d4b76d.html`)
  ]);
  const [robots, keyFile, naverFile] = extra.map(r => (r.status === 'fulfilled' ? r.value : { status: 0, text: '' }));
  if (robots.status !== 200 || !/Sitemap:\s*https:\/\/www\.unicpat\.com\/sitemap\.xml/i.test(robots.text)) add('/robots.txt', '사이트맵 주소가 없거나 열리지 않음');
  if (/Disallow:\s*\/\s*$/m.test(robots.text)) add('/robots.txt', '사이트 전체 수집 차단(Disallow: /) 설정됨');
  if (keyFile.status !== 200 || !keyFile.text.includes(indexNow.KEY)) add(`/${indexNow.KEY}.txt`, 'IndexNow 키 파일이 열리지 않음 (네이버·Bing 자동 알림 실패)');
  if (naverFile.status !== 200) add('/naver67b06eeebac92e32d8ba856024d4b76d.html', '네이버 사이트 소유확인 파일이 열리지 않음');

  return { checked: sample.length + 3, sitemapCount: paths.length, problems };
}

module.exports = { findNewPages, healthCheck, isArticle, GSC_INSPECT };
