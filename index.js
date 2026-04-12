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

// [유저 데이터 저장소] - 초기값
const users = [
    { username: 'ohjungwoo08', password: 'j#3065010!', nickname: '오정우' },
    { username: 'test', password: '123', nickname: '테스트유저' }
];

// 페이지 라우팅
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public.index.html')));
app.get('/page1', (req, res) => res.sendFile(path.join(__dirname, 'public.page1.html')));
app.get('/page2', (req, res) => res.sendFile(path.join(__dirname, 'public.page2.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public.login.html')));

// --- 🟢 회원가입 로직 (새로 추가!) ---
app.post('/api/register', (req, res) => {
    const { username, password, nickname } = req.body;
    
    // 중복 가입 확인
    if (users.find(u => u.username === username)) {
        return res.send('<script>alert("이미 존재하는 아이디입니다."); history.back();</script>');
    }

    // 유저 목록에 추가
    users.push({ username: username.trim(), password: password.trim(), nickname: nickname.trim() });
    console.log("새로운 유저 가입 완료:", nickname);
    
    res.send('<script>alert("회원가입이 완료되었습니다! 로그인해 주세요."); location.href="/login";</script>');
});

// 로그인 핸들러
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username.trim() && u.password === password.trim());

    if (user) {
        req.session.user = user;
        res.redirect('/');
    } else {
        res.send('<script>alert("아이디 또는 비밀번호가 일치하지 않습니다."); history.back();</script>');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get('/api/user/info', (req, res) => {
    res.json(req.session.user ? { isLoggedIn: true, ...req.session.user } : { isLoggedIn: false });
});

// --- 게시판 API (수정/삭제/공지 권한 유지) ---
app.get('/api/posts', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM posts ORDER BY is_notice DESC, created_at DESC');
        res.json({ posts: result.rows, currentUser: req.session.user || null });
    } catch (e) { res.status(500).json({ error: "DB Error" }); }
});

app.post('/api/posts', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const { title, content, isNotice } = req.body;
    const isNoticeFlag = (req.session.user.username === 'ohjungwoo08' && isNotice === 'on');
    try {
        await pool.query('INSERT INTO posts (title, content, author_name, is_notice) VALUES ($1, $2, $3, $4)', 
            [title, content, req.session.user.nickname, isNoticeFlag]);
        res.redirect('/page1');
