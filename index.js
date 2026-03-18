const express = require('express');
const { Client } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

// SSL 경고를 없애기 위해 연결 옵션 최적화
const client = new Client({
  connectionString: process.env.DATABASE_URL + "?sslmode=no-verify",
});

async function getName() {
  try {
    await client.connect();
    const res = await client.query('SELECT name FROM test LIMIT 1');
    return res.rows.length > 0 ? res.rows[0].name : '데이터 없음';
  } catch (err) {
    console.error('DB 쿼리 에러:', err.message);
    return '에러 발생';
  } finally {
    // 서버가 계속 떠 있어야 하므로 client.end()는 호출하지 않거나 
    // 매 요청마다 연결/해제를 반복해야 합니다. 
    // 여기서는 테스트를 위해 연결을 유지하지 않고 매번 닫는 방식으로 짭니다.
    await client.end();
  }
}

// 브라우저에서 접속했을 때 보일 화면
app.get('/', async (req, res) => {
  // 매번 새로운 클라이언트를 생성하여 연결 (서버 종료 방지용)
  const tempClient = new Client({
    connectionString: process.env.DATABASE_URL + "?sslmode=no-verify",
  });
  
  try {
    await tempClient.connect();
    const result = await tempClient.query('SELECT name FROM test LIMIT 1');
    const name = result.rows.length > 0 ? result.rows[0].name : '이름 없음';
    res.send(`<h1>HELLO ${name}</p>`);
    console.log(`출력 완료: HELLO ${name}`);
  } catch (err) {
    res.status(500).send('DB 연결 에러');
  } finally {
    await tempClient.end();
  }
});

app.listen(port, () => {
  console.log(`서버가 포트 ${port}에서 실행 중입니다.`);
});
