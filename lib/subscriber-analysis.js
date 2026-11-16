// 구독자 현황 분석 (발송 대상 정리용): 업종·기업인증·지역·규모·열람 여부별 인원

const { getRecipientStats } = require('./newsletter-mailer');

const FREE_MAIL = new Set([
  'naver.com', 'gmail.com', 'daum.net', 'hanmail.net', 'nate.com', 'kakao.com',
  'hotmail.com', 'outlook.com', 'yahoo.com', 'yahoo.co.kr', 'korea.com', 'empas.com', 'dreamwiz.com', 'paran.com'
]);

function employeeBand(n) {
  if (n == null || n === '' || Number.isNaN(Number(n))) return '정보 없음';
  n = Number(n);
  if (n < 5) return '1~4명';
  if (n < 10) return '5~9명';
  if (n < 50) return '10~49명';
  if (n < 100) return '50~99명';
  if (n < 300) return '100~299명';
  return '300명 이상';
}
const EMPLOYEE_ORDER = ['1~4명', '5~9명', '10~49명', '50~99명', '100~299명', '300명 이상', '정보 없음'];

// '벤처, 이노비즈/메인비즈' 같은 값을 인증별로 나눔 (한 기업이 여러 항목에 들어갈 수 있음)
function splitList(v) {
  return String(v || '').split(/[,/·;|]+/).map(s => s.trim()).filter(Boolean);
}

function engagement(stat) {
  if (!stat) return '아직 안 받음';
  return stat.openedCampaigns > 0 ? '받고 열어봄' : '받았지만 안 열어봄';
}

async function fetchSubscribers(supabase) {
  const PAGE = 1000;
  const all = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from('newsletter_subscribers')
      .select('id, email, company_name, biz_no, industry, industry_name, employees, region, size, certification, source, status')
      .order('id')
      .range(from, from + PAGE - 1);
    if (error) throw error;
    all.push(...data);
    if (data.length < PAGE) break;
  }
  return all;
}

// 항목별 표: [값, 수신 가능 인원, 그중 열어본 인원], 인원 많은 순
function tally(rows, keyFn, { order, limit = 20 } = {}) {
  const map = new Map();
  for (const r of rows) {
    const keys = [].concat(keyFn(r)).map(k => (k == null || k === '' ? '정보 없음' : String(k)));
    for (const k of keys.length ? keys : ['정보 없음']) {
      const e = map.get(k) || { label: k, count: 0, opened: 0 };
      e.count += 1;
      if (r.opened) e.opened += 1;
      map.set(k, e);
    }
  }
  let list = [...map.values()];
  list = order
    ? list.sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label))
    : list.sort((a, b) => b.count - a.count);
  const rest = list.slice(limit);
  list = list.slice(0, limit);
  if (rest.length) list.push({ label: `그 외 ${rest.length}개`, count: rest.reduce((s, e) => s + e.count, 0), opened: rest.reduce((s, e) => s + e.opened, 0), other: true });
  return list;
}

async function analyzeSubscribers(supabase) {
  const [subs, stats] = await Promise.all([fetchSubscribers(supabase), getRecipientStats(supabase)]);

  const statusCounts = { active: 0, unsubscribed: 0, bounced: 0, complained: 0 };
  for (const s of subs) statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;

  // 이하 분석은 수신 가능한 주소만
  const active = subs.filter(s => s.status === 'active').map(s => {
    const stat = stats.get(s.id);
    return { ...s, stat, opened: !!(stat && stat.openedCampaigns > 0) };
  });

  // 같은 사업자번호로 여러 주소가 있는 경우 (첫 주소 외 나머지 수)
  const byBiz = new Map();
  for (const s of active) {
    const key = String(s.biz_no || '').replace(/\D/g, '');
    if (!key) continue;
    byBiz.set(key, (byBiz.get(key) || 0) + 1);
  }
  const duplicateExtra = [...byBiz.values()].reduce((sum, n) => sum + (n - 1), 0);
  const duplicateCompanies = [...byBiz.values()].filter(n => n > 1).length;

  const domainOf = e => String(e || '').split('@')[1]?.toLowerCase() || '';

  return {
    total: subs.length,
    statusCounts,
    activeCount: active.length,
    openedCount: active.filter(s => s.opened).length,
    duplicateExtra,
    duplicateCompanies,
    sections: [
      { title: '발송 반응', rows: tally(active, s => engagement(s.stat), { order: ['받고 열어봄', '받았지만 안 열어봄', '아직 안 받음'] }) },
      { title: '가입 경로', rows: tally(active, s => s.source) },
      { title: '기업인증 (여러 개면 각각 집계)', rows: tally(active, s => splitList(s.certification)) },
      { title: '업종', rows: tally(active, s => s.industry, { limit: 25 }) },
      { title: '업종명 (세부)', rows: tally(active, s => s.industry_name, { limit: 25 }) },
      { title: '지역', rows: tally(active, s => s.region, { limit: 25 }) },
      { title: '기업 규모', rows: tally(active, s => s.size) },
      { title: '종업원 수', rows: tally(active, s => employeeBand(s.employees), { order: EMPLOYEE_ORDER }) },
      { title: '이메일 종류', rows: tally(active, s => (FREE_MAIL.has(domainOf(s.email)) ? '개인 메일 (네이버·지메일 등)' : '회사 도메인 메일')) }
    ]
  };
}

module.exports = { analyzeSubscribers };
