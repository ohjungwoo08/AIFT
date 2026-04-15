const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const session = require('express-session');
const fs = require('fs'); // 파일 존재 확인용
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 세션 설정: 관리자 ohjungwoo08 권한 유지의 핵심
app.use(session({
    secret: 'aift-secure-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000, httpOnly: true }
}));

// 네온 DB 연결 정보
const connectionString = 'postgresql://neondb_owner:npg_2NLfAupgsz9C@ep-steep-resonance-a1p6ccy6-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

// --- [ 페이지 라우팅: 404 방지용 경로 탐색 ] ---
const getSafePath = (fileName) => {
    const paths = [
        path.join(__dirname, 'public', fileName),
        path.join(__dirname, fileName)
    ];
    return paths.find(p => fs.existsSync(p)) || paths[0]; 
};

app.get('/', (req, res) => res.sendFile(getSafePath('index.html')));
app.get('/page1', (req, res) => res.sendFile(getSafePath('page1.html')));
app.get('/page2', (req, res) => res.sendFile(getSafePath('page2.html')));
app.get('/login', (req, res) => res.sendFile(getSafePath('login.html')));

// --- [ 🟢 게시판 API: 로드 및 관리자 체크 ] ---
app.get('/api/posts', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM posts ORDER BY is_notice DESC, created_at DESC');
        res.json({ 
            posts: result.rows, 
            currentUser: req.session.user || null 
        });
    } catch (e) {
        res.status(500).json({ posts: [], error: e.message });
    }
});

// --- [ 🟢 게시판 API: 작성 ] ---
app.post('/api/posts', async (req, res) => {
    if (!req.session.user) return res.send('<script>alert("로그인이 필요합니다."); location.href="/login";</script>');
    const { title, content, isNotice } = req.body;
    const isAdmin = (req.session.user.username === 'ohjungwoo08');
    const isNoticeFlag = (isAdmin && isNotice === 'on');
    try {
        await pool.query(
            'INSERT INTO posts (title, content, author_name, is_notice) VALUES ($1, $2, $3, $4)', 
            [title, content, req.session.user.nickname, isNoticeFlag]
        );
        res.redirect('/page1');
    } catch (e) { res.status(500).send("작성 실패"); }
});

// --- [ 🟢 게시판 API: 수정 (성공했던 로직) ] ---
app.put('/api/posts/:id', async (req, res) => {
    if (!req.session.user) return res.status(401).send("Unauthorized");
    const { content } = req.body;
    const postId = req.params.id;
    try {
        const result = await pool.query(
            'UPDATE posts SET content = $1 WHERE id = $2 AND author_name = $3',
            [content, postId, req.session.user.nickname]
        );
        if (result.rowCount > 0) res.sendStatus(200);
        else res.status(403).send("수정 권한이 없습니다.");
    } catch (e) { res.status(500).send("수정 실패"); }
});

// --- [ 🟢 게시판 API: 삭제 (성공했던 로직 + 슈퍼 관리자) ] ---
app.delete('/api/posts/:id', async (req, res) => {
    if (!req.session.user) return res.status(401).send("Unauthorized");
    const isAdmin = (req.session.user.username === 'ohjungwoo08');
    const postId = req.params.id;
    try {
        if (isAdmin) {
            await pool.query('DELETE FROM posts WHERE id = $1', [postId]);
        } else {
            await pool.query('DELETE FROM posts WHERE id = $1 AND author_name = $2', [postId, req.session.user.nickname]);
        }
        res.sendStatus(200);
    } catch (e) { res.status(500).send("삭제 실패"); }
});

// [ 로그인 API ]
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username.trim(), password.trim()]);
        if (result.rows.length > 0) {
            req.session.user = result.rows[0];
            res.redirect('/');
        } else {
            res.send('<script>alert("로그인 정보가 틀립니다."); history.back();</script>');
        }
    } catch (e) { res.status(
