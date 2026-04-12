const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const session = require('express-session');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 세션 설정
app.use(session({
    secret: 'aift-secure-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 3600000, 
        secure: false 
    } 
}));

// DB 연결 (Neon PostgreSQL)
const connectionString = 'postgresql://neondb_owner:npg_2NLfAupgsz9C@ep-steep-resonance-a1p6ccy6-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

// --- [추가] 유저 정보 조회 (메인 페이지 우측 상단 표시용) ---
app.get('/api/user/info', (req, res) => {
    if (req.session && req.session.user) {
        res.json({ 
            isLoggedIn: true, 
            nickname: req.session.user.nickname,
            username: req.session.user.username 
        });
    } else {
        res.json({ isLoggedIn: false });
    }
});

// 페이지 연결
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public.index.html')));
app.get('/page1', (req, res) => res.sendFile(path.join(__dirname, 'public.page1.html')));
app.get('/page2', (req, res) => res.sendFile(path.join(__dirname, 'public.page2.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public.login.html')));

// 회원가입
app.post('/api/register', async (req, res) => {
    const { username, password, nickname } = req.body;
    try {
        await pool.query('INSERT INTO users (username, password, nickname) VALUES ($1, $2, $3)', [username, password, nickname]);
        res.send('<script>alert("회원가입 성공!"); location.href="/login";</script>');
    } catch (e) { res.send('<script>alert("아이디 중복"); history.back();</script>'); }
});

// 로그인 (관리자 계정 확인 로직 포함)
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);
        if (result.rows.length > 0) {
            req.session.user = {
                username: result.rows[0].username,
                nickname: result.rows[0].nickname
            };
            // 로그인 후 게시판이 아닌 메인으로 가고 싶다면 '/'로 변경 가능
            res.redirect('/'); 
        } else {
            res.send('<script>alert("정보가 틀렸습니다."); history.back();</script>');
        }
    } catch (e) {
        res.status(500).send("서버 오류");
    }
});

// 게시글 목록 (공지가 맨 위로 오도록 정렬)
app.get('/api/posts', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM posts ORDER BY is_notice DESC, created_at DESC');
        // 클라이언트에서 닉네임 비교를 위해 세션 유저 정보 전체를 보냄
        res.json({ posts: result.rows, currentUser: req.session.user || null });
    } catch (e) { res.status(500).json({ error: "DB Error" }); }
});

// 게시글 작성 (공지 등록 기능 추가)
app.post('/api/posts', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const { title, content, isNotice } = req.body;
    const author = req.session.user.nickname;
    
    // 🔴 슈퍼 관리자 전용 공지 등록 로직
    const noticeFlag = (req.session.user.username === 'ohjungwoo08' && isNotice === 'on');

    try {
        await pool.query(
            'INSERT INTO posts (title, content, author_name, is_notice) VALUES ($1, $2, $3, $4)', 
            [title, content, author, noticeFlag]
        );
        res.redirect('/page1');
    } catch (e) {
        res.send('<script>alert("작성 실패"); history.back();</script>');
    }
});

// 삭제 기능 (슈퍼 관리자는 모든 글 삭제 가능)
app.delete('/api/posts/:id', async (req, res) => {
