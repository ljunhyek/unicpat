// 영어 페이지 주소 (/en/...) — 검색엔진이 영어 글을 따로 색인하도록 언어마다 주소를 나눔
//   한국어: /about          영어: /en/about
// 예전에는 쿠키(lang=en)로 같은 주소의 화면만 바꿨는데, 검색 로봇은 쿠키 없이 읽어 영어 화면을 볼 수 없었음.
// 영어 번역이 있는 페이지만 영어 주소를 둠. 나머지(/price, /incheon 등)는 /en 주소로 오면 한국어 주소로 보냄.
// 페이지를 새로 번역하면 아래 목록에 추가하세요.
const EN_PAGES = new Set([
    '/', '/about', '/contact', '/location', '/patent', '/trademark', '/design', '/startup', '/dispute-transfer',
    '/column', '/column/strategy', '/column/patent', '/column/trademark'
]);

// 칼럼 글(/column/글번호)은 영어 글이 있는지 글 페이지에서 확인 (없으면 한국어 주소로 보냄)
function hasEnPage(path) {
    return EN_PAGES.has(path) || /^\/column\/\d+$/.test(path);
}

function enPath(path) {
    return path === '/' ? '/en' : '/en' + path;
}

// 영어 화면의 사이트 안 링크(href, form action)를 영어 주소로 바꿈. 영어 페이지가 없는 주소는 그대로 둠
// hreflang="ko"가 붙은 링크(언어 전환 버튼의 '한국어')는 바꾸지 않음
function localizeLinks(html) {
    return html.replace(/<(a|form)\b[^>]*>/gi, tag => /hreflang="ko"/i.test(tag) ? tag
        : tag.replace(/\b(href|action)="(\/[^"#?]*)([?#][^"]*)?"/g, (whole, attr, path, rest = '') => {
            const clean = path.replace(/(.)\/$/, '$1');
            return hasEnPage(clean) ? `${attr}="${enPath(clean)}${rest}"` : whole;
        }));
}

module.exports = { EN_PAGES, hasEnPage, enPath, localizeLinks };
