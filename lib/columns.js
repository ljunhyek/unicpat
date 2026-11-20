// 네이버 블로그 글 주소의 글번호 (https://blog.naver.com/unicpat/224442344574 → '224442344574')
function blogPostNo(url) {
    const m = String(url || '').match(/blog\.naver\.com\/unicpat\/(\d+)/);
    return m ? m[1] : null;
}

// 목록·추천 글 카드에 필요한 칸만 (본문·요약 같은 긴 글은 글 페이지에서 그 글 하나만 불러옴)
// select('*')로 전체를 불러오면 칼럼 원문이 늘어날수록 Supabase 전송량이 급격히 커짐
// summary_en은 영어 글 페이지 연결 여부(enInternal) 판단용
const COLUMN_LIST_FIELDS = 'id, title, title_en, url, category, sort_order, published_on, summary_ready, summary_en';

// 요약을 공개한 칼럼은 홈페이지 글 페이지(/column/글번호)로, 나머지는 블로그로 연결
function withColumnLinks(posts) {
    return posts.map(p => {
        const no = blogPostNo(p.url);
        const internal = !!(p.summary_ready && no);
        // 영어 화면은 영어 요약이 있는 글만 글 페이지로 연결
        return { ...p, href: internal ? `/column/${no}` : p.url, internal, enInternal: internal && !!p.summary_en };
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

module.exports = { COLUMN_LIST_FIELDS, blogPostNo, withColumnLinks, parseFaq, CATEGORY_NAMES, CATEGORY_NAMES_EN };
