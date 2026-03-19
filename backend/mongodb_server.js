const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const config = require('./config');
const fs = require('fs');
const path = require('path');

const app = express();
const readInfoApi = require('./readInfoApi');
const PORT = config.server.mongodb_port;

// Middleware
app.use(cors());
app.use(express.json());
app.use(readInfoApi);

// MongoDB 접속 정보 (.env에서 로드)
const { uri: MONGO_URI, dbName: DB_NAME, collections } = config.mongodb;
const NODES_COLLECTION = collections.nodes;
const EDGES_COLLECTION = collections.edges;

let db;
let nodesCollection;
let edgesCollection;

// MongoDB 연결
async function connectDB() {
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    console.log('✅ MongoDB 연결 성공');

    db = client.db(DB_NAME);
    nodesCollection = db.collection(NODES_COLLECTION);
    edgesCollection = db.collection(EDGES_COLLECTION);
  } catch (error) {
    console.error('❌ MongoDB 연결 실패:', error);
    process.exit(1);
  }
}

// API: 북한 공격 데이터 조회
app.get('/api/north-korea-attacks', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    // 1. 북한 노드 찾기
    const northKoreaNodes = await nodesCollection.find({
      country_iso: "KP"
    }).toArray();

    if (northKoreaNodes.length === 0) {
      return res.json({ attacks: [], message: '북한 노드가 없습니다.' });
    }

    const northKoreaIps = northKoreaNodes.map(node => node.ip);

    // 2. 쿼리 조건 구성 (날짜 필터링 포함)
    const query = {
      dst_ip: { $in: northKoreaIps }
    };

    // 날짜 필터링 조건 추가
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        query.timestamp.$lte = new Date(endDate);
      }
    }

    // 3. 북한을 목표로 하는 공격 엣지 조회
    const attackEdges = await edgesCollection.find(query)
      .sort({ timestamp: 1 })
      .limit(limit)
      .toArray();

    // 4. 관련된 모든 노드 정보 수집
    const allIps = new Set();
    attackEdges.forEach(edge => {
      if (edge.src_ip) allIps.add(edge.src_ip);
      if (edge.dst_ip) allIps.add(edge.dst_ip);
    });

    const relatedNodes = {};
    for (const ip of allIps) {
      const node = await nodesCollection.findOne({ ip: ip });
      if (node) {
        relatedNodes[ip] = node;
      }
    }

    // 5. 공격 데이터 포맷팅
    const attacks = attackEdges.map((edge, index) => {
      const srcNode = relatedNodes[edge.src_ip];
      const dstNode = relatedNodes[edge.dst_ip];

      return {
        id: `attack-${index}`,
        source: {
          name: srcNode?.country_name || 'Unknown',
          ip: edge.src_ip,
          port: edge.src_port,
          lat: srcNode?.lat || 0,
          lon: srcNode?.lng || 0,
          city: srcNode?.city || null,
          country_iso: srcNode?.country_iso || null,
          subnet: srcNode?.subnet || null,
          gateway: srcNode?.gateway || null,
          dns: srcNode?.dns || null
        },
        target: {
          name: dstNode?.country_name || 'Unknown',
          ip: edge.dst_ip,
          port: edge.dst_port,
          lat: dstNode?.lat || 0,
          lon: dstNode?.lng || 0,
          city: dstNode?.city || null,
          country_iso: dstNode?.country_iso || null,
          subnet: dstNode?.subnet || null,
          gateway: dstNode?.gateway || null,
          dns: dstNode?.dns || null
        },
        protocol: edge.protocol,
        count: edge.count,
        timestamp: edge.timestamp,
        status: 'active'
      };
    });

    res.json({
      success: true,
      count: attacks.length,
      attacks: attacks
    });

  } catch (error) {
    console.error('API 에러:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API: CVE 데이터 조회 (CVSS-V3 7.0~9.6, 최대 20개)
app.get('/api/cve-info', async (req, res) => {
  try {
    const filePath = path.join(__dirname, 'Console', 'CVE_2025.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    const rows = JSON.parse(raw);

    const minScore = Number.isFinite(parseFloat(req.query.minScore)) ? parseFloat(req.query.minScore) : 7.0;
    const maxScore = Number.isFinite(parseFloat(req.query.maxScore)) ? parseFloat(req.query.maxScore) : 9.6;
    const limit = Number.isFinite(parseInt(req.query.limit, 10)) ? parseInt(req.query.limit, 10) : 20;

    const cves = (Array.isArray(rows) ? rows : [])
      .map((item) => {
        const scoreRaw = item['CVSS-V3'];
        const score = parseFloat(scoreRaw);
        return {
          id: item['CVE-ID'] || 'UNKNOWN-CVE',
          score,
          severity: item['SEVERITY'] || 'UNKNOWN',
          description: item['DESCRIPTION'] || '',
          cweId: item['CWE-ID'] || 'N/A'
        };
      })
      .filter((item) => Number.isFinite(item.score) && item.score >= minScore && item.score <= maxScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, limit));

    res.json({
      success: true,
      count: cves.length,
      range: { minScore, maxScore },
      cves
    });
  } catch (error) {
    console.error('CVE API 에러:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 서버 시작
async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`🚀 서버가 포트 ${PORT}에서 실행 중입니다.`);
    console.log(`📡 API 엔드포인트: http://localhost:${PORT}/api/north-korea-attacks`);
  });
}

startServer();
