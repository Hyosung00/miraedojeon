const express = require('express');
const cors = require('cors');
const neo4j = require('neo4j-driver');

const NEO4J_URI = "neo4j+s://eff16eb9.databases.neo4j.io";
const USERNAME = "neo4j";
const PASSWORD = "_G6MBldCj1gGO_hWjogaMJpleFbjuSZKlMHohGucVrA";
const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(USERNAME, PASSWORD));

const app = express();
const PORT = 8000;

app.use(cors());
app.use(express.json());

// /neo4j/nodes?activeView=target 등 지원
app.get('/neo4j/nodes', async (req, res) => {
  // activeView 파라미터는 현재 무시, 필요시 쿼리 분기 가능
  const session = driver.session();
  try {
    const query = "MATCH (n)-[r]->(t) WHERE n.project = 'facility' AND t.project = 'facility' RETURN n, r, t ORDER BY rand() LIMIT 200";
    const result = await session.run(query);
    const data = [];
    for (const record of result.records) {
      const n_obj = record.get('n');
      const t_obj = record.get('t');
      const r_obj = record.get('r');
      const source = n_obj ? { ...n_obj.properties, __labels: n_obj.labels, __id: n_obj.identity.toString(), id: n_obj.identity.toString() } : {};
      const target = t_obj ? { ...t_obj.properties, __labels: t_obj.labels, __id: t_obj.identity.toString(), id: t_obj.identity.toString() } : {};
      const edge = r_obj ? { ...r_obj.properties } : {};
      const source_id = source.id;
      const target_id = target.id;
      edge["sourceIP"] = source_id;
      edge["targetIP"] = target_id;
      source["id"] = source_id;
      target["id"] = target_id;
      data.push({
        "src_IP": source,
        "dst_IP": target,
        "edge": edge
      });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

app.listen(PORT, () => {
  console.log(`Neo4j API 서버가 포트 ${PORT}에서 실행 중입니다.`);
});
