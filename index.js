const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const session = require('express-session');
const app = express();

// 1. 서버 기본 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'aift-secure-key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000 } 
}));

// 2. DB 연결 (비밀번호 노출 주의, 환경변수 우선)
const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_2NLfAupgsz9C@ep-steep-resonance-a1p6ccy6-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

// 3. 페이지 라우팅 (public.index.html 형식 유지)
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public.index.html')));
app.get('/page1', (req, res) => res.sendFile(path.join(__dirname, 'public.page1.html')));
app.get('/page2', (req, res) => res.sendFile(path.join(__dirname, 'public.page2.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public.login.html')));

// 4. 회원가입 API
app.post('/api/register', async (req, res) => {
    const { username, password, nickname } = req.body;
    try {
        await pool.query('INSERT INTO users (username, password, nickname) VALUES ($1, $2, $3)', [username, password, nickname]);
        res.send('<script>alert("회원가입 성공!"); location.href="/login";</script>');
    } catch (e) { res.send('<script>alert("중복 오류"); history.back();</script>'); }
});

// 5. 로그인 API
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);
        if (result.rows.length > 0) {
            req.session.user = { username: result.rows[0].username, nickname: result.rows[0].nickname };
            res.redirect('/page1');
        } else { res.send('<script>alert("정보 불일치"); history.back();</script>'); }
    } catch (e) { res.send('<script>alert("서버 오류"); history.back();</script>'); }
});

// 6. 게시글 목록 API
app.get('/api/posts', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM posts ORDER BY created_at DESC');
        res.json({ posts: result.rows, currentUser: req.session.user || null });
    } catch (e) { res.status(500).json({ error: "DB Error" }); }
});

// 7. 게시글 작성 API (일반 글로만 저장)
app.post('/api/posts', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const { title, content } = req.body;
    try {
        await pool.query('INSERT INTO posts (title, content, author_name, is_notice) VALUES ($1, $2, $3, false)', [title, content, req.session.user.nickname]);
        res.redirect('/page1');
    } catch (e) { res.send('<script>alert("작성 오류"); history.back();</script>'); }
});

// 8. ★ 핵심: 게시글 삭제 API (본인 글만)
app.delete('/api/posts/:id', async (req, res) => {
    if (!req.session.user) return res.status(401).send("로그인 필요");
    try {
        const result = await pool.query('DELETE FROM posts WHERE id = $1 AND author_name = $2', [req.params.id, req.session.user.nickname]);
        if (result.rowCount > 0) res.sendStatus(200);
        else res.status(403).send("권한 없음");
    } catch (e) { res.status(500).send("서버 오류"); }
});

// 9. 포트 설정
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server live on ${PORT}`));
