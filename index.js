const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const session = require('express-session');
const app = express();

// 1. 기본 설정 및 미들웨어
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'aift-secure-key', // 세션 암호화 키
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 3600000, // 1시간 유지
        httpOnly: true 
    } 
}));

// 2. 데이터베이스 연결 (Neon PostgreSQL)
const connectionString = 'postgresql://neondb_owner:npg_2NLfAupgsz9C@ep-steep-resonance-a1p6ccy6-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

// 3. 사용자 데이터 (정우 소장님 슈퍼관리자 계정 포함)
const users = [
    { username: 'ohjungwoo08', password: '123', nickname: '오정우 소장' },
    { username: 'test', password: '123', nickname: '테스트유저' }
];

// --- [ 페이지 라우팅 ] ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public.index.html')));
app.get('/page1', (req, res) => res.sendFile(path.join(__dirname, 'public.page1.html')));
app.get('/page2', (req, res) => res.sendFile(path.join(__dirname, 'public.page2.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public.login.html')));

// --- [ 로그인 및 세션 관리 ] ---
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        req.session.user = user; // 세션에 유저 정보 기록
        res.redirect('/');
    } else {
        res.send('<script>alert("아이디 또는 비밀번호가 올바르지 않습니다."); history.back();</script>');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get('/api/user/info', (req, res) => {
    // 프론트엔드에서 로그인 여부를 판단하기 위한 API
    res.json(req.session.user ? { isLoggedIn: true, ...req.session.user } : { isLoggedIn: false });
});

// --- [ 게시판 API 로직 ] ---

// 게시글 목록 불러오기 (공지사항 상단 배치)
app.get('/api/posts', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM posts ORDER BY is_notice DESC, created_at DESC');
        res.json({ posts: result.rows, currentUser: req.session.user || null });
    } catch (e) {
        console.error("DB 로드 에러:", e);
        res.status(500).json({ error: "데이터베이스 통신 오류" });
    }
});

// 게시글 작성 (슈퍼관리자 공지 체크 포함)
app.post('/api/posts', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    
    const { title, content, isNotice } = req.body;
    // 슈퍼관리자이면서 공지 체크를 했을 때만 true
    const isNoticeFlag = (req.session.user.username === 'ohjungwoo08' && isNotice === 'on');
    
    try {
        await pool.query(
            'INSERT INTO posts (title, content, author_name, is_notice) VALUES ($1, $2, $3, $4)', 
            [title, content, req.session.user.nickname, isNoticeFlag]
        );
        res.redirect('/page1');
    } catch (e) {
        res.status(500).send("글 작성 중 오류가 발생했습니다.");
    }
});

// 🔴 게시글 수정 API (작성자 본인만 가능)
app.put('/api/posts/:id', async (req, res) => {
    if (!req.session.user) return res.status(401).send("Unauthorized");
    
    const { content } = req.body;
    const postId = req.params.id;
    const userNickname = req.session.user.nickname;

    try {
        const result = await pool.query(
            'UPDATE posts SET content = $1 WHERE id = $2 AND author_name = $3',
            [content, postId, userNickname]
        );
        
        if (result.rowCount > 0) res.sendStatus(200);
        else res.status(403).send("수정 권한이 없거나 존재하지 않는 게시글입니다.");
    } catch (e) {
        res.status(500).send("수정 중 서버 오류 발생");
    }
});

// 🔴 게시글 삭제 API (슈퍼관리자 만능 삭제 가능)
app.delete('/api/posts/:id', async (req, res) => {
    if (!req.session.user) return res.status(401).send("Unauthorized");
    
    const postId = req.params.id;
    const isAdmin = req.session.user.username === 'ohjungwoo08';
    const userNickname = req.session.user.nickname;

    try {
        let query;
        let params;

        if (isAdmin) {
            // 슈퍼관리자는 ID만 맞으면 무조건 삭제
            query = 'DELETE FROM posts WHERE id = $1';
            params = [postId];
        } else {
            // 일반 유저는 ID와 닉네임이 모두 일치해야 삭제
            query = 'DELETE FROM posts WHERE id = $1 AND author_name = $2';
            params = [postId, userNickname];
        }

        const result = await pool.query(query, params);
        if (result.rowCount > 0) res.sendStatus(200);
        else res.status(403).send("삭제 권한이 없습니다.");
    } catch (e) {
        res.status(500).send("삭제 중 서버 오류 발생");
    }
});

// 4. 서버 시작 (Render 배포용 포트 설정)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`🚀 오정우 연구실 서버가 가동되었습니다.`);
    console.log(`🌐 포트 번호: ${PORT}`);
    console.log(`========================================`);
});
