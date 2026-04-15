const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const session = require('express-session');
const app = express();

// 데이터 처리 미들웨어 (작성 기능에 필수!)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 세션 설정 (로그인 상태 유지 및 슈퍼 관리자 판별용)
app.use(session({
    secret: 'aift-secure-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 3600000, 
        httpOnly: true,
        secure: false // HTTPS 환경이 아닐 경우 false 유지
    }
}));

// 🔴 소장님의 네온 DB 연결
const connectionString = 'postgresql://neondb_owner:npg_2NLfAupgsz9C@ep-steep-resonance-a1p6ccy6-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

// [ 페이지 라우팅 ]
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/page1', (req, res) => res.sendFile(path.join(__dirname, 'public', 'page1.html'))); // 게시판
app.get('/page2', (req, res) => res.sendFile(path.join(__dirname, 'public', 'page2.html'))); // 자료실
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));

// --- 🟢 게시판 로드 (로드 안 되는 문제 해결) ---
app.get('/api/posts', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM posts ORDER BY is_notice DESC, created_at DESC');
        // 세션에 저장된 유저 정보를 함께 보내서 프론트에서 관리자 여부를 판단하게 함
        res.json({ 
            posts: result.rows, 
            currentUser: req.session.user || null 
        });
    } catch (e) {
        console.error("게시글 로드 실패:", e.message);
        res.status(500).json({ error: "데이터를 불러올 수 없습니다." });
    }
});

// --- 🟢 게시글 등록 (등록 안 되는 문제 해결 + 슈퍼 관리자 기능) ---
app.post('/api/posts', async (req, res) => {
    if (!req.session.user) return res.send('<script>alert("로그인이 필요합니다."); location.href="/login";</script>');

    const { title, content, isNotice } = req.body;
    const authorNickname = req.session.user.nickname;
    
    // 슈퍼 관리자(ohjungwoo08) 체크
    const isAdmin = (req.session.user.username === 'ohjungwoo08');
    const isNoticeFlag = (isAdmin && isNotice === 'on'); // 관리자이면서 체크박스 켰을 때만 공지

    try {
        await pool.query(
            'INSERT INTO posts (title, content, author_name, is_notice) VALUES ($1, $2, $3, $4)', 
            [title, content, authorNickname, isNoticeFlag]
        );
        res.redirect('/page1'); // 성공 시 게시판으로 리다이렉트
    } catch (e) {
        console.error("글 등록 에러:", e.message);
        res.status(500).send("등록 실패: " + e.message);
    }
});

// --- 🟢 삭제 기능 (슈퍼 관리자 전용) ---
app.delete('/api/posts/:id', async (req, res) => {
    if (!req.session.user) return res.status(401).send("Unauthorized");
    
    const isAdmin = (req.session.user.username === 'ohjungwoo08');
    const postId = req.params.id;

    try {
        // 관리자는 무조건 삭제, 일반 유저는 본인 글만 삭제
        if (isAdmin) {
            await pool.query('DELETE FROM posts WHERE id = $1', [postId]);
        } else {
            await pool.query('DELETE FROM posts WHERE id = $1 AND author_name = $2', [postId, req.session.user.nickname]);
        }
        res.sendStatus(200);
    } catch (e) {
        res.status(500).send("삭제 실패");
    }
});

// [ 로그인 API ]
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username.trim(), password.trim()]);
        if (result.rows.length > 0) {
            req.session.user = result.rows[0]; // 세션에 유저 전체 정보 저장 (중요!)
            res.redirect('/');
        } else {
            res.send('<script>alert("아이디 또는 비밀번호가 틀렸습니다."); history.back();</script>');
        }
    } catch (e) { res.status(500).send("서버 오류"); }
});

app.get('/api/user/info', (req, res) => {
    res.json(req.session.user ? { isLoggedIn: true, ...req.session.user } : { isLoggedIn: false });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 슈퍼 관리자 시스템 정상 가동: ${PORT}`));
