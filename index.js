const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// 메인 페이지
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public.index.html'));
});

// 페이지 1
app.get('/page1', (req, res) => {
  res.sendFile(path.join(__dirname, 'public.page1.html'));
});

// 페이지 2
app.get('/page2', (req, res) => {
  res.sendFile(path.join(__dirname, 'public.page2.html'));
});

app.listen(port, () => {
  console.log('서버가 정상 작동 중입니다!');
});
