const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public.index.html'));
});

app.get('/page1', (req, res) => {
  res.sendFile(path.join(__dirname, 'public.page1.html'));
});

app.get('/page2', (req, res) => {
  res.sendFile(path.join(__dirname, 'public.page2.html'));
});

app.listen(port, () => console.log('서버 실행 중!'));
