const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const session = require('express-session');
const app = express();

// 데이터 전송 방식 설정 (이게 없으면 작성이 안 될 수 있습니다)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'aift-secure-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000, httpOnly: true }
}));

// 🔴 소장님의 네온 DB 연결 정보
const connectionString = 'postgresql://neondb_owner:npg_2NLfAupgsz9C@ep-steep-resonance-a1p6ccy6-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ 
    connectionString, 
    ssl: { rejectUnauthorized: false } 
});

// DB 연결 체크 로그
pool.query('SELECT 1', (err) => {
    if (err) console.error('❌ 네온 DB 연결 실패:', err.message);
    else console.log('✅ 네온 DB 연결 성공! 소장님의 테이블에 접속했습니다.');
});

// 페이지 연결
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public.index.html')));
app.get('/page1', (req, res) => res.sendFile(path.join(__dirname, 'public.page1.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public.login.html')));

// --- 🟢 게시글 불러오기 (화면에 안 뜨는 문제 해결) ---
app.get('/api/posts', async (req, res) => {
    try {
        // posts 테이블에서 최신순으로 가져오기
        const result = await pool.query('SELECT * FROM posts ORDER BY is_notice DESC, created_at DESC');
        // 결과가 없어도 에러 대신 빈 배열을 보내서 화면이 멈추지 않게 함
        res.json({ posts: result.rows || [], currentUser: req.session.user || null });
    } catch (e) {
        console.error("데이터 로드 에러:", e.message);
        res.status(500).json({ error: "DB에서 글을 가져오지 못했습니다." });
    }
});

// --- 🟢 게시글 작성 (작성 안 되는 문제 해결) ---
app.post('/api/posts', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');

    const { title, content, isNotice } = req.body;
    const author = req.session.user.nickname;
    const isNoticeFlag = (req.session.user.username === 'ohjungwoo08' && isNotice === 'on');

    try {
        // 테이블 컬럼 이름(title, content, author_name, is_notice) 확인 완료
        await pool.query(
            'INSERT INTO posts (title, content, author_name, is_notice) VALUES ($1, $2, $3, $4)', 
            [title, content, author, isNoticeFlag]
        );
        console.log("✅ 게시글 작성 완료!");
        res.redirect('/page1'); // 작성 후 게시판으로 이동
    } catch (e) {
        console.error("❌ 게시글 작성 에러:", e.message);
        res.status(500).send("작성 실패: " + e.message);
    }
});

// 로그인 API
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username.trim(), password.trim()]);
        if (result.rows.length > 0) {
            req.session.user = result.rows[0];
            res.redirect('/');
        } else {
            res.send('<script>alert("로그인 정보 불일치"); history.back();</script>');
        }
    } catch (e) { res.status(500).send("로그인 에러"); }
});

app.get('/api/user/info', (req, res) => {
    res.json(req.session.user ? { isLoggedIn: true, ...req.session.user } : { isLoggedIn: false });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 서버 구동 완료: ${PORT}`));
