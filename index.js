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

// 🔴 네온 DB 주소 (특수문자 포함 확인 완료)
const connectionString = 'postgresql://neondb_owner:npg_2NLfAupgsz9C@ep-steep-resonance-a1p6ccy6-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

// DB 연결 테스트
pool.query('SELECT NOW()', (err, res) => {
    if (err) console.error("❌ DB 연결 실패:", err);
    else console.log("✅ DB 연결 성공! 서버 시간:", res.rows[0].now);
});

const users = [
    { username: 'ohjungwoo08', password: 'j#3065010!', nickname: '오정우' }
];

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public.index.html')));
app.get('/page1', (req, res) => res.sendFile(path.join(__dirname, 'public.page1.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public.login.html')));

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username.trim() && u.password === password.trim());
    if (user) { req.session.user = user; res.redirect('/'); }
    else res.send('<script>alert("불일치"); history.back();</script>');
});

app.get('/api/user/info', (req, res) => {
    res.json(req.session.user ? { isLoggedIn: true, ...req.session.user } : { isLoggedIn: false });
});

// 🟢 게시글 불러오기 (데이터가 없어도 에러 안 나게 처리)
app.get('/api/posts', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM posts ORDER BY is_notice DESC, created_at DESC');
        res.json({ posts: result.rows || [], currentUser: req.session.user || null });
    } catch (e) {
        console.error("불러오기 에러:", e);
        res.json({ posts: [], error: "데이터를 가져오지 못했습니다." });
    }
});

// 🟢 게시글 작성
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
        console.error("작성 에러:", e);
        res.status(500).send("작성 실패: DB 연결을 확인하세요.");
    }
});

// 🟢 삭제 (관리자 권한)
app.delete('/api/posts/:id', async (req, res) => {
    if (!req.session.user) return res.status(401).send("Unauthorized");
    const isAdmin = req.session.user.username === 'ohjungwoo08';
    try {
        const query = isAdmin ? 'DELETE FROM posts WHERE id = $1' : 'DELETE FROM posts WHERE id = $1 AND author_name = $2';
        const params = isAdmin ? [req.params.id] : [req.params.id, req.session.user.nickname];
        await pool.query(query, params);
        res.sendStatus(200);
    } catch (e) { res.status(500).send("삭제 실패"); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
