// 정부지원사업 후보 자동 수집
// - K-Startup 모집중 공고 RSS (인증키 필요 없음): 제목·링크·등록일
// - 기업마당 지원사업 API (BIZINFO_API_KEY 환경변수가 있을 때만): 기관·신청기간까지
// 특허사무소 고객에게 소개할 만한 공고를 키워드 점수로 골라 gov_candidates에 쌓습니다.

const KSTARTUP_RSS = 'https://www.k-startup.go.kr/web/contents/rss/bizpbanc-ongoing.do';
const BIZINFO_API = 'https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do';
const RECENT_DAYS = 45;     // 최근 등록된 공고만
const MIN_SCORE = 3;        // 이 점수 이상만 후보로

// [키워드, 점수] — 점수가 높을수록 유니크 고객(특허·상표·창업·인천 기업)과 관련이 큼
const KEYWORDS = [
  [/특허|지식재산|\bIP\b|IP나래|IP디딤돌|지재권/i, 6],
  [/상표|브랜드|디자인권|디자인 ?출원/, 5],
  [/기술사업화|사업화 ?지원|기술이전|기술창업/, 4],
  [/인천/, 4],
  [/예비창업|초기창업|창업도약|창업패키지|재도전/, 3],
  [/R&D|R＆D|연구개발|기술개발/i, 3],
  [/바우처|해외 ?진출|수출/, 2],
  [/스타트업|창업기업|중소기업|소상공인/, 1]
];
// 고객에게 소개하기 어려운 행사성 공고는 점수를 깎음
const PENALTIES = [/특강|설명회|세미나|교육생|교육 ?과정|채용|박람회|경진대회|포럼|네트워킹|멘토 ?모집|심사위원|평가위원|결과 ?발표|합격자|성과공유회|행사|밋업|주관기관 ?모집|운영기관 ?모집|수요조사|아카데미/];

function decode(s) {
  return String(s || '')
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#40;/g, '(').replace(/&#41;/g, ')')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#40;/g, '(').replace(/&#41;/g, ')')
    .replace(/\s+/g, ' ').trim();
}

function tag(item, name) {
  const m = item.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1]) : '';
}

function scoreTitle(text) {
  let score = 0;
  const matched = [];
  for (const [re, pts] of KEYWORDS) {
    const m = text.match(re);
    if (m) { score += pts; matched.push(m[0]); }
  }
  if (PENALTIES.some(re => re.test(text))) score -= 4;
  return { score, matched: matched.join(', ') };
}

const kstDay = d => new Date(new Date(d).getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);

async function fetchKStartup() {
  const res = await fetch(KSTARTUP_RSS, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`K-Startup RSS HTTP ${res.status}`);
  const xml = await res.text();
  return xml.split('<item>').slice(1).map(item => {
    const link = tag(item, 'link').replace(/^http:/, 'https:');
    const id = (link.match(/[?&]id=(\d+)/) || [])[1];
    const pub = new Date(tag(item, 'pubDate'));
    return {
      source: 'kstartup',
      source_id: id,
      title: tag(item, 'title'),
      url: id ? `https://www.k-startup.go.kr/web/contents/bizpbanc-ongoing.do?schM=view&pbancSn=${id}` : link,
      agency: null,
      period: null,
      posted_on: isNaN(pub) ? null : kstDay(pub)
    };
  }).filter(p => p.source_id && p.title);
}

// K-Startup 공고 상세에서 접수기간·주관기관 읽기 → { period: '2026.11.16 ~ 2026.11.23', agency }
async function fetchKStartupDetail(id) {
  const url = `https://www.k-startup.go.kr/web/contents/bizpbanc-ongoing.do?schM=view&pbancSn=${id}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const field = re => { const m = html.match(re); return m ? decode(m[1].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')) : ''; };
  const raw = field(/id="rcptPeriod"[^>]*>([\s\S]*?)<\/p>/);
  const dates = raw.match(/\d{4}[-.]\d{1,2}[-.]\d{1,2}/g) || [];
  const dot = d => d.split(/[-.]/).map((n, i) => (i ? String(Number(n)) : n)).join('.');
  return {
    period: dates.length ? dates.map(dot).join(' ~ ') : null,
    agency: field(/<p class="tit">주관기관명<\/p>\s*<p class="txt">([\s\S]*?)<\/p>/) || null
  };
}

// 마감일(YYYYMMDD) — 기간 문자열의 마지막 날짜
function deadline(period) {
  const d = String(period || '').match(/\d{4}[.\-]\s*\d{1,2}[.\-]\s*\d{1,2}/g);
  if (!d) return '';
  const [y, m, day] = d[d.length - 1].match(/\d+/g);
  return y + m.padStart(2, '0') + day.padStart(2, '0');
}

// 접수기간이 비어 있는 승인 대기 K-Startup 후보를 상세 페이지에서 채우고, 이미 마감된 후보는 제외 처리
async function fillDetails(supabase) {
  const { data, error } = await supabase.from('gov_candidates').select('id, source, source_id, period')
    .eq('status', 'new');
  if (error) throw error;
  const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10).replace(/-/g, '');
  let filled = 0, expired = 0;
  for (const c of data || []) {
    let period = c.period;
    if (!period && c.source === 'kstartup') {
      try {
        const d = await fetchKStartupDetail(c.source_id);
        if (d.period) {
          period = d.period;
          await supabase.from('gov_candidates').update({ period: d.period, ...(d.agency ? { agency: d.agency } : {}) }).eq('id', c.id);
          filled++;
        }
      } catch (e) { /* 상세를 못 읽으면 관리자가 직접 입력 */ }
    }
    const end = deadline(period);
    if (end && end < today) {
      await supabase.from('gov_candidates').update({ status: 'dismissed' }).eq('id', c.id);
      expired++;
    }
  }
  return { filled, expired };
}

// 기업마당 API (https://www.bizinfo.go.kr → 활용정보 → 정책정보 개방 API에서 무료 인증키 발급)
async function fetchBizinfo(key) {
  const url = `${BIZINFO_API}?crtfcKey=${encodeURIComponent(key)}&dataType=json&searchCnt=200`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`기업마당 API HTTP ${res.status}`);
  const json = await res.json();
  const items = (json && (json.jsonArray || (json.items) || [])) || [];
  return items.map(it => {
    const link = it.pblancUrl ? (/^https?:/.test(it.pblancUrl) ? it.pblancUrl : `https://www.bizinfo.go.kr${it.pblancUrl}`) : '';
    const created = it.creatPnttm ? String(it.creatPnttm).slice(0, 10) : null;
    return {
      source: 'bizinfo',
      source_id: String(it.pblancId || link),
      title: decode(it.pblancNm),
      url: link,
      agency: decode(it.jrsdInsttNm || it.excInsttNm || '') || null,
      period: decode(it.reqstBeginEndDe || '').replace(/\s*~\s*/, ' ~ ') || null,
      posted_on: created && /^\d{4}-\d{2}-\d{2}$/.test(created) ? created : null,
      extra: decode(`${it.bsnsSumryCn || ''} ${it.hashtags || ''}`).slice(0, 500)
    };
  }).filter(p => p.title && p.url);
}

// 수집 → 점수 매기기 → 새 후보만 저장. 저장한 개수와 출처별 결과를 돌려줌
async function collect(supabase) {
  const sources = [['kstartup', fetchKStartup()]];
  if (process.env.BIZINFO_API_KEY) sources.push(['bizinfo', fetchBizinfo(process.env.BIZINFO_API_KEY)]);
  const results = await Promise.allSettled(sources.map(s => s[1]));

  const since = kstDay(Date.now() - RECENT_DAYS * 86400000);
  const notes = [];
  let all = [];
  results.forEach((r, i) => {
    const name = sources[i][0];
    if (r.status === 'fulfilled') { notes.push(`${name} ${r.value.length}건`); all = all.concat(r.value); }
    else notes.push(`${name} 실패: ${r.reason && r.reason.message}`);
  });

  const picked = all
    .filter(p => !p.posted_on || p.posted_on >= since)
    .map(p => ({ ...p, ...scoreTitle(`${p.title} ${p.agency || ''} ${p.extra || ''}`) }))
    .filter(p => p.score >= MIN_SCORE);

  let added = 0;
  if (picked.length) {
    const rows = picked.map(({ extra, ...p }) => p);
    // 이미 있는 후보(같은 출처·번호)는 건드리지 않음
    const { data, error } = await supabase.from('gov_candidates')
      .upsert(rows, { onConflict: 'source,source_id', ignoreDuplicates: true })
      .select('id');
    if (error) throw error;
    added = (data || []).length;
  }
  const { filled, expired } = await fillDetails(supabase);
  if (filled) notes.push(`접수기간 ${filled}건 자동 입력`);
  if (expired) notes.push(`마감 ${expired}건 제외`);
  const { count } = await supabase.from('gov_candidates').select('id', { count: 'exact', head: true }).eq('status', 'new');
  return { added, pending: count || 0, scanned: all.length, picked: picked.length, notes };
}

module.exports = { collect, scoreTitle, fetchKStartupDetail };
