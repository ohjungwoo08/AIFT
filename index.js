const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const session = require('express-session');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 세션 설정: 로그인 유지를 위해 필수입니다.
app.use(session({
    secret: 'aift-secure-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 3600000, // 1시간 유지
        secure: false 
    } 
}));

// DB 연결 (Neon PostgreSQL)
const connectionString = 'postgresql://neondb_owner:npg_2NLfAupgsz9C@ep-steep-resonance-a1p6ccy6-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

// --- [API] 유저 정보 조회 (메인 페이지 우측 상단용) ---
app.get('/api/user/info', (req, res) => {
    if (req.session && req.session.user) {
        res.json({ 
            isLoggedIn: true, 
            nickname: req.session.user.nickname,
            username: req.session.user.username 
        });
    } else {
        res.json({ isLoggedIn: false });
    }
});

// --- [페이지 라우팅] ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public.index.html')));
app.get('/page1', (req, res) => res.sendFile(path.join(__dirname, 'public.page1.html')));
app.get('/page2', (req, res) => res.sendFile(path.join(__dirname, 'public.page2.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public.login.html')));

// --- [API] 회원가입 ---
app.post('/api/register', async (req, res) => {
    const { username, password, nickname } = req.body;
    try {
        await pool.query('INSERT INTO users (username, password, nickname) VALUES ($1, $2, $3)', [username, password, nickname]);
        res.send('<script>alert("회원가입 성공!"); location.href="/login";</script>');
    } catch (e) { res.send('<script>alert("아이디 중복 또는 오류"); history.back();</script>'); }
});

// --- [API] 로그인 ---
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);
        if (result.rows.length > 0) {
            req.session.user = {
                username: result.rows[0].username,
                nickname: result.rows[0].nickname
            };
            res.redirect('/'); // 로그인 후 메인으로 이동
        } else { res.send('<script>alert("정보가 틀렸습니다."); history.back();</script>'); }
    } catch (e) { res.send('<script>alert("서버 오류"); history.back();</script>'); }
});

// --- [API] 게시글 목록 (최신순) ---
app.get('/api/posts', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM posts ORDER BY created_at DESC');
        // 중요: 구조분해 할당을 위해 posts와 currentUser를 함께 보냄
        res.json({ 
            posts: result.rows, 
            currentUser: req.session.user ? req.session.user.nickname : null 
        });
    } catch (e) { res.status(500).json({ error: "DB Error" }); }
});

// --- [API] 게시글 작성 ---
app.post('/api/posts', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const { title, content } = req.body;
    const author = req.session.user.nickname;
    try {
        await pool.query(
            'INSERT INTO posts (title, content, author_name, is_notice) VALUES ($1, $2, $3, false)', 
            [title
