// IndexNow: 새 페이지나 바뀐 페이지 주소를 네이버·Bing 등에 바로 알림 (서치어드바이저 '웹 페이지 수집' 요청을 대신함)
// 키는 공개 값입니다. 검색엔진이 https://www.unicpat.com/<KEY>.txt 파일을 열어 사이트 주인인지 확인합니다.
// 구글은 IndexNow를 지원하지 않으므로 구글은 사이트맵과 서치 콘솔로 반영됩니다.
const { waitUntil } = require('@vercel/functions');

const KEY = '8bda69b965368c3ec3aecba5d55f53fc';
const SITE_URL = (process.env.SITE_URL || 'https://www.unicpat.com').replace(/\/$/, '');
const ENDPOINTS = [
    'https://searchadvisor.naver.com/indexnow',
    'https://api.indexnow.org/indexnow' // Bing, Yandex 등 참여 검색엔진에 함께 전달됨
];

// paths: '/column/123' 같은 경로 또는 전체 주소 목록. 엔드포인트별 결과 [{ endpoint, status }]를 돌려줌
async function submitUrls(paths) {
    const urlList = [...new Set(paths.filter(Boolean).map(p => (/^https?:\/\//.test(p) ? p : SITE_URL + p)))];
    if (!urlList.length) return [];
    const body = JSON.stringify({
        host: new URL(SITE_URL).host,
        key: KEY,
        keyLocation: `${SITE_URL}/${KEY}.txt`,
        urlList
    });
    return Promise.all(ENDPOINTS.map(async endpoint => {
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                body,
                signal: AbortSignal.timeout(8000)
            });
            return { endpoint, status: res.status };
        } catch (err) {
            return { endpoint, status: 0, error: err.message };
        }
    }));
}

// 관리자 화면에서 공개할 때 호출: 응답을 늦추지 않고 뒤에서 보냄. 실제 사이트(Vercel 운영 배포)에서만 동작
function notifyInBackground(paths) {
    if (process.env.VERCEL_ENV !== 'production') return;
    waitUntil(submitUrls(paths).then(results => {
        for (const r of results) {
            // 200, 202가 정상 접수
            if (r.status !== 200 && r.status !== 202) console.error('IndexNow error:', r.endpoint, r.status, r.error || '');
        }
    }));
}

module.exports = { KEY, submitUrls, notifyInBackground };
