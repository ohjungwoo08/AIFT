const { Client } = require('pg');

// Render의 환경 변수(DATABASE_URL) 사용
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    // 보안 경고를 방지하고 Neon 서버와의 연결을 허용함
    rejectUnauthorized: false 
  }
});

async function run() {
  try {
    // 1. 데이터베이스 연결
    await client.connect();
    
    // 2. test 테이블에서 name 하나만 조회
    // 데이터가 여러 개일 수 있으므로 LIMIT 1을 사용합니다.
    const res = await client.query('SELECT name FROM test LIMIT 1');
    
    // 3. 결과 출력
    if (res.rows.length > 0) {
      console.log(`HELLO ${res.rows[0].name}`);
    } else {
      console.log('데이터베이스에 레코드가 없습니다.');
    }
  } catch (err) {
    console.error('에러 발생:', err.message);
  } finally {
    // 4. 연결 종료 (프로세스가 깔끔하게 끝나도록 함)
    await client.end();
  }
}

run();
