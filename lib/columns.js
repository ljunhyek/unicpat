// 네이버 블로그 글 주소의 글번호 (https://blog.naver.com/unicpat/224442344574 → '224442344574')
function blogPostNo(url) {
    const m = String(url || '').match(/blog\.naver\.com\/unicpat\/(\d+)/);
    return m ? m[1] : null;
}

// 요약을 공개한 칼럼은 홈페이지 글 페이지(/column/글번호)로, 나머지는 블로그로 연결
function withColumnLinks(posts) {
    return posts.map(p => {
        const no = blogPostNo(p.url);
        const internal = !!(p.summary_ready && no);
        return { ...p, href: internal ? `/column/${no}` : p.url, internal };
    });
}

const CATEGORY_NAMES = { strategy: '특허 전략', patent: '특허', trademark: '상표·디자인' };

module.exports = { blogPostNo, withColumnLinks, CATEGORY_NAMES };
