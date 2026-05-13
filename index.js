const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const session = require('express-session');
// 🚀 제미나이 연결을 위한 라이브러리 추가
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- [ 🟢 정적 파일 서비스 설정 ] ---
app.use(express.static(path.join(__dirname)));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'aift-secure-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000, httpOnly: true }
}));

const connectionString = 'postgresql://neondb_owner:npg_2NLfAupgsz9C@ep-steep-resonance-a1p6ccy6-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

// --- [ 페이지 연결 ] ---
app.get('/', (req, res) => res.sendFile(path.resolve(__dirname, 'public.index.html')));
app.get('/page1', (req, res) => res.sendFile(path.resolve(__dirname, 'public.page1.html')));
app.get('/page2', (req, res) => res.sendFile(path.resolve(__dirname, 'public.page2.html')));
app.get('/login', (req, res) => res.sendFile(path.resolve(__dirname, 'public.login.html')));
app.get('/game', (req, res) => res.sendFile(path.resolve(__dirname, 'public.game.html')));

// --- [ 🟢 사용자 정보 확인 API ] ---
app.get('/api/userinfo', (req, res) => {
    if (req.session.user) {
        res.json({ loggedIn: true, user: req.session.user });
    } else {
        res.json({ loggedIn: false });
    }
});

// --- [ 🟢 로그아웃 API ] ---
app.get('/api/logout', (req, res) => {
    req.session.destroy();
    res.send('<script>alert("로그아웃 되었습니다."); location.href="/";</script>');
});

// --- [ 🟢 회원가입 API ] ---
app.post('/api/register', async (req, res) => {
    const { username, password, nickname } = req.body;
    if (!username || !password || !nickname) {
        return res.send('<script>alert("모든 항목을 입력해주세요."); history.back();</script>');
    }
    try {
        const checkUser = await pool.query('SELECT * FROM users WHERE username = $1', [username.trim()]);
        if (checkUser.rows.length > 0) {
            return res.send('<script>alert("이미 사용 중인 아이디입니다."); history.back();</script>');
        }
        await pool.query('INSERT INTO users (username, password, nickname) VALUES ($1, $2, $3)',
            [username.trim(), password.trim(), nickname.trim()]);
        res.send('<script>alert("회원가입 성공! 로그인해 주세요."); location.href="/login";</script>');
    } catch (e) {
        res.status(500).send("회원가입 중 서버 오류");
    }
});

// --- [ 🟢 로그인 API ] ---
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username.trim(), password.trim()]);
        if (result.rows.length > 0) {
            req.session.user = result.rows[0];
            res.redirect('/');
        } else { res.send('<script>alert("아이디 또는 비밀번호가 틀렸습니다."); history.back();</script>'); }
    } catch (e) { res.status(500).send("로그인 에러"); }
});

// --- [ 🟢 게시판 로드 API ] ---
app.get('/api/posts', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM posts ORDER BY is_notice DESC, created_at DESC');
        res.json({ posts: result.rows || [], currentUser: req.session.user || null });
    } catch (e) { res.status(500).json({ posts: [], error: e.message }); }
});

// --- [ 🟢 게시판 작성 API ] ---
app.post('/api/posts', async (req, res) => {
    if (!req.session.user) return res.send('<script>alert("로그인이 필요합니다."); location.href="/login";</script>');
    const { title, content, isNotice } = req.body;
    const isAdmin = (req.session.user.username === 'ohjungwoo08');
    const isNoticeFlag = (isAdmin && isNotice === 'on');
    try {
        await pool.query('INSERT INTO posts (title, content, author_name, is_notice) VALUES ($1, $2, $3, $4)', 
            [title, content, req.session.user.nickname, isNoticeFlag]);
        res.redirect('/page1');
    } catch (e) { res.status(500).send("작성 에러"); }
});

// --- [ 🟢 게시판 수정 API ] ---
app.put('/api/posts/:id', async (req, res) => {
    if (!req.session.user) return res.status(401).send("Unauthorized");
    const { content } = req.body;
    const isAdmin = (req.session.user.username === 'ohjungwoo08');
    try {
        if (isAdmin) {
            await pool.query('UPDATE posts SET content = $1 WHERE id = $2', [content, req.params.id]);
        } else {
            const result = await pool.query('UPDATE posts SET content = $1 WHERE id = $2 AND author_name = $3',
                [content, req.params.id, req.session.user.nickname]);
            if (result.rowCount === 0) return res.status(403).send("권한 없음");
        }
        res.sendStatus(200);
    } catch (e) { res.status(500).send("수정 실패"); }
});

// --- [ 🟢 게시판 삭제 API ] ---
app.delete('/api/posts/:id', async (req, res) => {
    if (!req.session.user) return res.status(401).send("Unauthorized");
    const isAdmin = (req.session.user.username === 'ohjungwoo08');
    try {
        if (isAdmin) {
            await pool.query('DELETE FROM posts WHERE id = $1', [req.params.id]);
        } else {
            const result = await pool.query('DELETE FROM posts WHERE id = $1 AND author_name = $2', 
                [req.params.id, req.session.user.nickname]);
            if (result.rowCount === 0) return res.status(403).send("권한 없음");
        }
        res.sendStatus(200);
    } catch (e) { res.status(500).send("삭제 실패"); }
});

// --- [ 🚀 여기서부터 새로 덧붙인 제미나이 상담 API 코드 ] ---

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    systemInstruction: "너는 오정우 연구실의 AI 상담원이야. 소장님 정우님은 화학과 미래 가치를 연구하는 열정적인 고3 학생이야. 방문객에게 친절하고 위트 있게, 그리고 화학 관련 질문에는 전문적으로 답변해줘."
});

app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        const result = await model.generateContent(message);
        const response = await result.response;
        res.json({ reply: response.text() });
    } catch (e) {
        console.error(e);
        res.status(500).json({ reply: "상담원이 실험 도구 정리 중이라 답변이 늦어지고 있습니다. 잠시 후 다시 시도해 주세요!" });
    }
});

// --- [ 서버 구동 ] ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 소장님 전용 서버 가동: ${PORT}`));
