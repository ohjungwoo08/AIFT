const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// 1. 메인 페이지 접속 시 (https://aift-o2u2.onrender.com/)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public.index.html'));
});

// 2. 페이지 1 접속 시 (https://aift-o2u2.onrender.com/page1)
app.get('/page1', (req, res) => {
  res.sendFile(path.join(__dirname, 'public.page1.html'));
});

// 3. 페이지 2 접속 시 (https://aift-o2u2.onrender.com/page2)
app.get('/page2', (req, res) => {
  res.sendFile(path.join(__dirname, 'public.page2.html'));
});

app.listen(port, () => {
  console.log(`서버가 포트 ${port}에서 작동 중입니다!`);
});
