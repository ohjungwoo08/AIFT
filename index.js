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

// 🔴 데이터베이스 연결 설정
const connectionString = 'postgresql://neondb_owner:npg_2NLfAupgsz9C@ep-steep-resonance-a1p6ccy6-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ 
    connectionString, 
    ssl: { rejectUnauthorized: false } 
});

// DB 연결 확인용 로그
pool.connect((err) => {
    if (err) console.error('❌ DB 연결 실패:', err.stack);
    else console.log('✅ 네온 DB 연결 성공!');
});

// 유저 정보 (소장님 전용)
const users = [
    { username: 'ohjungwoo08', password: 'j#3065010!', nickname: '오정우' }
];

// 페이지 라우팅
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public.index.html')));
app.get('/page1', (req, res) => res.sendFile(path.join(__dirname, 'public.page1.html')));
app.get('/page2', (req, res) => res.sendFile(path.join(__dirname, 'public.page2.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public.login.html')));

// 회원가입
app.post('/api/register', (req, res) => {
    const { username, password, nickname } = req.body;
    if (users.find(u => u.username === username)) return res.send('<script>alert("중복된 아이디"); history.back();</script>');
    users.push({ username: username.trim(), password: password.trim(), nickname: nickname.trim() });
    res.send('<script>alert("가입 완료"); location.href="/login";</script>');
});

// 로그인
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username.trim() && u.password === password.trim());
    if (user) {
        req.session.user = user;
        res.redirect('/');
    } else {
        res.send('<script>alert("불일치"); history.back();</script>');
    }
});

app.get('/api/user/info', (req, res) => {
    res.json(req.session.user ? { isLoggedIn: true, ...req.session.user } : { isLoggedIn: false });
});

// 게시판 목록 불러오기
app.get('/api/posts', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM posts ORDER BY is_notice DESC, created_at DESC');
        res.json({ posts: result.rows, currentUser: req.session.user || null });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "게시글을 불러올 수 없습니다." });
    }
});

// 게시글 작성 (공지 기능 포함)
app.post('/api/posts', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const { title, content, isNotice } = req.body;
    const isNoticeFlag = (req.session.user.username === 'ohjungwoo08' && isNotice === 'on');
    try {
        await pool.query('INSERT INTO posts (title, content, author_name, is_notice) VALUES ($1, $2, $3, $4)', 
            [title, content, req.session.user.nickname, isNoticeFlag]);
        res.redirect('/page1');
    } catch (e) { res.status(500).send("작성 에러"); }
});

// 삭제 (슈퍼관리자 무적 권한)
app.delete('/api/posts/:id', async (req, res) => {
    if (!req.session.user) return res.status(401).send("로그인 필요");
    const isAdmin = req.session.user.username === 'ohjungwoo08';
    try {
        const query = isAdmin ? 'DELETE FROM posts WHERE id = $1' : 'DELETE FROM posts WHERE id = $1 AND author_name = $2';
        const params = isAdmin ? [req.params.id] : [req.params.id, req.session.user.nickname];
        await pool.query(query, params);
        res.sendStatus(200);
    } catch (e) { res.status(500).send("삭제 에러"); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 서버 가동 중: ${PORT}`));
