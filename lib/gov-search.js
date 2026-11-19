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
      url: link,
      agency: null,
      period: null,
      posted_on: isNaN(pub) ? null : kstDay(pub)
    };
  }).filter(p => p.source_id && p.title);
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
  return { added, scanned: all.length, picked: picked.length, notes };
}

module.exports = { collect, scoreTitle };
