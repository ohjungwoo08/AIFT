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

// 라우팅 (HTML 파일 연결)
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public.index.html')));
app.get('/page1', (req, res) => res.sendFile(path.join(__dirname, 'public.page1.html')));
app.get('/page2', (req, res) => res.sendFile(path.join(__dirname, 'public.page2.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public.login.html')));

// --- 유저 관리 API ---
app.post('/api/register', async (req, res) => {
    const { username, password, nickname } = req.body;
    try {
        await pool.query('INSERT INTO users (username, password, nickname) VALUES ($1, $2, $3)', [username.trim(), password.trim(), nickname.trim()]);
        res.send('<script>alert("가입 성공!"); location.href="/login";</script>');
    } catch (e) { res.send('<script>alert("가입 에러"); history.back();</script>'); }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username.trim(), password.trim()]);
        if (result.rows.length > 0) { req.session.user = result.rows[0]; res.redirect('/'); }
        else { res.send('<script>alert("정보 불일치"); history.back();</script>'); }
    } catch (e) { res.status(500).send("서버 에러"); }
});

app.get('/api/user/info', (req, res) => {
    res.json(req.session.user ? { isLoggedIn: true, ...req.session.user } : { isLoggedIn: false });
});

// --- 🟢 Page 1: 게시판 API ---
app.get('/api/posts', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM posts ORDER BY is_notice DESC, created_at DESC');
        res.json({ posts: result.rows, currentUser: req.session.user || null });
    } catch (e) { res.status(500).json({ error: "DB Error" }); }
});

// --- 🟢 Page 2: 연구실 기록 API (이게 빠져있었을 겁니다!) ---
app.get('/api/records', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM records ORDER BY created_at DESC');
        res.json({ records: result.rows });
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: "기록 로드 실패" }); 
    }
});

// 삭제 기능 (통합)
app.delete('/api/posts/:id', async (req, res) => {
    if (!req.session.user || req.session.user.username !== 'ohjungwoo08') return res.status(403).send("권한 없음");
    try {
        await pool.query('DELETE FROM posts WHERE id = $1', [req.params.id]);
        res.sendStatus(200);
    } catch (e) { res.status(500).send("에러"); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 서버 정상 가동: ${PORT}`));
