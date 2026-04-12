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

// 페이지 연결
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public.index.html')));
app.get('/page1', (req, res) => res.sendFile(path.join(__dirname, 'public.page1.html')));
app.get('/page2', (req, res) => res.sendFile(path.join(__dirname, 'public.page2.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public.login.html')));

// 유저 정보 API
app.get('/api/user/info', (req, res) => {
    res.json(req.session.user ? { isLoggedIn: true, ...req.session.user } : { isLoggedIn: false });
});

// 로그인
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);
        if (result.rows.length > 0) {
            req.session.user = { username: result.rows[0].username, nickname: result.rows[0].nickname };
            res.redirect('/page1');
        } else { res.send('<script>alert("정보가 틀렸습니다."); history.back();</script>'); }
    } catch (e) { res.status(500).send("로그인 서버 오류"); }
});

// 게시글 목록
app.get('/api/posts', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM posts ORDER BY is_notice DESC, created_at DESC');
        res.json({ posts: result.rows, currentUser: req.session.user || null });
    } catch (e) { res.status(500).json({ error: "DB Error" }); }
});

// 게시글 작성
app.post('/api/posts', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const { title, content, isNotice } = req.body;
    const noticeFlag = (req.session.user.username === 'ohjungwoo08' && isNotice === 'on');
    await pool.query('INSERT INTO posts (title, content, author_name, is_notice) VALUES ($1, $2, $3, $4)', [title, content, req.session.user.nickname, noticeFlag]);
    res.redirect('/page1');
});

// 🔴 수정 기능 추가 (작성자 본인만 가능)
app.put('/api/posts/:id', async (req, res) => {
    if (!req.session.user) return res.status(401).send("로그인 필요");
    try {
        const result = await pool.query('UPDATE posts SET content = $1 WHERE id = $2 AND author_name = $3', [req.body.content, req.params.id, req.session.user.nickname]);
        if (result.rowCount > 0) res.sendStatus(200);
        else res.status(403).send("권한 없음");
    } catch (e) { res.status(500).send("수정 실패"); }
});

// 삭제 기능
app.delete('/api/posts/:id', async (req, res) => {
    if (!req.session.user) return res.status(401).send("로그인 필요");
    const isAdmin = (req.session.user.username === 'ohjungwoo08');
    try {
        const query = isAdmin ? 'DELETE FROM posts WHERE id = $1' : 'DELETE FROM posts WHERE id = $1 AND author_name = $2';
        const params = isAdmin ? [req.params.id] : [req.params.id, req.session.user.nickname];
        const result = await pool.query(query, params);
        if (result.rowCount > 0) res.sendStatus(200);
        else res.status(403).send("권한 없음");
    } catch (e) { res.status(500).send("삭제 실패"); }
});

app.listen(process.env.PORT || 3000);
