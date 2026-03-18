const { Client } = require('pg');

// Render의 환경 변수(DATABASE_URL)를 사용하여 연결 설정
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Neon/Render 연결 시 SSL 설정이 필요합니다.
  }
});

async function queryName() {
  try {
    await client.connect();
    
    // test 테이블에서 name 필드만 조회 (첫 번째 레코드 기준)
    const res = await client.query('SELECT name FROM test LIMIT 1');
    
    if (res.rows.length > 0) {
      const name = res.rows[0].name;
      console.log(`HELLO ${name}`);
    } else {
      console.log('데이터가 없습니다.');
    }
  } catch (err) {
    console.error('연결 중 오류 발생:', err.stack);
  } finally {
    await client.end();
  }
}

queryName();