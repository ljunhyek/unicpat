// routes/pages.js
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
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (error) {
        console.error(`Error reading data from ${filePath}:`, error);
        return [];
    }
};

// 홈페이지
router.get('/', (req, res) => {
    const posts = readData(dataPath.posts).slice(0, 3);
    const newsletters = readData(dataPath.newsletters).slice(0, 4);
    const govSupport = readData(dataPath.govSupport).projects.slice(0, 4);

    res.render('index', { 
        title: '유니크 특허법률사무소',
        posts,
        newsletters,
        govProjects: govSupport
    });
});

// 유니크 칼럼 페이지
router.get('/column', (req, res) => {
    const posts = readData(dataPath.posts);
    res.render('column', { 
        title: '유니크 칼럼',
        posts: posts 
    });
});

// 뉴스레터 페이지
router.get('/newsletter', (req, res) => {
    const newsletters = readData(dataPath.newsletters);
    res.render('newsletter', {
        title: '유니크 뉴스레터',
        newsletters
    });
});

// 정부지원사업 페이지
router.get('/gov-support', (req, res) => {
    const supportData = readData(dataPath.govSupport);
    res.render('gov-support', {
        title: '정부지원사업 안내',
        programTypes: supportData.types || [],
        govProjects: supportData.projects || []
    });
});

// 나머지 정적 페이지들
router.get('/about', (req, res) => res.render('about', { title: '유니크 소개' }));
router.get('/contact', (req, res) => res.render('contact', { title: 'Contact Us' }));
router.get('/design', (req, res) => res.render('design', { title: '디자인 출원' }));
router.get('/dispute-transfer', (req, res) => res.render('dispute-transfer', { title: 'IP 분쟁 대응' }));
router.get('/patent', (req, res) => res.render('patent', { title: '특허/실용신안 출원' }));
router.get('/startup', (req, res) => res.render('startup', { title: '창업 및 스타트업 특화 서비스' }));
router.get('/trademark', (req, res) => res.render('trademark', { title: '상표 출원' }));
router.get('/thanks', (req, res) => res.render('thanks', { title: '감사합니다' }));
router.get('/thanks-subscribe', (req, res) => res.render('thanks-subscribe', { title: '구독 완료' }));
router.get('/subscribe', (req, res) => res.render('subscribe', { title: '뉴스레터 구독 신청' }));


module.exports = router;