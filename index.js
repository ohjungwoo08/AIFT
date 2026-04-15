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

// 네온 DB 연결 (SSL 설정 포함)
const connectionString = 'postgresql://neondb_owner:npg_2NLfAupgsz9C@ep-steep-resonance-a1p6ccy6-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

// --- [ 페이지 연결: 소장님의 파일명 형식 반영 ] ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public.index.html')));
app.get('/page1', (req, res) => res.sendFile(path.join(__dirname, 'public.page1.html')));
app.get('/page2', (req, res) => res.sendFile(path.join(__dirname, 'public.page2.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public.login.html')));

// --- [ 🟢 게시판 로드 API - 핵심 수정 ] ---
app.get('/api/posts', async (req, res) => {
    try {
        // 테이블 이름이나 컬럼명이 다를 경우를 대비해 가장 안전하게 쿼리
        const result = await pool.query('SELECT * FROM posts ORDER BY is_notice DESC, created_at DESC');
        
        // 중요: HTML의 const { posts, currentUser } = await res.json(); 구조와 일치시킴
        res.json({ 
            posts: result.rows || [], 
            currentUser: req.session.user || null 
        });
        console.log("✅ 게시글 전송 완료");
    } catch (e) {
        console.error("❌ DB 로드 에러:", e.message);
        // 에러가 나더라도 빈 배열을 보내서 화면이 멈추지 않게 함
        res.status(500).json({ posts: [], error: e.message });
    }
});

// --- [ 🟢 게시글 작성 API ] ---
app.post('/api/posts', async (req, res) => {
    if (!req.session.user) return res.send('<script>alert("로그인이 필요합니다."); location.href="/login";</script>');
    const { title, content, isNotice } = req.body;
    const isAdmin = (req.session.user.username === 'ohjungwoo08');
    const isNoticeFlag = (isAdmin && isNotice === 'on');
    try {
        await pool.query('INSERT INTO posts (title, content, author_name, is_notice) VALUES ($1, $2, $3, $4)', 
            [title, content, req.session.user.nickname, isNoticeFlag]);
        res.redirect('/page1');
    } catch (e) { res.status(500).send("작성 에러: " + e.message); }
});

// [ 로그인 API ]
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username.trim(), password.trim()]);
        if (result.rows.length > 0) {
            req.session.user = result.rows[0];
            res.redirect('/');
        } else { res.send('<script>alert("불일치"); history.back();</script>'); }
    } catch (e) { res.status(500).send("로그인 에러"); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 서버 구동 중: ${PORT}`));
