const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const session = require('express-session'); // 로그인 세션 관리 도구
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔴 세션 설정 (로그인 상태를 유지하는 메모리)
app.use(session({
    secret: 'jungwoo-lab-secret-key', // 암호화 키
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000 } // 1시간 동안 로그인 유지
}));

const connectionString = '정우님의_네온_주소_입력';
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

// --- [페이지 연결] ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public.index.html')));
app.get('/page1', (req, res) => res.sendFile(path.join(__dirname, 'public.page1.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public.login.html')));

// --- [회원가입 API] ---
app.post('/api/register', async (req, res) => {
    const { username, password, nickname } = req.body;
    try {
        await pool.query('INSERT INTO users (username, password, nickname) VALUES ($1, $2, $3)', [username, password, nickname]);
        res.send('<script>alert("회원가입 성공! 로그인해 주세요."); location.href="/login";</script>');
    } catch (err) {
        res.send('<script>alert("이미 존재하는 아이디입니다."); history.back();</script>');
    }
});

// --- [로그인 API] ---
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);
    
    if (result.rows.length > 0) {
        // 로그인 성공 시 세션에 유저 정보 저장
        req.session.user = {
            id: result.rows[0].id,
            nickname: result.rows[0].nickname
        };
        res.redirect('/page1');
    } else {
        res.send('<script>alert("아이디 또는 비밀번호가 틀렸습니다."); history.back();</script>');
    }
});

// --- [로그아웃 API] ---
app.get('/api/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// --- [게시판 API] ---
app.get('/api/posts', async (req, res) => {
    const result = await pool.query('SELECT * FROM posts ORDER BY created_at DESC');
    res.json(result.rows);
});

app.post('/api/posts', async (req, res) => {
    // 로그인 체크
    if (!req.session.user) {
        return res.send('<script>alert("로그인이 필요합니다!"); location.href="/login";</script>');
    }
    const { title, content } = req.body;
    const { id, nickname } = req.session.user;

    try {
        await pool.query('INSERT INTO posts (title, content, author_id, author_name) VALUES ($1, $2, $3, $4)', 
        [title, content, id, nickname]);
        res.redirect('/page1');
    } catch (err) {
        res.status(500).send("저장 에러");
    }
});

app.listen(process.env.PORT || 3000);
