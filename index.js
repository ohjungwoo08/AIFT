const express = require('express');
const { Client } = require('pg');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// 1. 데이터베이스 연결 설정 (Render의 DATABASE_URL 사용)
const dbConfig = {
  connectionString: process.env.DATABASE_URL + "?sslmode=no-verify",
};

// 2. 메인 페이지 연결 (public.index.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public.index.html'));
});

// 3. 페이지 1 연결 (public.page1.html)
app.get('/page1', (req, res) => {
  res.sendFile(path.join(__dirname, 'public.page1.html'));
});

// 4. 페이지 2 연결 (public.page2.html)
app.get('/page2', (req, res) => {
  res.sendFile(path.join(__dirname, 'public.page2.html'));
});

// 5. 데이터를 가져오는 통로 (API)
// 이 부분이 있어야 page1.html에서 "정보를 가져오지 못했다"는 에러가 안 납니다!
app.get('/api/user', async (req, res) => {
  const client = new Client(dbConfig);
  try {
    await client.connect();
    // test 테이블에서 name 컬럼의 첫 번째 레코드를 가져옵니다.
    const result = await client.query('SELECT name FROM test LIMIT 1');
    
    if (result.rows.length > 0) {
      res.json(result.rows[0]); // { "name": "오정우" } 형태의 데이터를 보냅니다.
    } else {
      res.json({ name: '데이터 없음' });
    }
  } catch (err) {
    console.error("DB 에러 발생:", err.message);
    res.status(500).json({ error: "데이터베이스 연결에 실패했습니다." });
  } finally {
    await client.end();
  }
});

// 6. 서버 시작
app.listen(port, () => {
  console.log(`서버가 포트 ${port}에서 정상적으로 실행 중입니다!`);
});
