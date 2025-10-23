const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const INFO_DIR = path.join(__dirname, '../front/public/Console');

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
