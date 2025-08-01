const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// 데이터 경로 설정
const dataPath = {
    posts: path.join(__dirname, '..', 'data', 'blog-posts.json'),
    newsletters: path.join(__dirname, '..', 'data', 'newsletters.json'),
    govSupport: path.join(__dirname, '..', 'data', 'gov-support.json')
};

// 데이터 읽기 헬퍼 함수
const readData = (filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            return content ? JSON.parse(content) : [];
        }
        return [];
    } catch (error) {
        console.error(`Error reading data from ${filePath}:`, error);
        return [];
    }
};

// 홈페이지
router.get('/', (req, res) => {
    const posts = readData(dataPath.posts).slice(0, 3);
    const newsletters = readData(dataPath.newsletters).slice(0, 4);
    const supportData = readData(dataPath.govSupport);
    const govSupport = supportData.projects ? supportData.projects.slice(0, 4) : [];

    // ▼▼▼ [핵심 수정] 렌더링 객체에 BASE_URL을 명시적으로 추가합니다. ▼▼▼
    res.render('index', { 
        title: '유니크 특허법률사무소',
        posts,
        newsletters,
        govProjects: govSupport,
        BASE_URL: res.locals.BASE_URL // 이 줄을 추가합니다.
    });
    // ▲▲▲ 여기까지 ▲▲▲
});

// 모든 다른 페이지 라우트에도 동일하게 적용해야 하지만,
// contact.ejs와 gov-support.ejs에만 폼이 있으므로 해당 라우트만 수정합니다.

router.get('/contact', (req, res) => {
    res.render('contact', { 
        title: 'Contact Us',
        BASE_URL: res.locals.BASE_URL // 이 줄을 추가합니다.
    });
});

router.get('/gov-support', (req, res) => {
    const supportData = readData(dataPath.govSupport);
    res.render('gov-support', {
        title: '정부지원사업 안내',
        programTypes: supportData.types || [],
        govProjects: supportData.projects || [],
        BASE_URL: res.locals.BASE_URL // 이 줄을 추가합니다.
    });
});

router.get('/subscribe', (req, res) => {
    res.render('subscribe', { 
        title: '뉴스레터 구독 신청',
        BASE_URL: res.locals.BASE_URL // 이 줄을 추가합니다.
    });
});


// 나머지 페이지들 (BASE_URL 변수가 필요 없는 페이지는 수정하지 않아도 됩니다.)
router.get('/column', (req, res) => {
    const posts = readData(dataPath.posts);
    res.render('column', { 
        title: '유니크 칼럼',
        posts: posts 
    });
});

router.get('/newsletter', (req, res) => {
    const newsletters = readData(dataPath.newsletters);
    res.render('newsletter', {
        title: '유니크 뉴스레터',
        newsletters
    });
});

router.get('/about', (req, res) => res.render('about', { title: '유니크 소개' }));
router.get('/design', (req, res) => res.render('design', { title: '디자인 출원' }));
router.get('/dispute-transfer', (req, res) => res.render('dispute-transfer', { title: 'IP 분쟁 대응' }));
router.get('/patent', (req, res) => res.render('patent', { title: '특허/실용신안 출원' }));
router.get('/startup', (req, res) => res.render('startup', { title: '창업 및 스타트업 특화 서비스' }));
router.get('/trademark', (req, res) => res.render('trademark', { title: '상표 출원' }));
router.get('/thanks', (req, res) => res.render('thanks', { title: '감사합니다' }));
router.get('/thanks-subscribe', (req, res) => res.render('thanks-subscribe', { title: '구독 완료' }));


module.exports = router;