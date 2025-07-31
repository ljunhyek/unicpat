// routes/admin.js
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const session = require('express-session');

// --- Session 설정 ---
router.use(session({
    secret: process.env.SESSION_SECRET || 'a-very-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // 로컬 개발 시 false, HTTPS 배포 시 true
}));

// --- 데이터 경로 ---
const dataPath = {
    posts: path.join(__dirname, '..', 'data', 'blog-posts.json'),
    newsletters: path.join(__dirname, '..', 'data', 'newsletters.json'),
    govSupport: path.join(__dirname, '..', 'data', 'gov-support.json')
};

// --- 파일 업로드(multer) 설정 ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // 동적으로 저장 경로 결정
        let dest = 'public/images/';
        if (req.body.type === 'column') {
            dest = 'public/images/columns/';
        }
        // 디렉토리가 없으면 생성
        fs.mkdirSync(dest, { recursive: true });
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// --- 데이터 I/O 헬퍼 함수 ---
const readData = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf-8'));
const writeData = (filePath, data) => fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

// --- 인증 미들웨어 ---
const requireLogin = (req, res, next) => {
    if (req.session.loggedIn) {
        next();
    } else {
        res.redirect('/admin/login');
    }
};

// --- 라우트 ---

// GET: 로그인 페이지
router.get('/', (req, res) => res.redirect('/admin/dashboard'));
router.get('/login', (req, res) => {
    res.render('admin/login', { title: '관리자 로그인', error: null });
});

// POST: 로그인 처리
router.post('/login', (req, res) => {
    const { password } = req.body;
    if (password === process.env.ADMIN_PASSWORD) {
        req.session.loggedIn = true;
        res.redirect('/admin/dashboard');
    } else {
        res.render('admin/login', { title: '관리자 로그인', error: '비밀번호가 틀렸습니다.' });
    }
});

// GET: 로그아웃
router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/admin/login');
    });
});

// GET: 대시보드
router.get('/dashboard', requireLogin, (req, res) => {
    const posts = readData(dataPath.posts);
    const newsletters = readData(dataPath.newsletters);
    const supportData = readData(dataPath.govSupport);

    res.render('admin/dashboard', {
        title: '관리자 대시보드',
        posts,
        newsletters,
        programTypes: supportData.types,
        govProjects: supportData.projects
    });
});

// POST: 항목 추가 (공통 핸들러)
router.post('/add', requireLogin, upload.single('image'), (req, res) => {
    const { type, title, url, date, period, agency, programs, description } = req.body;
    let imagePath = req.file ? req.file.path.replace('public', '') : null;
    
    if (imagePath) {
      imagePath = imagePath.replace(/\\/g, '/'); // Windows 경로 수정
    }

    switch (type) {
        case 'column':
            const posts = readData(dataPath.posts);
            const newPost = { title, url, image: imagePath, category: req.body.category || 'strategy' };
            posts.unshift(newPost);
            writeData(dataPath.posts, posts);
            break;
        case 'newsletter':
            const newsletters = readData(dataPath.newsletters);
            const newNewsletter = { title, link: url, date };
            newsletters.unshift(newNewsletter);
            writeData(dataPath.newsletters, newsletters);
            break;
        case 'govProject':
            const supportDataProj = readData(dataPath.govSupport);
            const newProject = { title, period, url };
            supportDataProj.projects.unshift(newProject);
            writeData(dataPath.govSupport, supportDataProj);
            break;
        case 'programType':
            const supportDataType = readData(dataPath.govSupport);
            const newType = { agency, programs, description, url };
            supportDataType.types.unshift(newType);
            writeData(dataPath.govSupport, supportDataType);
            break;
    }
    res.redirect('/admin/dashboard');
});

// POST: 항목 삭제 (공통 핸들러)
router.post('/delete', requireLogin, (req, res) => {
    const { type, id } = req.body; // id는 삭제할 항목의 고유 식별자 (예: url, title)
    
    try {
        switch (type) {
            case 'column':
                let posts = readData(dataPath.posts);
                const postToDelete = posts.find(p => p.url === id);
                if (postToDelete && postToDelete.image) {
                    const imagePath = path.join(__dirname, '..', 'public', postToDelete.image);
                    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
                }
                posts = posts.filter(p => p.url !== id);
                writeData(dataPath.posts, posts);
                break;
            case 'newsletter':
                let newsletters = readData(dataPath.newsletters);
                newsletters = newsletters.filter(n => n.link !== id);
                writeData(dataPath.newsletters, newsletters);
                break;
            case 'govProject':
                let supportDataProj = readData(dataPath.govSupport);
                supportDataProj.projects = supportDataProj.projects.filter(p => p.url !== id);
                writeData(dataPath.govSupport, supportDataProj);
                break;
            case 'programType':
                let supportDataType = readData(dataPath.govSupport);
                supportDataType.types = supportDataType.types.filter(t => t.agency !== id);
                writeData(dataPath.govSupport, supportDataType);
                break;
        }
    } catch(err) {
        console.error("삭제 중 오류 발생:", err);
    }
    
    res.redirect('/admin/dashboard');
});

module.exports = router;