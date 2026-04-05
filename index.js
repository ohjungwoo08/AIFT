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

// ✅ 페이지 연결 통로 (이름이 정확해야 자료실이 열립니다)
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public.index.html')));
app.get('/page1', (req, res) => res.sendFile(path.join(__dirname, 'public.page1.html')));
app.get('/page2', (req, res) => res.sendFile(path.join(__dirname, 'public.page2.html'))); // 자료실 통로
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public.login.html')));

// 회원가입/로그인/게시판 API
app.post('/api/register', async (req, res) => {
    const { username, password, nickname } = req.body;
    try {
        await pool.query('INSERT INTO users (username, password, nickname) VALUES ($1, $2, $3)', [username, password, nickname]);
        res.send('<script>alert("성공!"); location.href="/login";</script>');
    } catch (e) { res.send('<script>alert("중복 아이디"); history.back();</script>'); }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);
    if (result.rows.length > 0) {
        req.session.user = result.rows[0];
        res.redirect('/page1');
    } else { res.send('<script>alert("정보 오류"); history.back();</script>'); }
});

app.get('/api/posts', async (req, res) => {
    const result = await pool.query('SELECT * FROM posts ORDER BY created_at DESC');
    res.json({ posts: result.rows, currentUser: req.session.user ? req.session.user.nickname : null });
});

app.post('/api/posts', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const { title, content } = req.body;
    const author = req.session.user.nickname;
    await pool.query('INSERT INTO posts (title, content, author_name) VALUES ($1, $2, $3)', [title, content, author]);
    res.redirect('/page1');
});

app.delete('/api/posts/:id', async (req, res) => {
    if (!req.session.user) return res.status(401).send("로그인 필요");
    const result = await pool.query('DELETE FROM posts WHERE id = $1 AND author_name = $2', [req.params.id, req.session.user.nickname]);
    if (result.rowCount > 0) res.sendStatus(200);
    else res.status(403).send("권한 없음");
});

app.listen(process.env.PORT || 3000);
