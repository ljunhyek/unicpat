// server.js
const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');

// .env 파일 로드
dotenv.config();

// 라우터 가져오기
const pageRoutes = require('./routes/pages');
const adminRoutes = require('./routes/admin');
const cronRoutes = require('./routes/cron');
const webhookRoutes = require('./routes/webhooks');
const { trackPageView } = require('./lib/analytics');
const { hasEnPage, enPath, localizeLinks } = require('./lib/i18n');

const app = express();
const PORT = process.env.PORT || 3000;

// EJS를 뷰 엔진으로 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 대표 주소: www.unicpat.com (unicpat.com으로 들어오면 같은 경로로 이동 — 검색엔진이 한 사이트로 인식하도록)
const SITE_URL = (process.env.SITE_URL || 'https://www.unicpat.com').replace(/\/$/, '');
app.use((req, res, next) => {
    if (req.hostname === 'unicpat.com') return res.redirect(301, `${SITE_URL}${req.originalUrl}`);

    // 언어: /en/... 주소는 영어, 그 밖은 한국어 (lib/i18n.js)
    // 영어 주소는 /en을 떼고 같은 라우트로 처리. 영어 번역이 없는 페이지는 한국어 주소로 보냄
    const qAt = req.url.indexOf('?');
    const query = qAt >= 0 ? req.url.slice(qAt) : '';
    const enMatch = req.path.match(/^\/en(\/.*)?$/);
    let lang = 'ko';
    if (enMatch) {
        const koPath = (enMatch[1] || '/').replace(/(.)\/$/, '$1');
        if (!hasEnPage(koPath)) return res.redirect(302, koPath + query);
        req.url = koPath + query;
        lang = 'en';
        // 영어 화면의 사이트 안 링크를 영어 주소로
        const render = res.render.bind(res);
        res.render = (view, opts, cb) => {
            if (typeof opts === 'function') { cb = opts; opts = {}; }
            render(view, opts, (err, html) => {
                if (err) return cb ? cb(err) : next(err);
                html = localizeLinks(html);
                cb ? cb(null, html) : res.send(html);
            });
        };
    }
    const pagePath = req.path.replace(/(.)\/$/, '$1');
    res.locals.lang = lang;
    res.locals.canonicalUrl = SITE_URL + (lang === 'en' ? enPath(pagePath) : pagePath);
    // 한국어·영어 주소 짝 (hreflang 표시와 언어 전환 버튼). 칼럼 글에 영어 글이 없으면 글 페이지에서 en을 지움
    res.locals.langUrls = { ko: pagePath, en: hasEnPage(pagePath) ? enPath(pagePath) : null };
    res.locals.siteUrl = SITE_URL;
    // 구글 서치콘솔 / 네이버 서치어드바이저 'HTML 태그' 소유 확인 값 (Vercel 환경 변수에 넣으면 모든 페이지에 표시)
    res.locals.googleVerification = process.env.GOOGLE_SITE_VERIFICATION || '';
    res.locals.naverVerification = process.env.NAVER_SITE_VERIFICATION || '';
    next();
});

// 정적 파일 (CSS, JS, 이미지)을 제공하기 위한 미들웨어
// redirect: false — public/newsletter 폴더가 있어도 /newsletter 주소가 /newsletter/ 로 돌지 않고 바로 페이지로 가도록
app.use(express.static(path.join(__dirname, 'public'), { redirect: false }));

// 외부 서비스 웹훅 — 서명 확인에 본문 원본이 필요하므로 본문 파싱 미들웨어보다 먼저 연결
app.use('/api/webhooks', webhookRoutes);

// URL-encoded 본문을 파싱하기 위한 미들웨어
app.use(express.urlencoded({ extended: true, limit: '4mb' })); // 뉴스레터 HTML 업로드
app.use(express.json({ limit: '4mb' }));

// Signed cookie 미들웨어
app.use(cookieParser(process.env.COOKIE_SECRET || 'default-cookie-secret'));


// 예약 작업 (Vercel Cron) — 방문 통계에 잡히지 않도록 먼저 연결
app.use('/api/cron', cronRoutes);

// 방문 통계 기록 (관리자 페이지 '방문 통계' 탭에서 확인)
app.use(trackPageView);

// 페이지 라우트 사용
app.use('/', pageRoutes);
// 관리자 라우트 사용
app.use('/admin', adminRoutes);

// 404 에러 처리
app.use((req, res) => {
    res.status(404).render('404', { title: '페이지를 찾을 수 없습니다' });
});


app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
    console.log(`관리자 페이지: http://localhost:${PORT}/admin`);
});