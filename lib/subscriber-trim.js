// 발송 대상 정리: 수신 가능한 구독자 중 목표 인원(기본 1,500곳)만 남기고 나머지는 '보류'(paused)로 바꿈
// 순서: ① 같은 회사 중복·특허 수요 낮은 업종 제외 → ② 기업인증·구독 신청자 → ③ 관련 업종 5명 이상 → ④ 관련 업종 1~4명 회사 메일
// 보류는 지우는 것이 아니라 언제든 '수신 가능'으로 되돌릴 수 있음

const SIGNUP_SOURCE = 'website_signup';
const RELEVANT_INDUSTRIES = new Set(['제조업', '출판/영상', '과학/기술']);
const LOW_INDUSTRIES = new Set(['도매/소매', '하수/폐기물', '시설관리', '교육/서비스', '기타']);
const FREE_MAIL = new Set([
  'naver.com', 'gmail.com', 'daum.net', 'hanmail.net', 'nate.com', 'kakao.com',
  'hotmail.com', 'outlook.com', 'yahoo.com', 'yahoo.co.kr', 'korea.com', 'empas.com', 'dreamwiz.com', 'paran.com'
]);

const GROUPS = {
  keep: '② 기업인증 기업·구독 신청자 (무조건 유지)',
  core: '③ 관련 업종 · 종업원 5명 이상',
  fill: '④ 관련 업종 · 1~4명 · 회사 도메인 메일',
  duplicate: '① 같은 회사 중복 주소',
  lowIndustry: '① 특허 수요가 낮은 업종',
  rest: '⑤ 그 외 (업종 정보 없음, 1~4명 개인 메일 등)'
};

const isCompanyMail = s => !FREE_MAIL.has(String(s.email || '').split('@')[1]?.toLowerCase() || '');
const isPriority = s => !!s.certification || s.source === SIGNUP_SOURCE;

async function fetchActive(supabase) {
  const PAGE = 1000;
  const all = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from('newsletter_subscribers')
      .select('id, email, company_name, biz_no, industry, employees, certification, source')
      .eq('status', 'active')
      .order('id')
      .range(from, from + PAGE - 1);
    if (error) throw error;
    all.push(...data);
    if (data.length < PAGE) break;
  }
  return all;
}

// 같은 사업자번호 중 남길 주소: 기업인증·구독 신청 → 회사 메일 → 먼저 등록된 주소
function pickDuplicates(subs) {
  const groups = new Map();
  for (const s of subs) {
    const key = String(s.biz_no || '').replace(/\D/g, '');
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }
  const extra = new Set();
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    list.sort((a, b) => (isPriority(b) - isPriority(a)) || (isCompanyMail(b) - isCompanyMail(a)) || a.id - b.id);
    list.slice(1).forEach(s => extra.add(s.id));
  }
  return extra;
}

function classify(s, duplicates) {
  if (duplicates.has(s.id)) return 'duplicate';
  if (isPriority(s)) return 'keep';
  if (LOW_INDUSTRIES.has(s.industry)) return 'lowIndustry';
  if (!RELEVANT_INDUSTRIES.has(s.industry)) return 'rest';
  const n = Number(s.employees);
  if (s.employees != null && s.employees !== '' && n >= 5) return 'core';
  return isCompanyMail(s) ? 'fill' : 'rest';
}

// 목표 인원에 맞춰 남길 구독자를 고름 (keep → core → fill 순, 그룹 안에서는 종업원 많은 순)
async function planTrim(supabase, target = 1500) {
  const subs = await fetchActive(supabase);
  const duplicates = pickDuplicates(subs);
  const byGroup = Object.fromEntries(Object.keys(GROUPS).map(k => [k, []]));
  for (const s of subs) byGroup[classify(s, duplicates)].push(s);

  const byEmployees = (a, b) => (Number(b.employees) || 0) - (Number(a.employees) || 0) || a.id - b.id;
  const kept = new Set();
  const keptCount = {};
  for (const g of ['keep', 'core', 'fill']) {
    const list = g === 'keep' ? byGroup[g] : [...byGroup[g]].sort(byEmployees);
    let n = 0;
    for (const s of list) {
      // 기업인증·구독 신청자는 목표 인원을 넘어도 모두 유지
      if (g !== 'keep' && kept.size >= target) break;
      kept.add(s.id);
      n += 1;
    }
    keptCount[g] = n;
  }

  return {
    target,
    activeCount: subs.length,
    keepCount: kept.size,
    pauseIds: subs.filter(s => !kept.has(s.id)).map(s => s.id),
    groups: Object.entries(GROUPS).map(([key, label]) => ({
      key, label, count: byGroup[key].length, kept: keptCount[key] || 0
    }))
  };
}

async function applyTrim(supabase, target) {
  const plan = await planTrim(supabase, target);
  const now = new Date().toISOString();
  for (let i = 0; i < plan.pauseIds.length; i += 200) {
    const { error } = await supabase.from('newsletter_subscribers')
      .update({ status: 'paused', paused_at: now })
      .in('id', plan.pauseIds.slice(i, i + 200))
      .eq('status', 'active');
    if (error) throw error;
  }
  return plan;
}

// 보류한 구독자를 모두 '수신 가능'으로 되돌림
async function restorePaused(supabase) {
  const { data, error } = await supabase.from('newsletter_subscribers')
    .update({ status: 'active', paused_at: null })
    .eq('status', 'paused')
    .select('id');
  if (error) throw error;
  return data.length;
}

module.exports = { planTrim, applyTrim, restorePaused };
