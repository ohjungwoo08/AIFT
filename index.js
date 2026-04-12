const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const session = require('express-session');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'aift-secure-key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000 } 
}));

const connectionString = 'postgresql://neondb_owner:npg_2NLfAupgsz9C@ep-steep-resonance-a1p6ccy6-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

// [기존 유저 데이터] - 소장님 계정 포함
const users = [
    { username: 'ohjungwoo08', password: '123', nickname: '오정우 소장' },
    { username: 'test', password: '123', nickname: '테스트유저' }
];

// 1. 페이지 라우팅
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public.index.html')));
app.get('/page1', (req, res) => res.sendFile(path.join(__dirname, 'public.page1.html')));
app.get('/page2', (req, res) => res.sendFile(path.join(__dirname, 'public.page2.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public.login.html')));

// 2. 로그인 처리 로직 (이 부분이 빠져있었습니다!)
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        req.session.user = user; // 세션에 유저 정보 저장
        res.redirect('/');
    } else {
        res.send('<script>alert("아이디 또는 비밀번호가 틀렸습니다."); history.back();</script>');
    }
});

// 로그아웃
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// 유저 정보 API
app.get('/api/user/info', (req, res) => {
    res.json(req.session.user ? { isLoggedIn: true, ...req.session.user } : { isLoggedIn: false });
});

// 3. 게시판 관련 API (기존과 동일)
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
    await pool.query('INSERT INTO posts (title, content, author_name, is_notice) VALUES ($1, $2, $3, $4)', 
        [title, content, req.session.user.nickname, isNoticeFlag]);
    res.redirect('/page1');
});

app.put('/api/posts/:id', async (req, res) => {
    if (!req.session.user) return res.status(401).send("Unauthorized");
    try {
        const result = await pool.query(
            'UPDATE posts SET content = $1 WHERE id = $2 AND author_name = $3',
            [req.body.content, req.params.id, req.session.user.nickname]
        );
        if (result.rowCount > 0) res.sendStatus(200);
        else res.status(403).send("Forbidden");
    } catch (e) { res.status(500).send("Error"); }
});

app.delete('/api/posts/:id', async (req, res) => {
    if (!req.session.user) return res.status(401).send("Unauthorized");
    const isAdmin = req.session.user.username === 'ohjungwoo08';
    try {
        const query = isAdmin ? 'DELETE FROM posts WHERE id = $1' : 'DELETE FROM posts WHERE id = $1 AND author_name = $2';
        const params = isAdmin ? [req.params.id] : [req.params.id, req.session.user.nickname];
        const result = await pool.query(query, params);
        if (result.rowCount > 0) res.sendStatus(200);
        else res.status(4
