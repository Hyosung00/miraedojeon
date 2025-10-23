const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const INFO_DIR_LOCAL = path.join(__dirname, './Console'); // 로컬
const INFO_DIR_DEPLOY = path.join(__dirname, './Console'); // 배포

// 환경에 따라 경로 선택
const INFO_DIR = process.env.NODE_ENV === 'production' ? INFO_DIR_DEPLOY : INFO_DIR_LOCAL;

// 파일 내용 반환 API
router.get('/api/read-info-file', (req, res) => {
  const fileName = req.query.file;
  if (!fileName) {
    return res.status(400).send('file query required');
  }
  const filePath = path.join(INFO_DIR, fileName);
  // 디렉토리 이탈 방지
  if (!filePath.startsWith(INFO_DIR)) {
    return res.status(403).send('Forbidden');
  }
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(404).send('File not found');
    }
    res.send(data);
  });
});

module.exports = router;
