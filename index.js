const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const session = require('express-session');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'aift-secure-key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000 } 
}));

const connectionString = 'postgresql://neondb_owner:npg_2NLfAupgsz9C@ep-steep-resonance-a1p6ccy6-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

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
    const result = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);
    if (result.rows.length > 0) {
        req.session.user = {
            username: result.rows[0].username,
            nickname: result.rows[0].nickname
        };
        res.redirect('/page1');
    } else { res.send('<script>alert("정보가 틀렸습니다."); history.back();</script>'); }
});

// 게시글 목록 (공지가 맨 위로 오도록 정렬)
app.get('/api/posts', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM posts ORDER BY is_notice DESC, created_at DESC');
        res.json({ posts: result.rows, currentUser: req.session.user || null });
    } catch (e) { res.status(500).json({ error: "DB Error" }); }
});

// 게시글 작성 (공지 등록 기능 추가)
app.post('/api/posts', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const { title, content, isNotice } = req.body;
    const author = req.session.user.nickname;
    
    // 🔴 오직 ohjungwoo08만 공지를 등록할 수 있음
    const noticeFlag = (req.session.user.username === 'ohjungwoo08' && isNotice === 'on');

    await pool.query(
        'INSERT INTO posts (title, content, author_name, is_notice) VALUES ($1, $2, $3, $4)', 
        [title, content, author, noticeFlag]
    );
    res.redirect('/page1');
});

// 삭제 기능 (슈퍼 관리자는 모든 글 삭제 가능)
app.delete('/api/posts/:id', async (req, res) => {
    if (!req.session.user) return res.status(401).send("로그인 필요");
    
    const postId = req.params.id;
    const user = req.session.user;

    try {
        let result;
        if (user.username === 'ohjungwoo08') {
            // 🔴 슈퍼 관리자는 아이디 상관없이 삭제 가능
            result = await pool.query('DELETE FROM posts WHERE id = $1', [postId]);
        } else {
            // 일반 사용자는 본인 닉네임 글만 삭제 가능
            result = await pool.query('DELETE FROM posts WHERE id = $1 AND author_name = $2', [postId, user.nickname]);
        }
        
        if (result.rowCount > 0) res.sendStatus(200);
        else res.status(403).send("삭제 권한이 없습니다.");
    } catch (e) { res.status(500).send("서버 오류"); }
});

app.listen(process.env.PORT || 3000);
