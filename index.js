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

// 라우팅
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public.index.html')));
app.get('/page1', (req, res) => res.sendFile(path.join(__dirname, 'public.page1.html')));
app.get('/page2', (req, res) => res.sendFile(path.join(__dirname, 'public.page2.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public.login.html')));

// --- 🟢 게시글 불러오기 API ---
app.get('/api/posts', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM posts ORDER BY is_notice DESC, created_at DESC');
        res.json({ posts: result.rows, currentUser: req.session.user || null });
    } catch (e) {
        console.error("데이터 로드 실패:", e);
        res.status(500).json({ error: "DB Error" });
    }
});

// --- 🟢 게시글 작성 API (가장 중요한 부분) ---
app.post('/api/posts', async (req, res) => {
    // 1. 세션 확인 (로그인 안 되어 있으면 로그인 페이지로)
    if (!req.session.user) return res.redirect('/login');

    const { title, content, isNotice } = req.body;
    // 2. 공지사항 여부 체크 (소장님 계정일 때만)
    const isNoticeFlag = (req.session.user.username === 'ohjungwoo08' && isNotice === 'on');

    try {
        // 3. DB에 데이터 삽입
        await pool.query(
            'INSERT INTO posts (title, content, author_name, is_notice) VALUES ($1, $2, $3, $4)', 
            [title, content, req.session.user.nickname, isNoticeFlag]
        );
        
        console.log("✅ 게시글 작성 성공!");
        // 4. 작성이 완료되면 게시판 페이지(page1)로 다시 보냅니다.
        res.redirect('/page1'); 
    } catch (e) {
        console.error("❌ 게시글 작성 실패:", e.message);
        res.status(500).send(`<script>alert("작성에 실패했습니다: ${e.message}"); history.back();</script>`);
    }
});

// --- 🟢 로그인 및 기타 API ---
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username.trim(), password.trim()]);
        if (result.rows.length > 0) {
            req.session.user = result.rows[0];
            res.redirect('/');
        } else {
            res.send('<script>alert("정보가 틀립니다."); history.back();</script>');
        }
    } catch (e) { res.status(500).send("로그인 에러"); }
});

app.get('/api/user/info', (req, res) => {
    res.json(req.session.user ? { isLoggedIn: true, ...req.session.user } : { isLoggedIn: false });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 서버 정상 작동 중: ${PORT}`));
