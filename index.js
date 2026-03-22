const express = require('express');
const { Client } = require('pg');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

const dbConfig = {
  connectionString: process.env.DATABASE_URL + "?sslmode=no-verify",
};

// [체크!] 파일 이름이 'public.index.html' 이 맞는지 확인하세요.
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public.index.html'));
});

// [체크!] 버튼 눌러서 /page1 로 갈 때 'public.page1.html'을 보여줍니다.
app.get('/page1', (req, res) => {
  res.sendFile(path.join(__dirname, 'public.page1.html'));
});

// [체크!] 버튼 눌러서 /page2 로 갈 때 'public.page2.html'을 보여줍니다.
app.get('/page2', (req, res) => {
  res.sendFile(path.join(__dirname, 'public.page2.html'));
});

// DB에서 데이터 가져오는 창구
app.get('/api/user', async (req, res) => {
  const client = new Client(dbConfig);
  try {
    await client.connect();
    const result = await client.query('SELECT name FROM test LIMIT 1');
    res.json(result.rows[0] || { name: '데이터 없음' });
  } catch (err) {
    res.status(500).json({ error: "DB 연결 실패" });
  } finally {
    await client.end();
  }
});

app.listen(port, () => {
  console.log(`서버가 ${port}번 포트에서 대기 중!`);
});
