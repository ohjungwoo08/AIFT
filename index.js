const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// 메인 페이지 접속 시 (/)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public.index.html'));
});

// 페이지 1 접속 시 (/page1) -> 이 부분이 없으면 '찾을 수 없음'이 뜹니다!
app.get('/page1', (req, res) => {
  res.sendFile(path.join(__dirname, 'public.page1.html'));
});

// 페이지 2 접속 시 (/page2)
app.get('/page2', (req, res) => {
  res.sendFile(path.join(__dirname, 'public.page2.html'));
});

app.listen(port, () => {
  console.log(`서버가 ${port}번 포트에서 실행 중입니다.`);
});
