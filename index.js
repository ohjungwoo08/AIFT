const express = require('express');
const { Pool } = require('pg'); // DB와 대화하는 도구
const path = require('path');
const app = express();

// 데이터 해석을 위한 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔴 여기에 아까 메모장에 적어둔 Neon 주소를 넣어주세요!
const connectionString = 'postgresql://유저이름:비밀번호@주소/neondb?sslmode=require';

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false } // Render와 Neon 연결 시 필수 보안 설정
});

// 1. 메인 페이지 연결
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public.index.html')));

// 2. 게시판(Page 1) 연결
app.get('/page1', (req, res) => res.sendFile(path.join(__dirname, 'public.page1.html')));

// 3. 학습 자료실(Page 2) 연결
app.get('/page2', (req, res) => res.sendFile(path.join(__dirname, 'public.page2.html')));

// 4. [API] 게시글 목록 가져오기 (DB에서 데이터를 꺼내옴)
app.get('/api/posts', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM posts ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "데이터를 불러오지 못했습니다." });
  }
});

// 5. [API] 게시글 저장하기 (DB에 글을 집어넣음)
app.post('/api/posts', async (req, res) => {
  const { title, content } = req.body;
  try {
    await pool.query('INSERT INTO posts (title, content) VALUES ($1, $2)', [title, content]);
    res.redirect('/page1'); // 글을 저장한 후 다시 게시판으로 이동
  } catch (err) {
    console.error(err);
    res.status(500).send("글 저장에 실패했습니다.");
  }
});

// 서버 실행
app.listen(process.env.PORT || 3000, () => {
  console.log('오정우 연구실 서버 가동 중...');
});
