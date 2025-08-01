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
    cookie: { 
        secure: process.env.NODE_ENV === 'production' // 배포 환경(production)에서는 true, 로컬에서는 false
    }
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
        fs.mkdirSync(dest, { recursive: true });
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// --- 데이터 I/O 헬퍼 함수 ---
const readData = (filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            return fileContent ? JSON.parse(fileContent) : [];
        }
        return [];
    } catch (error) {
        console.error(`Error reading or parsing ${filePath}:`, error);
        return [];
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

router.get('/dashboard', requireLogin, (req, res) => {
    const posts = readData(dataPath.posts);
    const newsletters = readData(dataPath.newsletters);
    const supportData = readData(dataPath.govSupport);

    res.render('admin/dashboard', {
        title: '관리자 대시보드',
        posts: Array.isArray(posts) ? posts : [],
        newsletters: Array.isArray(newsletters) ? newsletters : [],
        programTypes: supportData.types || [],
        govProjects: supportData.projects || []
    });
});

router.post('/add', requireLogin, upload.single('image'), (req, res) => {
    const { type, title, url, date, period, agency, programs, description } = req.body;
    let imagePath = req.file ? req.file.path.replace('public', '') : "";
    if (imagePath) {
      imagePath = imagePath.replace(/\\/g, '/');
    }

    switch (type) {
        case 'column':
            const posts = readData(dataPath.posts);
            posts.unshift({ title, url, image: imagePath, category: req.body.category || 'strategy' });
            writeData(dataPath.posts, posts);
            break;
        case 'newsletter':
            const newsletters = readData(dataPath.newsletters);
            newsletters.unshift({ title, link: url, date });
            writeData(dataPath.newsletters, newsletters);
            break;
        case 'govProject':
            const supportDataProj = readData(dataPath.govSupport);
            if (!supportDataProj.projects) supportDataProj.projects = [];
            supportDataProj.projects.unshift({ title, period, url });
            writeData(dataPath.govSupport, supportDataProj);
            break;
        case 'programType':
            const supportDataType = readData(dataPath.govSupport);
            if (!supportDataType.types) supportDataType.types = [];
            supportDataType.types.unshift({ agency, programs, description, url });
            writeData(dataPath.govSupport, supportDataType);
            break;
    }
    res.redirect(`/admin/dashboard#tab-${type === 'column' ? 'column' : (type === 'newsletter' ? 'newsletter' : 'gov-support')}`);
});

router.post('/delete', requireLogin, (req, res) => {
    const { type, id } = req.body;
    
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