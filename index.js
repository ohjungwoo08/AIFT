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

// DB 연결 (노출된 URL은 나중에 꼭 환경변수로 옮기세요!)
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

// 로그인
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);
        if (result.rows.length > 0) {
            req.session.user = {
                username: result.rows[0].username,
                nickname: result.rows[0].nickname
            };
            res.redirect('/page1');
        } else { res.send('<script>alert("정보가 틀렸습니다."); history.back();</script>'); }
    } catch (e) { res.send('<script>alert("서버 오류"); history.back();</script>'); }
});

// 게시글 목록 (최신순 정렬)
app.get('/api/posts', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM posts ORDER BY created_at DESC');
        res.json({ posts: result.rows, currentUser: req.session.user || null });
    } catch (e) { res.status(500).json({ error: "DB Error" }); }
});

// 게시글 작성 (공지 기능 제거)
app.post('/api/posts', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const { title, content } = req.body;
    const author = req.session.user.nickname;
    
    try {
        await pool.query(
            'INSERT INTO posts (title, content, author_name, is_notice) VALUES ($1, $2, $3, false)', 
            [title, content, author]
        );
        res.redirect('/page1');
    } catch (e) { res.send('<script>alert("작성 실패"); history.back();</script>'); }
});

// 삭제 기능 (본인 글만 삭제 가능)
app.delete('/api/posts/:id', async (req, res) => {
    if (!req.session.user) return res.status(401).send("로그인 필요");
    
    const postId = req.params.id;
    const user = req.session.user;

    try {
        // 본인 닉네임과 게시글의 작성자 이름이 일치할 때만 삭제
        const result = await pool.query('DELETE FROM posts WHERE id = $1 AND author_name = $2', [postId, user.nickname]);
        
        if (result.rowCount > 0) res.sendStatus(200);
        else res.status(403).send("본인 글만 삭제할 수 있습니다.");
    } catch (e) { res.status(500).send("서버 오류"); }
});

// 🔴 포트 번호: Render 환경변수를 최우선으로, 없으면 10000번 사용
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
