const express = require('express');
const { Client } = require('pg');

const app = express();
// Render 환경의 포트 설정을 따릅니다.
const port = process.env.PORT || 3000;

// DB 연결 설정
const dbConfig = {
  connectionString: process.env.DATABASE_URL + "?sslmode=no-verify",
};

app.get('/', async (req, res) => {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    // name과 age를 모두 가져옵니다.
    const result = await client.query('SELECT name, age FROM test LIMIT 1');
    
    if (result.rows.length > 0) {
      const { name, age } = result.rows[0];
      
      // 디자인이 적용된 HTML 응답 (폰트 크기 조절 및 레이아웃)
      res.send(`
        <div style="font-family: 'Pretendard', sans-serif; padding: 40px; line-height: 1.6;">
          <h2 style="font-size: 24px; color: #333; margin-bottom: 10px;">👋 안녕하세요!</h2>
          <div style="background-color: #f8f9fa; border-radius: 12px; padding: 20px; border: 1px solid #e9ecef; display: inline-block;">
            <p style="font-size: 18px; margin: 5px 0;"><strong>이름:</strong> ${name}</p>
            <p style="font-size: 18px; margin: 5px 0;"><strong>나이:</strong> ${age}세</p>
          </div>
          <p style="color: #888; font-size: 13px; margin-top: 20px;">Neon Database 연결 성공</p>
        </div>
      `);
    } else {
      res.send('<h3>데이터가 비어 있습니다.</h3>');
    }
    
    console.log(`조회 성공: ${result.rows[0]?.name}`);
  } catch (err) {
    console.error('DB 에러:', err.message);
    res.status(500).send('서버 오류가 발생했습니다.');
  } finally {
    // 세션이 쌓이지 않도록 연결 종료
    await client.end();
  }
});

app.listen(port, () => {
  console.log(`서버가 포트 ${port}에서 정상 작동 중입니다.`);
});
