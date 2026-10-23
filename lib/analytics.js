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

const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|preview|monitor|headless|lighthouse|curl|wget|python|axios|node-fetch|go-http/i;
const VISITOR_COOKIE = 'vid';
const KST_OFFSET = 9 * 60 * 60 * 1000;

const supabase = createAnonClient();

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

// --- 방문 기록 미들웨어 ---
function trackPageView(req, res, next) {
  const ua = req.get('user-agent') || '';
  const isPrefetch = /prefetch|prerender/i.test(req.get('purpose') || req.get('sec-purpose') || '');

  if (req.method !== 'GET' || !PAGE_NAMES[req.path] || BOT_RE.test(ua) || isPrefetch) {
    return next();
  }

  // 개인 식별 정보 대신 무작위 방문자 ID를 쿠키로 부여
  let visitorId = req.cookies[VISITOR_COOKIE];
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
  waitUntil(supabase.from('page_views').insert({
    path: req.path,
    referrer: externalReferrer(req),
    visitor_id: visitorId,
    device: deviceOf(ua),
    country: req.get('x-vercel-ip-country') || null,
    city: decodeHeader(req.get('x-vercel-ip-city')),
    lang: res.locals.lang || null
  }).then(({ error }) => {
    if (error) console.error('Page view insert error:', error.message);
  }));

  next();
}

// --- 관리자 통계 집계 ---
function kstDate(iso) {
  return new Date(new Date(iso).getTime() + KST_OFFSET).toISOString().slice(0, 10);
}

function referrerSource(ref) {
  if (!ref) return '직접 방문';
  let host;
  try { host = new URL(ref).hostname.replace(/^www\.|^m\./, ''); } catch { return '기타'; }
  if (host.includes('naver')) return '네이버';
  if (host.includes('google')) return '구글';
  if (host.includes('daum') || host.includes('kakao')) return '다음/카카오';
  if (host.includes('bing')) return '빙';
  if (host.includes('instagram')) return '인스타그램';
  if (host.includes('facebook')) return '페이스북';
  if (host.includes('youtube')) return '유튜브';
  return host;
}

function topEntries(counter, limit = 10) {
  return Object.entries(counter)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

async function fetchPageViews(supabase, since) {
  const PAGE = 1000;
  const MAX_ROWS = 50000;
  const rows = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const { data, error } = await supabase
      .from('page_views')
      .select('created_at, path, referrer, visitor_id, device, country, city')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
}

async function getVisitStats(supabase, days) {
  const todayKst = kstDate(new Date().toISOString());
  // KST 기준으로 (days - 1)일 전 0시부터
  const since = new Date(new Date(`${todayKst}T00:00:00+09:00`).getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  const rows = await fetchPageViews(supabase, since);

  const daily = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = kstDate(new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString());
    daily[d] = { views: 0, visitors: new Set() };
  }

  const visitors = new Set();
  const pages = {}, sources = {}, regions = {}, devices = {};

  for (const r of rows) {
    const day = daily[kstDate(r.created_at)];
    if (day) {
      day.views++;
      day.visitors.add(r.visitor_id);
    }
    visitors.add(r.visitor_id);

    const page = PAGE_NAMES[r.path] || r.path;
    pages[page] = (pages[page] || 0) + 1;
    const source = referrerSource(r.referrer);
    sources[source] = (sources[source] || 0) + 1;
    const region = r.city || (r.country ? r.country : '알 수 없음');
    regions[region] = (regions[region] || 0) + 1;
    devices[r.device || '알 수 없음'] = (devices[r.device || '알 수 없음'] || 0) + 1;
  }

  const dailyList = Object.entries(daily).map(([date, d]) => ({ date, views: d.views, visitors: d.visitors.size }));
  const today = dailyList[dailyList.length - 1];

  return {
    days,
    totalViews: rows.length,
    totalVisitors: visitors.size,
    todayViews: today.views,
    todayVisitors: today.visitors,
    daily: dailyList,
    topPages: topEntries(pages),
    topSources: topEntries(sources),
    topRegions: topEntries(regions),
    devices: topEntries(devices),
    recent: rows.slice(0, 50).map(r => ({
      time: new Date(new Date(r.created_at).getTime() + KST_OFFSET).toISOString().slice(5, 16).replace('T', ' '),
      page: PAGE_NAMES[r.path] || r.path,
      source: referrerSource(r.referrer),
      referrer: r.referrer,
      region: [r.city, r.country].filter(Boolean).join(', ') || '-',
      device: r.device || '-',
      visitor: (r.visitor_id || '').slice(0, 6)
    }))
  };
}

module.exports = { trackPageView, getVisitStats };
