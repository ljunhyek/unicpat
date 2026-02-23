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

const app = express();
const PORT = process.env.PORT || 3000;

// EJS를 뷰 엔진으로 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 정적 파일 (CSS, JS, 이미지)을 제공하기 위한 미들웨어
app.use(express.static(path.join(__dirname, 'public')));

// URL-encoded 본문을 파싱하기 위한 미들웨어
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Signed cookie 미들웨어
app.use(cookieParser(process.env.COOKIE_SECRET || 'default-cookie-secret'));

// 언어 미들웨어 - 모든 EJS 템플릿에 lang 변수 전달
app.use((req, res, next) => {
    res.locals.lang = req.cookies['lang'] || 'ko';
    next();
});

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