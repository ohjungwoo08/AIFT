const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const session = require('express-session');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'aift-secure-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000, httpOnly: true }
}));

const connectionString = 'postgresql://neondb_owner:npg_2NLfAupgsz9C@ep-steep-resonance-a1p6ccy6-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

// 페이지 라우팅
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public.index.html')));
app.get('/page1', (req, res) => res.sendFile(path.join(__dirname, 'public.page1.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public.login.html')));

// --- 🟢 1. 회원가입 해결 (DB 저장) ---
app.post('/api/register', async (req, res) => {
    const { username, password, nickname } = req.body;
    try {
        await pool.query(
            'INSERT INTO users (username, password, nickname) VALUES ($1, $2, $3)',
            [username.trim(), password.trim(), nickname.trim()]
        );
        res.send('<script>alert("회원가입 성공!"); location.href="/login";</script>');
    } catch (e) {
        console.error("가입 에러:", e.message);
        res.send('<script>alert("이미 존재하는 아이디이거나 DB 연결 오류입니다."); history.back();</script>');
    }
});

// --- 🟢 2. 게시글 로드 해결 (DB 조회) ---
app.get('/api/posts', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM posts ORDER BY is_notice DESC, created_at DESC');
        res.json({ posts: result.rows, currentUser: req.session.user || null });
    } catch (e) {
        console.error("로드 에러:", e.message);
        res.status(500).json({ error: "데이터를 가져올 수 없습니다." });
    }
});

// 게시글 작성
app.post('/api/posts', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const { title, content, isNotice } = req.body;
    const isNoticeFlag = (req.session.user.username === 'ohjungwoo08' && isNotice === 'on');
    try {
        await pool.query(
            'INSERT INTO posts (title, content, author_name, is_notice) VALUES ($1, $2, $3, $4)', 
            [title, content, req.session.user.nickname, isNoticeFlag]
        );
        res.redirect('/page1');
    } catch (e) {
        res.status(500).send("작성 실패");
    }
});

// 로그인
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username.trim(), password.trim()]);
        if (result.rows.length > 0) {
            req.session.user = result.rows[0];
            res.redirect('/');
        } else {
            res.send('<script>alert("로그인 정보 불일치"); history.back();</script>');
        }
    } catch (e) { res.status(500).send("서버 오류"); }
});

app.get('/api/user/info', (req, res) => {
    res.json(req.session.user ? { isLoggedIn: true, ...req.session.user } : { isLoggedIn: false });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 서버 정상 가동: ${PORT}`));
