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

    res.render('index', { 
        title: '유니크 특허법률사무소',
        description: '특허, 그 이상의 가치를 만드는 곳. 20년 경력의 전문 변리사가 아이디어의 사업화까지, 스타트업 창업 경험을 바탕으로 실질적인 컨설팅을 제공합니다.',
        posts,
        newsletters,
        govProjects: govSupport
    });
});

// 유니크 소개
router.get('/about', (req, res) => {
    res.render('about', { 
        title: '유니크 소개',
        description: '20년 경력의 전문성과 실전 창업 경험이 만든 차별화된 서비스. 유니크 특허사무소만의 강점과 구성원들을 소개합니다.'
    });
});

// 유니크 칼럼 페이지
router.get('/column', (req, res) => {
    const posts = readData(dataPath.posts);
    res.render('column', { 
        title: '유니크 칼럼',
        description: '지식재산권에 관한 전문적이고 실용적인 정보를 제공합니다. 특허, 상표, 디자인부터 AI 특허, 해외 출원까지 다양한 주제를 다룹니다.',
        posts: posts 
    });
});

// 뉴스레터 페이지
router.get('/newsletter', (req, res) => {
    const newsletters = readData(dataPath.newsletters);
    res.render('newsletter', {
        title: '유니크 뉴스레터',
        description: '사업에 도움이 되는 특허, 상표, 정부지원사업 등 최신 IP 트렌드와 실무 팁을 담은 유니크 특허사무소의 뉴스레터를 만나보세요.',
        newsletters
    });
});

// 정부지원사업 페이지
router.get('/gov-support', (req, res) => {
    const supportData = readData(dataPath.govSupport);
    res.render('gov-support', {
        title: '정부지원사업 안내',
        description: '국가 R&D 지원사업 신청에 필요한 특허 컨설팅. 과제 준비부터 제안서 작성, 선정까지 유니크 특허사무소가 함께합니다.',
        programTypes: supportData.types || [],
        govProjects: supportData.projects || []
    });
});

// Contact Us 페이지
router.get('/contact', (req, res) => {
    res.render('contact', { 
        title: 'Contact Us',
        description: '유니크 특허사무소에 궁금한 점이 있으신가요? 전화, 이메일, 상담 신청 폼을 통해 언제든지 문의해주세요.'
    });
});

// 서비스 안내 페이지들
router.get('/patent', (req, res) => {
    res.render('patent', { 
        title: '특허/실용신안 출원',
        description: '아이디어를 지키고 사업에 성공하는 첫걸음. 스타트업 투자 유치, 정부지원 우대를 위한 특허권을 확실하게 확보해 드립니다.'
    });
});

router.get('/trademark', (req, res) => {
    res.render('trademark', {
        title: '상표 출원',
        description: '당신의 브랜드를 지키는 가장 확실한 방법. 온라인 비즈니스 보호와 브랜드 신뢰도 상승을 위한 상표 등록 서비스를 제공합니다.'
    });
});

router.get('/design', (req, res) => {
    res.render('design', { 
        title: '디자인 출원', 
        description: '제품의 독창적인 디자인을 보호하고 모방 제품을 방지하는 디자인권 출원 등록 서비스.' 
    });
});

router.get('/startup', (req, res) => {
    res.render('startup', { 
        title: '창업 및 스타트업 특화 서비스', 
        description: '스타트업 창업 경험 변리사가 사업 성공을 위한 IP 포트폴리오 전략, 정부지원사업 연계 컨설팅을 제공합니다.' 
    });
});

router.get('/dispute-transfer', (req, res) => {
    res.render('dispute-transfer', { 
        title: 'IP 분쟁 대응', 
        description: '경고장 대응부터 특허 침해 소송까지, 복잡한 IP 분쟁에 대한 명쾌한 전략을 제시합니다.' 
    });
});


// 나머지 기능 페이지들 (description이 크게 중요하지 않음)
router.get('/subscribe', (req, res) => {
    res.render('subscribe', { 
        title: '뉴스레터 구독 신청'
        // description은 header.ejs의 기본값으로 표시됨
    });
});

router.get('/thanks', (req, res) => {
    res.render('thanks', { 
        title: '감사합니다' 
    });
});

router.get('/thanks-subscribe', (req, res) => {
    res.render('thanks-subscribe', { 
        title: '구독 완료' 
    });
});


module.exports = router;