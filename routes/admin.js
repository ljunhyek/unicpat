const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const session = require('express-session');

// --- Session 설정 ---
router.use(session({
    secret: process.env.SESSION_SECRET || 'a-very-secret-key-for-session',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' } // HTTPS 배포 시 true, 로컬 개발 시 false
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
        let dest = 'public/images/';
        if (req.body.type === 'column') {
            dest = 'public/images/columns/';
        }
        // 디렉토리가 없으면 생성
        fs.mkdirSync(dest, { recursive: true });
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        // 파일명 중복을 피하기 위해 현재 시간을 파일명 앞에 붙임
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// --- 데이터 I/O 헬퍼 함수 ---
const readData = (filePath) => {
    try {
        // Vercel의 서버리스 환경에서는 파일 시스템이 읽기 전용일 수 있으므로, 파일 존재 여부 먼저 확인
        if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            // 파일 내용이 비어있는 경우 빈 배열/객체 반환
            return fileContent ? JSON.parse(fileContent) : [];
        }
        return []; // 파일이 없으면 빈 배열/객체 반환
    } catch (error) {
        console.error(`Error reading or parsing ${filePath}:`, error);
        return []; // 에러 발생 시에도 빈 배열/객체 반환
    }
};
const writeData = (filePath, data) => {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.error(`Error writing to ${filePath}:`, error);
    }
};

// --- 인증 미들웨어 ---
const requireLogin = (req, res, next) => {
    if (req.session.loggedIn) {
        next();
    } else {
        res.redirect('/admin/login');
    }
};

// --- 라우트 ---

router.get('/', (req, res) => res.redirect('/admin/dashboard'));

router.get('/login', (req, res) => {
    res.render('admin/login', { title: '관리자 로그인', error: null });
});

router.post('/login', (req, res) => {
    const { password } = req.body;
    if (password === process.env.ADMIN_PASSWORD) {
        req.session.loggedIn = true;
        res.redirect('/admin/dashboard');
    } else {
        res.render('admin/login', { title: '관리자 로그인', error: '비밀번호가 틀렸습니다.' });
    }
});

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
        posts: Array.isArray(posts) ? posts : [],
        newsletters: Array.isArray(newsletters) ? newsletters : [],
        // supportData가 객체가 아닐 수 있으므로 안전하게 접근
        programTypes: supportData.types || [],
        govProjects: supportData.projects || []
    });
});

// POST: 항목 추가 (공통 핸들러)
router.post('/add', requireLogin, upload.single('image'), (req, res) => {
    const { type, title, url, date, period, agency, programs, description } = req.body;
     
    let imagePath = req.file ? req.file.path.replace('public', '') : ""; 

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
            if (!supportDataProj.projects) supportDataProj.projects = [];
            supportDataProj.projects.unshift(newProject);
            writeData(dataPath.govSupport, supportDataProj);
            break;
        case 'programType':
            const supportDataType = readData(dataPath.govSupport);
            const newType = { agency, programs, description, url };
            if (!supportDataType.types) supportDataType.types = [];
            supportDataType.types.unshift(newType);
            writeData(dataPath.govSupport, supportDataType);
            break;
    }
    res.redirect(`/admin/dashboard#tab-${type === 'column' ? 'column' : (type === 'newsletter' ? 'newsletter' : 'gov-support')}`);
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
                    const imagePathToDelete = path.join(__dirname, '..', 'public', postToDelete.image);
                    if (fs.existsSync(imagePathToDelete)) fs.unlinkSync(imagePathToDelete);
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
    
    res.redirect(`/admin/dashboard#tab-${type === 'column' ? 'column' : (type === 'newsletter' ? 'newsletter' : 'gov-support')}`);
});

module.exports = router;