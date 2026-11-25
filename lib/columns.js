// 네이버 블로그 글 주소의 글번호 (https://blog.naver.com/unicpat/224442344574 → '224442344574')
function blogPostNo(url) {
    const m = String(url || '').match(/blog\.naver\.com\/unicpat\/(\d+)/);
    return m ? m[1] : null;
}

// 목록·추천 글 카드에 필요한 칸만 (본문·요약 같은 긴 글은 글 페이지에서 그 글 하나만 불러옴)
// select('*')로 전체를 불러오면 칼럼 원문이 늘어날수록 Supabase 전송량이 급격히 커짐
// 영어 글 페이지 연결 여부(enInternal)는 title_en으로 판단 (영어 글을 쓸 때 영어 제목을 항상 함께 씀)
const COLUMN_LIST_FIELDS = 'id, title, title_en, url, category, sort_order, published_on, summary_ready';

// 글 페이지에 필요한 칸 (썸네일 이미지 데이터는 /column/글번호/thumbnail.jpg 에서 따로 불러옴)
const COLUMN_POST_FIELDS = 'id, title, url, category, sort_order, published_on, summary_ready, summary, key_points, checkpoint, faq, '
    + 'title_en, summary_en, key_points_en, checkpoint_en, body_html, body_html_en';

// 글 본문 HTML의 {{thumbnail}} 자리를 실제 썸네일 주소로 바꿈
function renderBodyHtml(html, thumbUrl) {
    return String(html || '').replace(/\{\{\s*thumbnail\s*\}\}/g, thumbUrl);
}

// 본문 HTML의 첫 문단 글자 (검색 설명용)
// 첫 문단이 짧으면(검색엔진이 '설명이 짧다'고 표시) 다음 문단을 이어 붙여 minLength 이상으로 만듦
function bodyLeadText(html, minLength = 80) {
    let text = '';
    for (const m of String(html || '').matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)) {
        const t = m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
        if (!t) continue;
        text = text ? `${text} ${t}` : t;
        if (text.length >= minLength) break;
    }
    return text;
}

// 글(긴 글 본문 또는 예전 요약)이 들어 있는 칼럼 id 모음 — 긴 칸을 내려받지 않고 판단
async function filledColumnIds(supabase) {
    let res = await supabase.from('columns').select('id').or('summary.not.is.null,body_html.not.is.null');
    // body_html 칸이 아직 없으면(column_article.sql 실행 전) 요약만으로 판단
    if (res.error) res = await supabase.from('columns').select('id').not('summary', 'is', null);
    if (res.error) throw res.error;
    return new Set(res.data.map(r => r.id));
}

// 'data:image/jpeg;base64,...' → { mime, buffer }
function decodeDataUri(uri) {
    const m = String(uri || '').match(/^data:(image\/[a-z+.-]+);base64,([\s\S]+)$/i);
    return m ? { mime: m[1], buffer: Buffer.from(m[2], 'base64') } : null;
}

// 요약을 공개한 칼럼은 홈페이지 글 페이지(/column/글번호)로, 나머지는 블로그로 연결
function withColumnLinks(posts) {
    return posts.map(p => {
        const no = blogPostNo(p.url);
        const internal = !!(p.summary_ready && no);
        // 영어 화면은 영어 글이 있는 글만 글 페이지로 연결
        return { ...p, href: internal ? `/column/${no}` : p.url, internal, enInternal: internal && !!p.title_en };
    });
}

// '자주 묻는 질문' 칸 (Q. 질문 / A. 답변, 질문끼리는 빈 줄로 구분) → [{ q, a }]
function parseFaq(text) {
    return String(text || '').split(/\n\s*\n/).map(block => {
        const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
        const qAt = lines.findIndex(l => /^Q[.:)]\s*/i.test(l));
        const aAt = lines.findIndex(l => /^A[.:)]\s*/i.test(l));
        if (qAt === -1 || aAt <= qAt) return null;
        const q = lines.slice(qAt, aAt).join(' ').replace(/^Q[.:)]\s*/i, '');
        const a = lines.slice(aAt).join(' ').replace(/^A[.:)]\s*/i, '');
        return q && a ? { q, a } : null;
    }).filter(Boolean);
}

const CATEGORY_NAMES ={ strategy: '특허 전략', patent: '특허', trademark: '상표·디자인' };
const CATEGORY_NAMES_EN = { strategy: 'IP Strategy', patent: 'Patents', trademark: 'Trademarks & Designs' };

module.exports = { COLUMN_LIST_FIELDS, COLUMN_POST_FIELDS, filledColumnIds, renderBodyHtml, bodyLeadText, decodeDataUri, blogPostNo, withColumnLinks, parseFaq, CATEGORY_NAMES, CATEGORY_NAMES_EN };
