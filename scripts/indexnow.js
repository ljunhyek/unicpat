// 네이버·Bing에 페이지 주소를 한 번에 알리는 스크립트 (IndexNow)
//   npm run indexnow                       → 주요 메뉴 페이지 전체
//   npm run indexnow -- /price /location   → 적은 주소만
// 배포가 끝나 실제 사이트에 키 파일이 올라간 뒤에 실행하세요.
const { submitUrls } = require('../lib/indexnow');

const DEFAULT_PAGES = [
    '/', '/incheon', '/location', '/price', '/patent', '/trademark', '/design', '/contact',
    '/about', '/startup', '/dispute-transfer', '/gov-support', '/column', '/newsletter'
];

(async () => {
    const paths = process.argv.slice(2);
    const list = paths.length ? paths : DEFAULT_PAGES;
    console.log(`${list.length}개 주소를 보냅니다:\n  ${list.join('\n  ')}`);
    const results = await submitUrls(list);
    let ok = true;
    for (const r of results) {
        const good = r.status === 200 || r.status === 202;
        ok = ok && good;
        console.log(`${good ? '접수됨' : '실패'}  ${r.endpoint}  (HTTP ${r.status}${r.error ? `, ${r.error}` : ''})`);
    }
    process.exitCode = ok ? 0 : 1;
})();
