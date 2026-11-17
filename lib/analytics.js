const crypto = require('crypto');
const { waitUntil } = require('@vercel/functions');
const { createAnonClient } = require('./supabase');

// 통계를 기록할 페이지 (경로 → 관리자 화면에 보여줄 이름)
const PAGE_NAMES = {
  '/': '홈',
  '/about': '유니크 소개',
  '/column': '유니크 칼럼',
  '/newsletter': '뉴스레터',
  '/gov-support': '정부지원사업',
  '/contact': '상담 문의',
  '/patent': '특허',
  '/trademark': '상표',
  '/design': '디자인',
  '/startup': '스타트업',
  '/dispute-transfer': '분쟁/이전',
  '/subscribe': '뉴스레터 구독',
  '/thanks': '문의 완료',
  '/thanks-subscribe': '구독 완료'
};

// 고정 메뉴 외에 기록할 글 페이지 (검색으로 들어오는 사람은 대부분 여기로 들어옴)
const COLUMN_POST_RE = /^\/column\/(\d+)$/;
const NEWSLETTER_POST_RE = /^\/newsletter\/([^/]+)$/;

const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|preview|monitor|headless|lighthouse|curl|wget|python|axios|node-fetch|go-http/i;
const VISITOR_COOKIE = 'vid';
const KST_OFFSET = 9 * 60 * 60 * 1000;
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const supabase = createAnonClient();

function isTrackedPath(path) {
  return !!PAGE_NAMES[path] || COLUMN_POST_RE.test(path) || NEWSLETTER_POST_RE.test(path);
}

function deviceOf(ua) {
  if (/ipad|tablet/i.test(ua)) return '태블릿';
  if (/mobi|android|iphone/i.test(ua)) return '모바일';
  return 'PC';
}

function decodeHeader(value) {
  if (!value) return null;
  try { return decodeURIComponent(value); } catch { return value; }
}

// 외부에서 들어온 경우만 referrer를 저장 (사이트 내부 이동은 제외)
function externalReferrer(req) {
  const ref = req.get('referer');
  if (!ref) return null;
  try {
    const url = new URL(ref);
    if (!/^https?:$/.test(url.protocol) || url.host === req.get('host')) return null;
    return ref.slice(0, 500);
  } catch {
    return null;
  }
}

// 링크에 붙인 ?utm_source=… 값 (예: 뉴스레터 메일의 링크)
function utmSourceOf(req) {
  const v = req.query && req.query.utm_source;
  if (typeof v !== 'string' || !v.trim()) return null;
  return v.trim().toLowerCase().slice(0, 50);
}

// page_views_v2.sql을 아직 실행하지 않았으면 기본 칸만 저장 (10분마다 다시 확인)
let extraColumnsMissing = false;
let extraColumnsCheckedAt = 0;

async function insertPageView(row) {
  if (extraColumnsMissing && Date.now() - extraColumnsCheckedAt > 10 * 60 * 1000) extraColumnsMissing = false;
  if (!extraColumnsMissing) {
    const { error } = await supabase.from('page_views').insert(row);
    if (!error) return;
    if (!/utm_source|is_new|column/i.test(error.message)) {
      console.error('Page view insert error:', error.message);
      return;
    }
    extraColumnsMissing = true;
    extraColumnsCheckedAt = Date.now();
  }
  const { utm_source, is_new, ...basic } = row;
  const { error } = await supabase.from('page_views').insert(basic);
  if (error) console.error('Page view insert error:', error.message);
}

// --- 방문 기록 미들웨어 ---
function trackPageView(req, res, next) {
  const ua = req.get('user-agent') || '';
  const isPrefetch = /prefetch|prerender/i.test(req.get('purpose') || req.get('sec-purpose') || '');
  // 관리자로 로그인한 브라우저의 방문은 통계에서 제외
  const isAdmin = !!(req.signedCookies && req.signedCookies.sb_access_token);

  if (req.method !== 'GET' || !isTrackedPath(req.path) || BOT_RE.test(ua) || isPrefetch || isAdmin) {
    return next();
  }

  // 개인 식별 정보 대신 무작위 방문자 ID를 쿠키로 부여
  let visitorId = req.cookies[VISITOR_COOKIE];
  const isNew = !visitorId;
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    res.cookie(VISITOR_COOKIE, visitorId, {
      maxAge: 365 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });
  }

  // 응답을 지연시키지 않되, Vercel이 함수를 종료하기 전에 저장이 끝나도록 waitUntil 사용
  waitUntil(insertPageView({
    path: req.path,
    referrer: externalReferrer(req),
    visitor_id: visitorId,
    device: deviceOf(ua),
    country: req.get('x-vercel-ip-country') || null,
    city: decodeHeader(req.get('x-vercel-ip-city')),
    lang: res.locals.lang || null,
    utm_source: utmSourceOf(req),
    is_new: isNew
  }));

  next();
}

// --- 관리자 통계 집계 ---
function kstDate(iso) {
  return new Date(new Date(iso).getTime() + KST_OFFSET).toISOString().slice(0, 10);
}

function weekdayOf(date) {
  return WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];
}

function sourceOf(row) {
  if (row.utm_source) {
    if (/newsletter|email|mail/.test(row.utm_source)) return '뉴스레터';
    if (/blog/.test(row.utm_source)) return '네이버 블로그';
    return row.utm_source;
  }
  const ref = row.referrer;
  if (!ref) return '직접 방문';
  let host;
  try { host = new URL(ref).hostname.replace(/^www\.|^m\./, ''); } catch { return '기타'; }
  if (host === 'blog.naver.com' || host.endsWith('.blog.naver.com')) return '네이버 블로그';
  if (host.includes('naver')) return '네이버 검색';
  if (host.includes('google')) return '구글';
  if (host.includes('daum') || host.includes('kakao')) return '다음/카카오';
  if (host.includes('bing')) return '빙';
  if (host.includes('instagram')) return '인스타그램';
  if (host.includes('facebook')) return '페이스북';
  if (host.includes('youtube')) return '유튜브';
  if (/mail/.test(host)) return '뉴스레터';
  return host;
}

function topEntries(counter, limit = 10) {
  return Object.entries(counter)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

function bump(counter, key) {
  counter[key] = (counter[key] || 0) + 1;
}

async function fetchPageViews(supabase, since) {
  const PAGE = 1000;
  const MAX_ROWS = 50000;
  const base = 'created_at, path, referrer, visitor_id, device, country, city';
  let columns = `${base}, utm_source, is_new`;
  const rows = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    let { data, error } = await supabase
      .from('page_views')
      .select(columns)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
      .range(from, from + PAGE - 1);
    if (error && columns !== base && /utm_source|is_new|column/i.test(error.message)) {
      columns = base; // 새 칸이 아직 없으면 기본 칸만 조회
      from -= PAGE;
      continue;
    }
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return { rows, hasExtraColumns: columns !== base };
}

// 칼럼 글 경로(/column/글번호)를 제목으로 표시
async function columnTitles(supabase) {
  const { data, error } = await supabase.from('columns').select('title, url');
  if (error) return {};
  const titles = {};
  for (const c of data || []) {
    const m = String(c.url || '').match(/blog\.naver\.com\/unicpat\/(\d+)/);
    if (m) titles[m[1]] = c.title;
  }
  return titles;
}

function pageLabel(path, titles) {
  if (PAGE_NAMES[path]) return PAGE_NAMES[path];
  const col = path.match(COLUMN_POST_RE);
  if (col) return `칼럼: ${titles[col[1]] || col[1]}`;
  if (NEWSLETTER_POST_RE.test(path)) return '지난 뉴스레터 글';
  return path;
}

async function getVisitStats(supabase, days) {
  const todayKst = kstDate(new Date().toISOString());
  // KST 기준으로 (days - 1)일 전 0시부터. 첫날도 전일 대비를 보여 주려고 하루 더 가져옴
  const since = new Date(new Date(`${todayKst}T00:00:00+09:00`).getTime() - days * 24 * 60 * 60 * 1000);
  const [{ rows: allRows, hasExtraColumns }, titles] = await Promise.all([
    fetchPageViews(supabase, since),
    columnTitles(supabase)
  ]);

  const daily = {};
  for (let i = days; i >= 0; i--) {
    const d = kstDate(new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString());
    daily[d] = { views: 0, visitors: new Set(), newVisitors: new Set(), sources: {}, pages: {} };  }
  const firstDate = Object.keys(daily)[1];
  const rows = allRows.filter(r => kstDate(r.created_at) >= firstDate);

  const visitors = new Set();
  const newVisitors = new Set();
  const pages = {}, sources = {}, regions = {}, devices = {};

  // 방문자의 그날 유입 경로: 외부에서 들어온 경로가 있으면 그것, 없으면 '직접 방문'
  // (사이트 안에서 페이지를 옮겨 다닌 기록은 referrer가 없어 직접 방문처럼 보이므로 방문자당 하루 한 번만 셈)
  const visitorDaySource = {};
  for (const r of allRows) {
    const date = kstDate(r.created_at);
    const day = daily[date];
    if (!day) continue;
    day.views++;
    day.visitors.add(r.visitor_id);
    if (r.is_new) day.newVisitors.add(r.visitor_id);
    bump(day.pages, pageLabel(r.path, titles));
    const key = `${date}|${r.visitor_id}`;
    const source = sourceOf(r);
    if (!visitorDaySource[key] || (visitorDaySource[key] === '직접 방문' && source !== '직접 방문')) {
      visitorDaySource[key] = source;
    }
  }
  for (const [key, source] of Object.entries(visitorDaySource)) {
    const date = key.slice(0, 10);
    bump(daily[date].sources, source);
    if (date >= firstDate) bump(sources, source);
  }

  for (const r of rows) {
    visitors.add(r.visitor_id);
    if (r.is_new) newVisitors.add(r.visitor_id);
    bump(pages, pageLabel(r.path, titles));
    bump(regions, r.city || r.country || '알 수 없음');
    bump(devices, r.device || '알 수 없음');
  }

  const dates = Object.keys(daily);
  const dailyAll = dates.map(date => {
    const d = daily[date];
    const srcs = topEntries(d.sources, 5);
    // 직접 방문 외의 경로 중 가장 많은 것을 '주요 유입'으로 표시
    const external = srcs.find(s => s.label !== '직접 방문');
    return {
      date,
      weekday: weekdayOf(date),
      views: d.views,
      visitors: d.visitors.size,
      newVisitors: d.newVisitors.size,
      topSource: external ? external.label : (srcs[0] ? srcs[0].label : '-'),
      topPage: topEntries(d.pages, 1)[0]?.label || '-',
      sources: srcs,
      pages: topEntries(d.pages, 5)
    };
  });
  dailyAll.forEach((d, i) => {
    const prev = dailyAll[i - 1];
    d.visitorsDiff = prev ? d.visitors - prev.visitors : null;
    d.viewsDiff = prev ? d.views - prev.views : null;
  });
  const dailyList = dailyAll.slice(1);
  const today = dailyList[dailyList.length - 1];
  const yesterday = dailyList[dailyList.length - 2] || dailyAll[0];

  // 지난 7일 평균 (오늘 제외)과 비교
  const prev7 = dailyAll.slice(-8, -1);
  const avg7Visitors = prev7.length ? prev7.reduce((s, d) => s + d.visitors, 0) / prev7.length : 0;

  return {
    days,
    hasExtraColumns,
    totalViews: rows.length,
    totalVisitors: visitors.size,
    totalNewVisitors: newVisitors.size,
    viewsPerVisitor: visitors.size ? rows.length / visitors.size : 0,
    todayViews: today.views,
    todayVisitors: today.visitors,
    todayNewVisitors: today.newVisitors,
    yesterdayViews: yesterday.views,
    yesterdayVisitors: yesterday.visitors,
    avg7Visitors,
    daily: dailyList,
    topPages: topEntries(pages),
    topSources: topEntries(sources),
    topRegions: topEntries(regions),
    devices: topEntries(devices),
    recent: rows.slice(0, 50).map(r => ({
      time: new Date(new Date(r.created_at).getTime() + KST_OFFSET).toISOString().slice(5, 16).replace('T', ' '),
      page: pageLabel(r.path, titles),
      source: sourceOf(r),
      referrer: r.referrer,
      isNew: !!r.is_new,
      region: [r.city, r.country].filter(Boolean).join(', ') || '-',
      device: r.device || '-',
      visitor: (r.visitor_id || '').slice(0, 6)
    }))
  };
}

module.exports = { trackPageView, getVisitStats };
