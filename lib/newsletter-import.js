// 다른 곳에서 만든 뉴스레터 HTML에서 제목과 발행일을 읽어 옴

const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&');
}

function textOf(fragment) {
  return decodeEntities(String(fragment || '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ''))
    .replace(/\s+/g, ' ').trim();
}

function firstTag(html, tag) {
  const m = html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? textOf(m[1]) : '';
}

function metaContent(html, names) {
  for (const name of names) {
    const re = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*>`, 'i');
    const tag = html.match(re);
    const content = tag && tag[0].match(/content=["']([^"']*)["']/i);
    if (content && content[1].trim()) return decodeEntities(content[1].trim());
  }
  return '';
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function todayKst() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10).replace(/-/g, '.');
}

// 'YYYY.MM.DD' 형식의 발행일
// 1) 메타 태그의 날짜 2) 'NOVEMBER 2026', '2026.11 / MONTHLY', '2026년 11월호' 같은 발행 월 표기 3) 오늘
// 본문의 YYYY.MM.DD는 소개한 글의 작성일인 경우가 많아 쓰지 않음
function parseIssueDate(html, text) {
  const meta = metaContent(html, ['date', 'article:published_time', 'pubdate', 'publish_date']);
  const full = meta.match(/(\d{4})[.\-/]\s*(\d{1,2})[.\-/]\s*(\d{1,2})/);
  if (full) return `${full[1]}.${pad(full[2])}.${pad(full[3])}`;

  let year, month;
  const en = text.match(new RegExp(`\\b(${MONTHS.join('|')})\\s+(\\d{4})\\b`, 'i'));
  const num = text.match(/\b(\d{4})\.(\d{1,2})\s*\/\s*MONTHLY/i);
  const ko = text.match(/(\d{4})년\s*(\d{1,2})월호?/);
  if (en) { year = Number(en[2]); month = MONTHS.indexOf(en[1].toUpperCase()) + 1; }
  else if (num) { year = Number(num[1]); month = Number(num[2]); }
  else if (ko) { year = Number(ko[1]); month = Number(ko[2]); }

  const today = todayKst();
  if (!year || month < 1 || month > 12) return today;
  const ym = `${year}.${pad(month)}`;
  // 발행 월에 올리는 경우가 대부분이므로 같은 달이면 오늘 날짜를 사용
  return today.startsWith(ym) ? today : `${ym}.01`;
}

// h1 바로 다음 문단 (예: '부품, 권리, 형태. 사업이 마주한 세 가지 질문.')
function taglineAfterH1(html) {
  const m = html.match(/<\/h1>\s*<p\b[^>]*>([\s\S]*?)<\/p>/i);
  return m ? textOf(m[1]) : '';
}

// 제목: <title> → og:title → '[h1 · N월] h1 다음 소개 문장(없으면 첫 기사 제목)' 형식 → h1
function parseTitle(html, date) {
  const title = firstTag(html, 'title') || metaContent(html, ['og:title']);
  if (title) return title;
  const h1 = firstTag(html, 'h1');
  const lead = taglineAfterH1(html) || firstTag(html, 'h2');
  if (h1 && lead) return `[${h1} · ${Number(date.slice(5, 7))}월] ${lead}`;
  return h1 || lead || '';
}

function parseNewsletterHtml(html) {
  const source = String(html || '');
  // 숨김 미리보기 문구, 스크립트·스타일은 날짜 판단에서 제외
  const visible = source
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<div[^>]*display:\s*none[^>]*>[\s\S]*?<\/div>/gi, '');
  const date = parseIssueDate(source, textOf(visible));
  return { title: parseTitle(source, date), date };
}

module.exports = { parseNewsletterHtml };
