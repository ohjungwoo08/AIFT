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

// ✅ 정우님의 네온 주소 (수정 불필요)
const connectionString = 'postgresql://neondb_owner:npg_2NLfAupgsz9C@ep-steep-resonance-a1p6ccy6-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({ 
    connectionString: connectionString, 
    ssl: { rejectUnauthorized: false } 
});

// 페이지 라우팅
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public.index.html')));
app.get('/page1', (req, res) => res.sendFile(path.join(__dirname, 'public.page1.html')));
app.get('/page2', (req, res) => res.sendFile(path.join(__dirname, 'public.page2.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public.login.html')));

// 회원가입 및 로그인 API
app.post('/api/register', async (req, res) => {
    const { username, password, nickname } = req.body;
    try {
        await pool.query('INSERT INTO users (username, password, nickname) VALUES ($1, $2, $3)', [username, password, nickname]);
        res.send('<script>alert("회원가입 성공!"); location.href="/login";</script>');
    } catch (e) { res.send('<script>alert("이미 있는 아이디입니다."); history.back();</script>'); }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);
    if (result.rows.length > 0) {
        req.session.user = result.rows[0];
        res.redirect('/page1');
    } else { res.send('<script>alert("정보가 틀렸습니다."); history.back();</script>'); }
});

app.get('/api/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// 게시글 API (전체 글 불러오기 포함)
app.get('/api/posts', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM posts ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (e) { res.status(500).send("DB Error"); }
});

app.post('/api/posts', async (req, res) => {
    if (!req.session.user) return res.send('<script>alert("로그인 필요!"); location.href="/login";</script>');
    const { title, content } = req.body;
    const author = req.session.user.nickname;
    await pool.query('INSERT INTO posts (title, content, author_name) VALUES ($1, $2, $3)', [title, content, author]);
    res.redirect('/page1');
});

app.listen(process.env.PORT || 3000);
