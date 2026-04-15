const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const session = require('express-session');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 세션 설정 (슈퍼 관리자 권한 유지)
app.use(session({
    secret: 'aift-secure-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000, httpOnly: true }
}));

// 네온 DB 연결
const connectionString = 'postgresql://neondb_owner:npg_2NLfAupgsz9C@ep-steep-resonance-a1p6ccy6-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

// --- [ 🔴 핵심 수정: 소장님의 파일명 형식에 맞춤 ] ---
// 현재 파일 이름이 'public.index.html' 형식이므로 그대로 불러옵니다.
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public.index.html')));
app.get('/page1', (req, res) => res.sendFile(path.join(__dirname, 'public.page1.html')));
app.get('/page2', (req, res) => res.sendFile(path.join(__dirname, 'public.page2.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public.login.html')));

// --- 🟢 게시판 API (수정/삭제/슈퍼관리자 로직 통합) ---
app.get('/api/posts', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM posts ORDER BY is_notice DESC, created_at DESC');
        res.json({ posts: result.rows, currentUser: req.session.user || null });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/posts', async (req, res) => {
    if (!req.session.user) return res.send('<script>alert("로그인 필요"); location.href="/login";</script>');
    const { title, content, isNotice } = req.body;
    const isAdmin = (req.session.user.username === 'ohjungwoo08');
    const isNoticeFlag = (isAdmin && isNotice === 'on');
    try {
        await pool.query('INSERT INTO posts (title, content, author_name, is_notice) VALUES ($1, $2, $3, $4)', 
            [title, content, req.session.user.nickname, isNoticeFlag]);
        res.redirect('/page1');
    } catch (e) { res.status(500).send("작성 실패"); }
});

app.put('/api/posts/:id', async (req, res) => {
    if (!req.session.user) return res.status(401).send("Unauthorized");
    try {
        await pool.query('UPDATE posts SET content = $1 WHERE id = $2 AND author_name = $3',
            [req.body.content, req.params.id, req.session.user.nickname]);
        res.sendStatus(200);
    } catch (e) { res.status(500).send("수정 실패"); }
});

app.delete('/api/posts/:id', async (req, res) => {
    if (!req.session.user) return res.status(401).send("Unauthorized");
    const isAdmin = (req.session.user.username === 'ohjungwoo08');
    try {
        if (isAdmin) {
            await pool.query('DELETE FROM posts WHERE id = $1', [req.params.id]);
        } else {
            await pool.query('DELETE FROM posts WHERE id = $1 AND author_name = $2', [req.params.id, req.session.user.nickname]);
        }
        res.sendStatus(200);
    } catch (e) { res.status(500).send("삭제 실패"); }
});

// 로그인
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username.trim(), password.trim()]);
        if (result.rows.length > 0) {
            req.session.user = result.rows[0];
            res.redirect('/');
        } else { res.send('<script>alert("불일치"); history.back();</script>'); }
    } catch (e) { res.status(500).send("에러"); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 소장님 파일명 맞춤 서버 가동: ${PORT}`));
