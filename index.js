const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const session = require('express-session');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // 👈 HTML Form 데이터를 받기 위해 필수!
app.use(session({
    secret: 'aift-secure-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000 }
}));

const connectionString = 'postgresql://neondb_owner:npg_2NLfAupgsz9C@ep-steep-resonance-a1p6ccy6-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

// 🔴 정확한 유저 정보 확인 (아이디: ohjungwoo08 / 비번: 123)
const users = [
    { username: 'ohjungwoo08', password: '123', nickname: '오정우' },
    { username: 'test', password: '123', nickname: '테스트유저' }
];

// 페이지 라우팅
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public.index.html')));
app.get('/page1', (req, res) => res.sendFile(path.join(__dirname, 'public.page1.html')));
app.get('/page2', (req, res) => res.sendFile(path.join(__dirname, 'public.page2.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public.login.html')));

// 🟢 로그인 핸들러 (HTML의 /api/login 요청을 여기서 처리)
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    console.log("로그인 시도:", username); // Render 로그에서 확인 가능

    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        req.session.user = user;
        return res.redirect('/'); // 로그인 성공 시 메인으로
    } else {
        return res.send('<script>alert("아이디 또는 비밀번호가 일치하지 않습니다."); history.back();</script>');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get('/api/user/info', (req, res) => {
    res.json(req.session.user ? { isLoggedIn: true, ...req.session.user } : { isLoggedIn: false });
});

// 게시판 API (수정/삭제 권한 포함)
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
    } catch (e) { res.status(500).send("작성 실패"); }
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
        else res.status(403).send("No Permission");
    } catch (e) { res.status(500).send("Error"); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
