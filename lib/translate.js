/**
 * 간단한 한국어 → 영어 번역 유틸리티
 * Google의 무료 번역 엔드포인트 사용 (API 키 불필요)
 * 동일한 텍스트는 메모리 캐시에서 바로 반환
 */
const https = require('https');

const cache = new Map();

function translateKoToEn(text) {
    if (!text) return Promise.resolve(text);
    if (cache.has(text)) return Promise.resolve(cache.get(text));

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl=en&dt=t&q=${encodeURIComponent(text)}`;

    return new Promise((resolve) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    const translated = parsed[0].map(item => item[0]).join('');
                    cache.set(text, translated);
                    resolve(translated);
                } catch (e) {
                    resolve(text); // 번역 실패 시 원문 반환
                }
            });
        }).on('error', () => resolve(text)); // 네트워크 오류 시 원문 반환
    });
}

/**
 * posts 배열의 title 필드를 영어로 번역해서 새 배열로 반환
 */
async function translatePostTitles(posts) {
    return Promise.all(
        posts.map(async post => ({
            ...post,
            title: await translateKoToEn(post.title)
        }))
    );
}

module.exports = { translateKoToEn, translatePostTitles };
