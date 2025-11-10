// src/OffensiveStrategy.jsx
import { useState, useEffect, useRef, useMemo } from "react";
import neo4j from "neo4j-driver";
import { DataSet } from "vis-data";
import { Network } from "vis-network/standalone";
import "vis-network/styles/vis-network.css";
import { Box, Typography, Card, CardContent, IconButton, Button, Dialog, DialogContent, Paper } from '@mui/material';
import { MinusOutlined, PlusOutlined, FundOutlined, InfoOutlined } from '@ant-design/icons';
import TreatAnalysis from '../ThreatAnalysis/TreatAnalysis';
import { usePopup } from '../../../context/PopupContext';
import './OS.css';

// 노드 타입 이미지
const getNodeImage = (node) => {
  let type = node?.nodeType || node?.type || node?.properties?.type || node?.props?.type;
  if (!type && node?.title && typeof node.title === 'string') {
    try { const parsed = JSON.parse(node.title); if (parsed.type) type = parsed.type; } catch {}
  }
  const t = String(type || '').toLowerCase();
  if (t === 'switch') return '/image/switch.png';
  if (t === 'workstation') return '/image/workstation.png';
  if (t === 'server') return '/image/server.png';
  if (t === 'router') return '/image/router.png';
  if (t === 'firewall') return '/image/firewall.png';
  if (t === 'laptop') return '/image/laptop.png';
  if (t === 'printer') return '/image/printer.png';
  if (t === 'sensor') return '/image/sensor.png';
  if (t === 'plc') return '/image/plc.png';
  return '/image/switch.png';
};

const driver = neo4j.driver(
  "neo4j+s://eff16eb9.databases.neo4j.io",
  neo4j.auth.basic("neo4j", "_G6MBldCj1gGO_hWjogaMJpleFbjuSZKlMHohGucVrA")
);

async function fetchData(queryString = "MATCH (n) RETURN n LIMIT 25", params = {}) {
  const session = driver.session();
  try { const result = await session.run(queryString, params); return result.records; }
  finally { await session.close(); }
}

function OffensiveStrategy({ deviceElementId, onSelectDevice }) {
  const { popups, openPopup, closePopup } = usePopup();
  const treatAnalysisOpen = popups.treatAnalysis;

  useEffect(() => { /* 팝업 상태만 동기화 */ }, [popups.treatAnalysis]);

  // Device Topology (메인)
  const topologyRef = useRef(null);
  const topologyNetRef = useRef(null);
  const [topologyData, setTopologyData] = useState({ nodes: [], edges: [] });
  const initialTopologyRef = useRef(null);
  const nodePositionsRef = useRef(null);

  // Attack Path Data
  const [attackGraphData, setAttackGraphData] = useState({ nodes: [], edges: [] });
  const [loadingAttack, setLoadingAttack] = useState(false);
  const [selectedStartNode, setSelectedStartNode] = useState(null);

  // 우측 패널 상태
  const [pathList, setPathList] = useState([]);
  const [selectedPath, setSelectedPath] = useState(null);
  const [typedLogText, setTypedLogText] = useState("");
  const typingTimerRef = useRef(null);

  // 애니메이션 상태
  const [particlePosition, setParticlePosition] = useState(0); // 0~1 사이의 값으로 경로 진행도 표시
  const [isAnimating, setIsAnimating] = useState(false);
  const animationFrameRef = useRef(null);
  const animationActiveRef = useRef(false);
  const canvasRef = useRef(null);

  // 정보 팝업 상태
  const [infoPopupOpen, setInfoPopupOpen] = useState(false);
  const [calculationLogPopupOpen, setCalculationLogPopupOpen] = useState(false);
  const [nodeDetailPopupOpen, setNodeDetailPopupOpen] = useState(false);
  const [selectedNodeDetail, setSelectedNodeDetail] = useState(null);

  // 내부 선택 device elementId (부모 미제공 시)
  const [internalSelected, setInternalSelected] = useState(null);
  const effectiveElementId = deviceElementId ?? internalSelected;

  // 재사용 refs
  const onSelectDeviceRef = useRef(onSelectDevice);
  const attackGraphDataRef = useRef(attackGraphData);
  const loadingAttackRef = useRef(loadingAttack);
  useEffect(() => { attackGraphDataRef.current = attackGraphData; }, [attackGraphData]);
  useEffect(() => { loadingAttackRef.current = loadingAttack; }, [loadingAttack]);
  useEffect(() => { onSelectDeviceRef.current = onSelectDevice; }, [onSelectDevice]);

  // Device elementId -> Physical id
  const resolvePhysicalIdByElementId = async (elementId) => {
    if (!elementId) return null;
    const recs = await fetchData(
      `MATCH (p:Physical {id:$pid, project:'multi-layer'}) RETURN id(p) AS pid`,
      { pid: `ml:${elementId}` }
    );
    if (!recs?.length) return null;
    const v = recs[0].get('pid');
    return neo4j.isInt?.(v) ? v.toNumber() : v;
  };

  // 1) 초기 Device 토폴로지 로드
  useEffect(() => {
    const query = `
      MATCH (d:Device{project:"facility"})
      OPTIONAL MATCH (d)-[r:CONNECTED{project:"facility"}]-(d2:Device{project:"facility"})
      RETURN d, r, d2
    `;
    fetchData(query).then((recs) => {
      const nodesMap = new Map();
      const edgesMap = new Map();
      const idOf = (entity) => {
        if (!entity) return null; const id = entity.identity; return id && typeof id.toNumber === 'function' ? id.toNumber() : id;
      };
      const labelOf = (entity) => {
        if (!entity) return ""; const props = entity.properties || {};
        return props.name || props.label || (entity.labels && entity.labels[0]) || props.id || String(idOf(entity));
      };
      for (const rec of recs) {
        const d = rec.get('d'); const r = rec.get('r'); const d2 = rec.get('d2');
        const dId = idOf(d);
        if (d && dId != null && !nodesMap.has(dId)) {
          nodesMap.set(dId, {
            id: dId, label: labelOf(d), elementId: d.elementId, group: 'Device',
            title: JSON.stringify(d.properties || {}, null, 2), shape: 'image', image: getNodeImage(d),
            size: 12, color: { border: '#205AAA' }, font: { color: '#7c3aed' }
          });
        }
        if (d2) {
          const d2Id = idOf(d2);
          if (d2Id != null && !nodesMap.has(d2Id)) {
            nodesMap.set(d2Id, {
              id: d2Id, label: labelOf(d2), elementId: d2.elementId, group: 'Device',
              title: JSON.stringify(d2.properties || {}, null, 2), shape: 'image', image: getNodeImage(d2),
              size: 12, color: { border: '#205AAA' }, font: { color: '#7c3aed' }
            });
          }
          if (r && dId != null && d2Id != null) {
            const a = Math.min(dId, d2Id); const b = Math.max(dId, d2Id); const edgeKey = `${a}-${b}`;
            if (!edgesMap.has(edgeKey)) edgesMap.set(edgeKey, { id: edgeKey, from: a, to: b, color: { color: '#848484' }, width: 1 });
          }
        }
      }
      const nodesArr = Array.from(nodesMap.values());
      const edgesArr = Array.from(edgesMap.values());
      setTopologyData({ nodes: nodesArr, edges: edgesArr });
      if (!initialTopologyRef.current) {
        initialTopologyRef.current = { nodes: nodesArr.map(n => ({ ...n })), edges: edgesArr.map(e => ({ ...e })) };
      }
    }).catch(console.error);
  }, []);

  // 2) 공격 그래프 로드(시작노드 선택 시)
  useEffect(() => {
    let canceled = false;
    const toNum = (v) => (neo4j.isInt?.(v) ? v.toNumber() : v);
    if (!effectiveElementId) {
      const prev = attackGraphDataRef.current || { nodes: [], edges: [] };
      if ((prev.nodes?.length) || (prev.edges?.length)) setAttackGraphData({ nodes: [], edges: [] });
      if (loadingAttackRef.current) setLoadingAttack(false);
      if (selectedStartNode !== null) setSelectedStartNode(null);
      setPathList([]);
      return;
    }
    const targetPhysicalId = `ml:${effectiveElementId}`;
    if (!loadingAttackRef.current) setLoadingAttack(true);
    const startId = selectedStartNode;

    const query = `
      // 1~4개의 우회 엔드포인트를 경유하는 경로 생성
      // 무방향 관계(-) 사용, 엔드포인트 중복 불가, 중간 노드(Switch/Router/Firewall 등) 중복 허용
      MATCH (startNode:Physical {project:'multi-layer'}), (targetNode:Physical {id:$targetPhysicalId, project:'multi-layer'})
      WHERE id(startNode) = $startId
      
      // 우회 엔드포인트 후보 찾기 (실제 엔드포인트만: Laptop, Workstation, Server, Printer, Sensor, PLC 등)
      MATCH (viaCandidate:Physical {project:'multi-layer'})
      WHERE viaCandidate <> startNode AND viaCandidate <> targetNode 
        AND properties(viaCandidate).type IS NOT NULL
        AND toLower(toString(properties(viaCandidate).type)) IN [
          'laptop', 'workstation', 'server', 'printer', 'sensor', 'plc', 
          'computer', 'pc', 'host', 'endpoint', 'device'
        ]
      
      WITH startNode, targetNode, collect(viaCandidate)[0..50] AS viaNodes
      
      CALL {
        WITH startNode, targetNode, viaNodes
        
        // 1개 우회 노드 경로
        UNWIND viaNodes AS via1
        MATCH p1 = allShortestPaths((startNode)-[:CONNECTED*1..8]-(via1))
        WHERE ALL(r IN relationships(p1) WHERE r.project = 'multi-layer')
        WITH startNode, targetNode, via1, p1 ORDER BY length(p1) LIMIT 1
        MATCH p2 = allShortestPaths((via1)-[:CONNECTED*1..8]-(targetNode))
        WHERE ALL(r IN relationships(p2) WHERE r.project = 'multi-layer')
        WITH startNode AS start, targetNode AS target, 
             nodes(p1) + nodes(p2)[1..] AS pathNodes, 
             relationships(p1) + relationships(p2) AS pathRels
        ORDER BY size(pathRels) LIMIT 1
        RETURN start, target, pathNodes, pathRels, 1 AS viaCount
        
        UNION
        
        // 2개 우회 노드 경로
        WITH startNode, targetNode, viaNodes
        UNWIND viaNodes AS via1
        WITH startNode, targetNode, viaNodes, via1
        UNWIND [v IN viaNodes WHERE v <> via1] AS via2
        MATCH p1 = allShortestPaths((startNode)-[:CONNECTED*1..6]-(via1))
        WHERE ALL(r IN relationships(p1) WHERE r.project = 'multi-layer')
        WITH startNode, targetNode, via1, via2, nodes(p1) AS p1Nodes, relationships(p1) AS p1Rels
        ORDER BY size(p1Rels) LIMIT 1
        MATCH p2 = allShortestPaths((via1)-[:CONNECTED*1..6]-(via2))
        WHERE ALL(r IN relationships(p2) WHERE r.project = 'multi-layer')
          AND NONE(n IN nodes(p2) WHERE n IN p1Nodes AND n <> via1)
        WITH startNode, targetNode, via2, p1Nodes, p1Rels, nodes(p2) AS p2Nodes, relationships(p2) AS p2Rels
        ORDER BY size(p2Rels) LIMIT 1
        MATCH p3 = allShortestPaths((via2)-[:CONNECTED*1..6]-(targetNode))
        WHERE ALL(r IN relationships(p3) WHERE r.project = 'multi-layer')
        WITH startNode AS start, targetNode AS target,
             p1Nodes + p2Nodes[1..] + nodes(p3)[1..] AS pathNodes, 
             p1Rels + p2Rels + relationships(p3) AS pathRels
        ORDER BY size(pathRels) LIMIT 1
        RETURN start, target, pathNodes, pathRels, 2 AS viaCount
        
        UNION
        
        // 3개 우회 노드 경로  
        WITH startNode, targetNode, viaNodes
        UNWIND viaNodes AS via1
        WITH startNode, targetNode, viaNodes, via1
        UNWIND [v IN viaNodes WHERE v <> via1] AS via2
        WITH startNode, targetNode, viaNodes, via1, via2
        UNWIND [v IN viaNodes WHERE v <> via1 AND v <> via2] AS via3
        MATCH p1 = allShortestPaths((startNode)-[:CONNECTED*1..5]-(via1))
        WHERE ALL(r IN relationships(p1) WHERE r.project = 'multi-layer')
        WITH startNode, targetNode, via1, via2, via3, nodes(p1) AS p1Nodes, relationships(p1) AS p1Rels
        ORDER BY size(p1Rels) LIMIT 1
        MATCH p2 = allShortestPaths((via1)-[:CONNECTED*1..5]-(via2))
        WHERE ALL(r IN relationships(p2) WHERE r.project = 'multi-layer')
          AND NONE(n IN nodes(p2) WHERE n IN p1Nodes AND n <> via1)
        WITH startNode, targetNode, via2, via3, p1Nodes, p1Rels, nodes(p2) AS p2Nodes, relationships(p2) AS p2Rels
        ORDER BY size(p2Rels) LIMIT 1
        MATCH p3 = allShortestPaths((via2)-[:CONNECTED*1..5]-(via3))
        WHERE ALL(r IN relationships(p3) WHERE r.project = 'multi-layer')
          AND NONE(n IN nodes(p3) WHERE n IN (p1Nodes + p2Nodes[1..]) AND n <> via2)
        WITH startNode, targetNode, via3, p1Nodes, p1Rels, p2Nodes, p2Rels, nodes(p3) AS p3Nodes, relationships(p3) AS p3Rels
        ORDER BY size(p3Rels) LIMIT 1
        MATCH p4 = allShortestPaths((via3)-[:CONNECTED*1..5]-(targetNode))
        WHERE ALL(r IN relationships(p4) WHERE r.project = 'multi-layer')
        WITH startNode AS start, targetNode AS target,
             p1Nodes + p2Nodes[1..] + p3Nodes[1..] + nodes(p4)[1..] AS pathNodes, 
             p1Rels + p2Rels + p3Rels + relationships(p4) AS pathRels
        ORDER BY size(pathRels) LIMIT 1
        RETURN start, target, pathNodes, pathRels, 3 AS viaCount
        
        UNION
        
        // 4개 우회 노드 경로
        WITH startNode, targetNode, viaNodes
        UNWIND viaNodes AS via1
        WITH startNode, targetNode, viaNodes, via1
        UNWIND [v IN viaNodes WHERE v <> via1] AS via2
        WITH startNode, targetNode, viaNodes, via1, via2
        UNWIND [v IN viaNodes WHERE v <> via1 AND v <> via2] AS via3
        WITH startNode, targetNode, viaNodes, via1, via2, via3
        UNWIND [v IN viaNodes WHERE v <> via1 AND v <> via2 AND v <> via3] AS via4
        MATCH p1 = allShortestPaths((startNode)-[:CONNECTED*1..4]-(via1))
        WHERE ALL(r IN relationships(p1) WHERE r.project = 'multi-layer')
        WITH startNode, targetNode, via1, via2, via3, via4, nodes(p1) AS p1Nodes, relationships(p1) AS p1Rels
        ORDER BY size(p1Rels) LIMIT 1
        MATCH p2 = allShortestPaths((via1)-[:CONNECTED*1..4]-(via2))
        WHERE ALL(r IN relationships(p2) WHERE r.project = 'multi-layer')
          AND NONE(n IN nodes(p2) WHERE n IN p1Nodes AND n <> via1)
        WITH startNode, targetNode, via2, via3, via4, p1Nodes, p1Rels, nodes(p2) AS p2Nodes, relationships(p2) AS p2Rels
        ORDER BY size(p2Rels) LIMIT 1
        MATCH p3 = allShortestPaths((via2)-[:CONNECTED*1..4]-(via3))
        WHERE ALL(r IN relationships(p3) WHERE r.project = 'multi-layer')
          AND NONE(n IN nodes(p3) WHERE n IN (p1Nodes + p2Nodes[1..]) AND n <> via2)
        WITH startNode, targetNode, via3, via4, p1Nodes, p1Rels, p2Nodes, p2Rels, nodes(p3) AS p3Nodes, relationships(p3) AS p3Rels
        ORDER BY size(p3Rels) LIMIT 1
        MATCH p4 = allShortestPaths((via3)-[:CONNECTED*1..4]-(via4))
        WHERE ALL(r IN relationships(p4) WHERE r.project = 'multi-layer')
          AND NONE(n IN nodes(p4) WHERE n IN (p1Nodes + p2Nodes[1..] + p3Nodes[1..]) AND n <> via3)
        WITH startNode, targetNode, via4, p1Nodes, p1Rels, p2Nodes, p2Rels, p3Nodes, p3Rels, nodes(p4) AS p4Nodes, relationships(p4) AS p4Rels
        ORDER BY size(p4Rels) LIMIT 1
        MATCH p5 = allShortestPaths((via4)-[:CONNECTED*1..4]-(targetNode))
        WHERE ALL(r IN relationships(p5) WHERE r.project = 'multi-layer')
        WITH startNode AS start, targetNode AS target,
             p1Nodes + p2Nodes[1..] + p3Nodes[1..] + p4Nodes[1..] + nodes(p5)[1..] AS pathNodes,
             p1Rels + p2Rels + p3Rels + p4Rels + relationships(p5) AS pathRels
        ORDER BY size(pathRels) LIMIT 1
        RETURN start, target, pathNodes, pathRels, 4 AS viaCount
      }
      
      // 노드 정보 수집
      WITH start, target, pathNodes, pathRels, viaCount, range(0, size(pathNodes)-1) AS indices
      UNWIND indices AS idx
      WITH start, target, pathNodes, pathRels, viaCount, idx, pathNodes[idx] AS n
      WITH start, target, pathNodes, pathRels, viaCount, idx, n,
           COUNT { (n)-[:CONNECTED {project:'multi-layer'}]-() } AS deg,
           properties(n).type AS nodeType,
           properties(n).ip AS nodeIp,
           properties(n).name AS nodeName,
           properties(n).id AS nodeId
      OPTIONAL MATCH (n)-[:HOSTS]->(l:Logical)
      OPTIONAL MATCH (l)-[:HAS_CVE]->(c:CveDetail)
      WITH start, target, pathRels, viaCount, idx, n, deg, nodeType, nodeIp, nodeName, nodeId,
           collect(DISTINCT c) AS cList
      WITH start, target, pathRels, viaCount, idx, n, deg, nodeType, nodeIp, nodeName, nodeId,
           [ci IN cList WHERE ci IS NOT NULL | { id: id(ci), props: properties(ci) }] AS cveInfos,
           [ci IN cList WHERE ci IS NOT NULL | coalesce(ci.cve, ci.cveId, ci.id, ci.name)] AS cveIdList,
           [ci IN cList WHERE ci IS NOT NULL |
              coalesce(toFloat(ci.cvss3), toFloat(ci.cvss), toFloat(ci.baseScore), toFloat(ci.score), toFloat(ci.score_value), toFloat(ci.severity), toFloat(ci.severity_score))
           ] AS rawScores
      WITH start, target, pathRels, viaCount, idx, n, deg, nodeType, nodeIp, nodeName, nodeId, cveInfos, cveIdList,
           [s IN rawScores WHERE s IS NOT NULL] AS scoreVals
      WITH start, target, pathRels, viaCount, idx,
           {
             id: id(n), props: properties(n), labels: labels(n), deg: deg, nodeType: nodeType,
             ip: nodeIp, name: nodeName, nodeId: nodeId, cveInfos: cveInfos, vulnList: cveIdList,
             vulnScore: CASE WHEN size(scoreVals) > 0 THEN
               CASE WHEN (reduce(s=0.0, x IN scoreVals | s + x) / size(scoreVals)) > 10.0
                 THEN round(100.0 * ((reduce(s=0.0, x IN scoreVals | s + x) / size(scoreVals)) / 10.0)) / 100.0
               ELSE round(100.0 * (reduce(s=0.0, x IN scoreVals | s + x) / size(scoreVals))) / 100.0 END
             ELSE NULL END
           } AS nodeInfo
      ORDER BY idx
      WITH start, target, pathRels, viaCount, collect(nodeInfo) AS orderedNodeInfos
      RETURN start, target, pathRels, orderedNodeInfos, viaCount
      ORDER BY viaCount
      LIMIT 10
    `;

    fetchData(query, { targetPhysicalId, startId }).then((recs) => {
      if (canceled) return;
      if (!recs || recs.length === 0) {
        const fallbackNodes = [];
        if (startId != null) fallbackNodes.push({ id: startId, label: 'Start', group: 'StartPhysical', title: '', shape: 'image', image: getNodeImage({}), size: 20, color: { border: '#00CC00' }, font: { color: '#7c3aed' }, properties: {} });
        setAttackGraphData({ nodes: fallbackNodes, edges: [], pathsMap: new Map(), targetNodeId: null, allStartNodes: new Set([startId]), nodeConnections: new Map() });
        setPathList([]);
        if (loadingAttackRef.current) setLoadingAttack(false);
        return;
      }

      // 병합 그래프 구성
      const nodesMap = new Map();
      const edgesSet = new Set();
      const allEdges = [];
      let targetId = null;
      const pathsArr = [];
      const nodePathPositions = new Map();

      for (let pathIdx = 0; pathIdx < recs.length; pathIdx++) {
        const rec = recs[pathIdx];
        const targetNode = rec.get('target');
        const orderedNodeInfos = rec.get('orderedNodeInfos') || [];
        const pathRels = rec.get('pathRels') || [];
        const viaCount = rec.get('viaCount') || 0;
        targetId = targetId ?? (targetNode?.identity ? toNum(targetNode.identity) : null);

        console.log(`\n[경로 ${pathIdx + 1}] 우회 노드 수: ${viaCount}개`);

        // 엔드포인트/연속 중복 제거
        const endpointIds = new Set();
        const filteredNodeInfos = [];
        const endpointOccurrences = new Map(); // 엔드포인트가 몇 번 나타났는지 추적

        for (let idx = 0; idx < orderedNodeInfos.length; idx++) {
          const nodeInfo = orderedNodeInfos[idx];
          const nodeId = toNum(nodeInfo.id);
          const nodeType = nodeInfo.nodeType; const typeStr = nodeType ? String(nodeType).toLowerCase() : '';
          const isSwitchOrRouter = typeStr.includes('switch') || typeStr.includes('router');

          if (filteredNodeInfos.length > 0) {
            const lastNodeId = toNum(filteredNodeInfos[filteredNodeInfos.length - 1].id);
            if (nodeId === lastNodeId) continue;
          }

          if (isSwitchOrRouter) {
            // Switch와 Router는 항상 추가 (중간 노드)
            filteredNodeInfos.push(nodeInfo);
          } else {
            // 엔드포인트는 한 번만 추가
            if (!endpointIds.has(nodeId)) {
              endpointIds.add(nodeId);
              filteredNodeInfos.push(nodeInfo);
              endpointOccurrences.set(nodeId, 1);
            } else {
              // 엔드포인트 중복 발견
              const count = endpointOccurrences.get(nodeId) || 0;
              endpointOccurrences.set(nodeId, count + 1);
              console.warn(`⚠️ [경로 ${pathIdx + 1}] 엔드포인트 중복 발견: 노드 ${nodeId} (${nodeInfo.name || 'Unknown'}) - ${count + 1}번째`);
            }
          }
        }
        if (filteredNodeInfos.length < 2) continue;

        // 목표 노드 이후의 노드들을 제거 (경로는 목표 노드에서 끝나야 함)
        let targetNodeIndex = -1;
        for (let i = 0; i < filteredNodeInfos.length; i++) {
          if (toNum(filteredNodeInfos[i].id) === targetId) {
            targetNodeIndex = i;
            break;
          }
        }

        // 목표 노드가 발견되면 그 이후의 모든 노드 제거
        const trimmedNodeInfos = targetNodeIndex >= 0
          ? filteredNodeInfos.slice(0, targetNodeIndex + 1)
          : filteredNodeInfos;

        if (targetNodeIndex >= 0 && targetNodeIndex < filteredNodeInfos.length - 1) {
          const removedCount = filteredNodeInfos.length - trimmedNodeInfos.length;
          console.log(`[경로 ${pathIdx + 1}] 목표 노드 이후 ${removedCount}개 노드 제거:`, {
            원본길이: filteredNodeInfos.length,
            트리밍후: trimmedNodeInfos.length,
            목표노드위치: targetNodeIndex,
            제거된노드: filteredNodeInfos.slice(targetNodeIndex + 1).map(n => {
              const id = toNum(n.id);
              const label = n.name || n.props?.name || n.props?.label || String(id);
              return `${label}(${id})`;
            })
          });
        } else if (targetNodeIndex < 0) {
          console.warn(`⚠️ [경로 ${pathIdx + 1}] 경로에서 목표 노드(${targetId})를 찾을 수 없습니다!`);
        }

        // path list용 축약 저장
        const pathNodesForList = trimmedNodeInfos.map((ni) => {
          const originalId = toNum(ni.id);
          const label = ni.name || ni.props?.name || ni.props?.label || (Array.isArray(ni.labels) ? ni.labels[0] : undefined) || ni.nodeId || ni.props?.id || String(originalId);
          return {
            id: originalId,
            label,
            props: {
              ...(ni.props || {}),
              cveInfos: ni.cveInfos || [], vulnList: ni.vulnList || [], vulnScore: ni.vulnScore ?? null
            },
            nodeType: ni.nodeType || null,
            ip: ni.ip || (ni.props?.ip ?? null)
          };
        });

        // 경로 내 시작/목표 노드 중복 체크
        const startNodeCount = pathNodesForList.filter(n => n.id === startId).length;
        const targetNodeCount = pathNodesForList.filter(n => n.id === targetId).length;

        // 엔드포인트 중복 체크 (시작/목표 노드 제외)
        const endpointsInPath = pathNodesForList.filter(n => {
          const typeStr = (n.nodeType ? String(n.nodeType) : '').toLowerCase();
          const isSwitchOrRouter = typeStr.includes('switch') || typeStr.includes('router');
          return !isSwitchOrRouter && n.id !== startId && n.id !== targetId;
        });

        const endpointCountMap = new Map();
        endpointsInPath.forEach(ep => {
          endpointCountMap.set(ep.id, (endpointCountMap.get(ep.id) || 0) + 1);
        });

        const duplicateEndpoints = Array.from(endpointCountMap.entries())
          .filter(([id, count]) => count > 1)
          .map(([id, count]) => {
            const node = pathNodesForList.find(n => n.id === id);
            return `${node?.label}(${id}): ${count}번`;
          });

        // 경로의 첫 번째와 마지막 노드 확인
        const firstNode = pathNodesForList[0];
        const lastNode = pathNodesForList[pathNodesForList.length - 1];
        const isFirstNodeStart = firstNode?.id === startId;
        const isLastNodeTarget = lastNode?.id === targetId;

        // 우회 노드 개수 검증 (1~4개)
        const actualViaCount = endpointsInPath.length;
        const viaCountValid = actualViaCount >= 1 && actualViaCount <= 4;

        // 모든 검증 조건
        const hasIssue = !isFirstNodeStart || !isLastNodeTarget || startNodeCount !== 1 || targetNodeCount !== 1 || duplicateEndpoints.length > 0 || !viaCountValid;

        // 경로의 엣지 정보 생성
        const pathEdges = [];
        for (let i = 0; i < pathNodesForList.length - 1; i++) {
          pathEdges.push(`${pathNodesForList[i].label}(${pathNodesForList[i].id}) → ${pathNodesForList[i + 1].label}(${pathNodesForList[i + 1].id})`);
        }

        console.log(`[경로 ${pathIdx + 1}] 노드 검증:`, {
          totalNodes: pathNodesForList.length,
          우회노드수: `${actualViaCount}개 (Neo4j: ${viaCount}) ${viaCountValid ? '✅' : '⚠️ 1~4개 범위 벗어남'}`,
          우회노드목록: endpointsInPath.map(ep => `${ep.label}(${ep.id})`).join(', '),
          firstNode: `${firstNode?.label}(${firstNode?.id}) ${isFirstNodeStart ? '✅ 시작노드' : '⚠️ 시작노드 아님!'}`,
          lastNode: `${lastNode?.label}(${lastNode?.id}) ${isLastNodeTarget ? '✅ 목표노드' : '⚠️ 목표노드 아님!'}`,
          startNodeId: startId,
          targetNodeId: targetId,
          startNodeCount: `${startNodeCount}번 ${startNodeCount === 1 ? '✅' : '⚠️'}`,
          targetNodeCount: `${targetNodeCount}번 ${targetNodeCount === 1 ? '✅' : '⚠️'}`,
          엔드포인트중복: duplicateEndpoints.length > 0 ? `⚠️ ${duplicateEndpoints.join(', ')}` : '✅ 중복 없음',
          nodeIds: pathNodesForList.map(n => n.id),
          경로: pathNodesForList.map(n => `${n.label}(${n.id})`).join(' → '),
          엣지수: pathEdges.length,
          엣지목록: pathEdges,
          status: hasIssue ? '⚠️⚠️⚠️ 문제 발견! ⚠️⚠️⚠️' : '✅ 정상'
        });

        if (!isFirstNodeStart) {
          console.error(`❌ [경로 ${pathIdx + 1}] 첫 번째 노드가 시작 노드가 아닙니다!`, {
            expected: `시작 노드 ID ${startId}`,
            actual: `${firstNode?.label}(${firstNode?.id})`
          });
        }
        if (!isLastNodeTarget) {
          console.error(`❌ [경로 ${pathIdx + 1}] 마지막 노드가 목표 노드가 아닙니다!`, {
            expected: `목표 노드 ID ${targetId}`,
            actual: `${lastNode?.label}(${lastNode?.id})`
          });
        }
        if (startNodeCount > 1) {
          console.warn(`⚠️ [경로 ${pathIdx + 1}] 시작 노드(${startId})가 ${startNodeCount}번 나타남!`);
        }
        if (targetNodeCount > 1) {
          console.warn(`⚠️ [경로 ${pathIdx + 1}] 목표 노드(${targetId})가 ${targetNodeCount}번 나타남!`);
        }
        if (duplicateEndpoints.length > 0) {
          console.error(`❌ [경로 ${pathIdx + 1}] 엔드포인트 중복 발견!`, duplicateEndpoints);
        }
        if (!viaCountValid) {
          console.error(`❌ [경로 ${pathIdx + 1}] 우회 노드 개수가 범위를 벗어남! (${actualViaCount}개, 허용: 1~4개)`);
        }
        pathsArr.push(pathNodesForList);

        for (let i = 0; i < trimmedNodeInfos.length; i++) {
          const nodeInfo = trimmedNodeInfos[i];
          const originalId = toNum(nodeInfo.id);
          if (!nodePathPositions.has(originalId)) nodePathPositions.set(originalId, []);
          nodePathPositions.get(originalId).push(i);

          const isStart = originalId === startId; const isTarget = originalId === targetId;
          let nodeColor, nodeSize, nodeGroup;
          if (isTarget) { nodeColor = { border: '#CC0000' }; nodeSize = 25; nodeGroup = 'TargetPhysical'; }
          else if (isStart) { nodeColor = { border: '#00CC00' }; nodeSize = 20; nodeGroup = 'StartPhysical'; }
          else {
            const typeStr = (nodeInfo.nodeType ? String(nodeInfo.nodeType) : '').toLowerCase();
            const isVia = !(typeStr.includes('switch') || typeStr.includes('router'));
            if (isVia) { nodeColor = { border: '#FF8C00' }; nodeSize = 18; nodeGroup = 'ViaPhysical'; }
            else { nodeColor = { border: '#205AAA' }; nodeSize = 15; nodeGroup = 'Physical'; }
          }
          if (!nodesMap.has(originalId)) {
            const nodeData = {
              id: originalId,
              label: nodeInfo.name || nodeInfo.props?.name || nodeInfo.props?.label || (Array.isArray(nodeInfo.labels) ? nodeInfo.labels[0] : undefined) || nodeInfo.nodeId || nodeInfo.props?.id || String(originalId),
              group: nodeGroup,
              title: JSON.stringify({ ...(nodeInfo.props || {}), vulnList: nodeInfo.vulnList || [], vulnScore: nodeInfo.vulnScore ?? null }, null, 2),
              shape: 'image', image: getNodeImage(nodeInfo), size: nodeSize, color: nodeColor,
              properties: { ...(nodeInfo.props || {}), cveInfos: nodeInfo.cveInfos || [], vulnList: nodeInfo.vulnList || [], vulnScore: nodeInfo.vulnScore ?? null },
              font: { color: '#7c3aed' }
            };
            if (!isTarget && !isStart) { nodeData.x = Math.random() * 1600 - 1200; nodeData.physics = false; }
            nodesMap.set(originalId, nodeData);
          }
        }

        // pathRels를 기반으로 엣지 생성 (실제 관계 정보 사용)
        // pathRels는 경로 상의 실제 관계를 순서대로 포함
        // trimmedNodeInfos와 pathRels는 동기화되어 있음: pathRels[i]는 trimmedNodeInfos[i]와 trimmedNodeInfos[i+1] 사이의 관계
        if (pathRels && pathRels.length > 0) {
          console.log(`[경로 ${pathIdx + 1}] pathRels로부터 엣지 생성:`, pathRels.length, '개 관계, 노드', trimmedNodeInfos.length, '개');

          // pathRels 배열의 길이는 trimmedNodeInfos.length - 1 이어야 함
          if (pathRels.length !== trimmedNodeInfos.length - 1) {
            console.warn(`⚠️ [경로 ${pathIdx + 1}] pathRels 길이(${pathRels.length})와 노드 수(${trimmedNodeInfos.length}) 불일치!`);
          }

          // pathRels의 각 관계를 순회하며 엣지 생성
          for (let relIdx = 0; relIdx < pathRels.length; relIdx++) {
            const rel = pathRels[relIdx];
            if (!rel) continue;

            // pathRels[relIdx]는 trimmedNodeInfos[relIdx] -> trimmedNodeInfos[relIdx+1] 사이의 관계
            if (relIdx < trimmedNodeInfos.length - 1) {
              const fromNodeId = toNum(trimmedNodeInfos[relIdx].id);
              const toNodeId = toNum(trimmedNodeInfos[relIdx + 1].id);

              const edgeKey = `${fromNodeId}-${toNodeId}`;
              const reverseKey = `${toNodeId}-${fromNodeId}`;

              // 중복 체크 (양방향 모두)
              if (!edgesSet.has(edgeKey) && !edgesSet.has(reverseKey)) {
                edgesSet.add(edgeKey);
                allEdges.push({
                  id: edgeKey,
                  from: fromNodeId,
                  to: toNodeId,
                  arrows: 'to',
                  color: { color: '#FFD700' },
                  width: 3,
                  title: `Attack Path - Hop ${relIdx + 1}`
                });
                console.log(`  엣지 생성 [${relIdx + 1}]: ${fromNodeId} -> ${toNodeId}`);
              } else {
                console.log(`  엣지 중복 스킵 [${relIdx + 1}]: ${fromNodeId} -> ${toNodeId}`);
              }
            }
          }
        } else {
          // pathRels가 없는 경우 기존 방식으로 엣지 생성
          console.warn(`[경로 ${pathIdx + 1}] pathRels가 없어서 노드 순서로 엣지 생성`);
          for (let i = 1; i < trimmedNodeInfos.length; i++) {
            const prevNodeInfo = trimmedNodeInfos[i - 1];
            const nodeInfo = trimmedNodeInfos[i];
            const prevId = toNum(prevNodeInfo.id);
            const currentId = toNum(nodeInfo.id);
            const edgeKey = `${prevId}-${currentId}`;
            const reverseKey = `${currentId}-${prevId}`;
            if (!edgesSet.has(edgeKey) && !edgesSet.has(reverseKey)) {
              edgesSet.add(edgeKey);
              allEdges.push({
                id: edgeKey,
                from: prevId,
                to: currentId,
                arrows: 'to',
                color: { color: '#FFD700' },
                width: 3,
                title: 'Attack Path (Fallback)'
              });
            }
          }
        }
      }

      // 레벨 계산 및 할당
      nodesMap.forEach((node, nodeId) => {
        if (nodeId === targetId) { node.tempLevel = 999999; return; }
        const positions = nodePathPositions.get(nodeId);
        if (positions?.length) { const avg = positions.reduce((s,p)=>s+p,0)/positions.length; node.tempLevel = Math.round(avg); }
        else node.tempLevel = 0;
      });
      const uniqueLevels = [...new Set(Array.from(nodesMap.values()).filter(n => n.tempLevel !== 999999).map(n => n.tempLevel))].sort((a,b)=>a-b);
      const levelMapping = new Map(); uniqueLevels.forEach((t,i)=>levelMapping.set(t, i+1));
      let maxLevel = 0;
      nodesMap.forEach((node, nodeId) => {
        if (nodeId === targetId) return;
        const positions = nodePathPositions.get(nodeId);
        if (positions?.length) { const avg = positions.reduce((s,p)=>s+p,0)/positions.length; const r = Math.round(avg); node.level = levelMapping.get(r); if (node.level > maxLevel) maxLevel = node.level; }
        else node.level = 1;
        delete node.tempLevel;
      });
      if (targetId) { const t = nodesMap.get(targetId); if (t) { t.level = maxLevel + 1; delete t.tempLevel; } }

      // 전체 경로 목록 요약 로그
      console.log('========== 경로 분석 요약 ==========');
      console.log(`총 경로 개수: ${pathsArr.length}`);
      console.log(`시작 노드 ID: ${startId}`);
      console.log(`목표 노드 ID: ${targetId}`);
      console.log('');

      let totalIssues = 0;
      pathsArr.forEach((path, idx) => {
        const firstNode = path[0];
        const lastNode = path[path.length - 1];
        const startCount = path.filter(n => n.id === startId).length;
        const targetCount = path.filter(n => n.id === targetId).length;
        const isFirstNodeStart = firstNode?.id === startId;
        const isLastNodeTarget = lastNode?.id === targetId;
        const hasIssue = !isFirstNodeStart || !isLastNodeTarget || startCount !== 1 || targetCount !== 1;

        if (hasIssue) totalIssues++;

        console.log(`경로 ${idx + 1}:`, {
          노드수: path.length,
          첫번째노드: `${firstNode?.label}(${firstNode?.id}) ${isFirstNodeStart ? '✅' : '❌ 시작노드 아님!'}`,
          마지막노드: `${lastNode?.label}(${lastNode?.id}) ${isLastNodeTarget ? '✅' : '❌ 목표노드 아님!'}`,
          시작노드출현: `${startCount}번 ${startCount === 1 ? '✅' : '⚠️'}`,
          목표노드출현: `${targetCount}번 ${targetCount === 1 ? '✅' : '⚠️'}`,
          상태: hasIssue ? '⚠️⚠️ 문제 있음 ⚠️⚠️' : '✅ 정상',
          경로: path.map(n => `${n.label}(${n.id})`).join(' → ')
        });
      });

      console.log('');
      console.log(`총 ${pathsArr.length}개 경로 중 ${totalIssues}개 경로에서 문제 발견`);
      if (totalIssues > 0) {
        console.error(`⚠️⚠️⚠️ ${totalIssues}개 경로에 문제가 있습니다! ⚠️⚠️⚠️`);
      } else {
        console.log('✅✅✅ 모든 경로가 정상입니다! ✅✅✅');
      }
      console.log('===================================');

      setPathList(pathsArr);
      setAttackGraphData({
        nodes: Array.from(nodesMap.values()),
        edges: allEdges,
        pathsMap: new Map([[startId, new Set(allEdges.map(e => e.id))]]),
        targetNodeId: targetId,
        allStartNodes: new Set([startId]),
        nodeConnections: new Map(),
        pathCount: recs.length,
        paths: pathsArr
      });
      if (loadingAttackRef.current) setLoadingAttack(false);
    }).catch((e) => { console.error(e); setLoadingAttack(false); });

    return () => { canceled = true; };
  }, [effectiveElementId, selectedStartNode]);

  // 3) Device topology 렌더링 (메인)
  useEffect(() => {
    if (!topologyRef.current) return;

    // 선택된 경로의 노드와 엣지 ID 수집
    const selectedPathNodes = new Set();
    const selectedPathEdges = new Set();

    if (selectedPath !== null && pathList[selectedPath]) {
      const pathNodes = pathList[selectedPath];
      // 경로의 노드 ID들을 수집
      pathNodes.forEach(node => {
        selectedPathNodes.add(node.id);
      });

      // 경로의 엣지 ID들을 수집 (연속된 노드 간의 엣지)
      for (let i = 0; i < pathNodes.length - 1; i++) {
        const from = pathNodes[i].id;
        const to = pathNodes[i + 1].id;
        // 양방향 엣지 ID 모두 추가
        selectedPathEdges.add(`${Math.min(from, to)}-${Math.max(from, to)}`);
      }
    }

    // 최초 1회 생성 또는 재생성
    if (topologyNetRef.current) {
      topologyNetRef.current.destroy();
      topologyNetRef.current = null;
    }

    const baseTopology = initialTopologyRef.current ?? topologyData;

    // 노드 매핑 생성 (Physical ID -> Device elementId)
    const physicalToDevice = new Map();
    if (attackGraphData.nodes) {
      attackGraphData.nodes.forEach(n => {
        if (n.properties && n.properties.id) {
          const elemId = n.properties.id.startsWith('ml:') ? n.properties.id.slice(3) : n.properties.id;
          physicalToDevice.set(n.id, elemId);
        }
      });
    }

    // 노드 스타일 적용
    const nodesToShow = (baseTopology.nodes || []).map(n => {
      const copy = { ...n };
      copy.shape = 'image';
      copy.image = getNodeImage(copy);
      copy.font = { color: '#7c3aed' };
      copy.borderWidth = 2;

      // 경로의 노드 찾기
      let isInSelectedPath = false;
      if (selectedPath !== null) {
        // Physical ID로 매핑된 elementId 확인
        for (const [physId, elemId] of physicalToDevice.entries()) {
          if (selectedPathNodes.has(physId) && elemId === copy.elementId) {
            isInSelectedPath = true;
            break;
          }
        }
      }

      // 시작 노드 확인
      let isStartSelected = false;
      if (selectedStartNode != null) {
        const physElementId = physicalToDevice.get(selectedStartNode);
        if (physElementId === copy.elementId) {
          isStartSelected = true;
        }
      }

      // 목표 노드 확인
      const isTarget = effectiveElementId && copy.elementId === effectiveElementId;

      // 하이라이트 우선순위: 목표 > 시작 > 경로상 노드
      if (isTarget) {
        copy.size = 35;
        copy.borderWidth = 4;
        copy.color = { border: '#CC0000', background: '#FFE5E5' };
        copy.shadow = {
          enabled: true,
          color: 'rgba(255, 0, 0, 0.8)',
          size: 25,
          x: 0,
          y: 0
        };
      } else if (isStartSelected) {
        copy.size = 30;
        copy.borderWidth = 4;
        copy.color = { border: '#00CC00', background: '#E5FFE5' };
        copy.shadow = {
          enabled: true,
          color: 'rgba(0, 204, 0, 0.8)',
          size: 20,
          x: 0,
          y: 0
        };
      } else if (isInSelectedPath) {
        copy.size = 25;
        copy.borderWidth = 3;
        copy.color = { border: '#FF8C00', background: '#FFF5E5' };
        copy.shadow = {
          enabled: true,
          color: 'rgba(255, 140, 0, 0.6)',
          size: 15,
          x: 0,
          y: 0
        };
      } else {
        copy.size = 12;
        copy.color = { border: '#205AAA' };
        copy.shadow = { enabled: false };
      }

      return copy;
    });

    // 엣지 스타일 적용
    const edgesToShow = (baseTopology.edges || []).map(e => {
      const edgeCopy = { ...e };

      if (selectedPathEdges.has(e.id)) {
        // 선택된 경로의 엣지는 노란색으로 하이라이트
        edgeCopy.color = {
          color: '#FFD700',
          highlight: '#FFF000',
          hover: '#FFF000'
        };
        edgeCopy.width = 8;
        edgeCopy.hoverWidth = 10;
        edgeCopy.smooth = { enabled: true, type: 'continuous', roundness: 0.5 };
        edgeCopy.shadow = {
          enabled: true,
          color: 'rgba(255, 215, 0, 0.5)',
          size: 10,
          x: 0,
          y: 0
        };
      } else {
        edgeCopy.color = { color: '#848484' };
        edgeCopy.width = 1;
      }

      return edgeCopy;
    });

    const nodes = new DataSet(nodesToShow);
    const edges = new DataSet(edgesToShow);
    const data = { nodes, edges };

    const options = {
      interaction: { hover: true, multiselect: false },
      nodes: {
        shape: 'image',
        brokenImage: getNodeImage({}),
        size: 30,
        borderWidth: 2,
        color: { border: '#b39ddb' },
        font: { size: 14, color: '#7c3aed' }
      },
      edges: {
        smooth: { enabled: false }
      },
      physics: {
        stabilization: true
      }
    };

    topologyNetRef.current = new Network(topologyRef.current, data, options);

    // 위치 복원 또는 저장
    if (nodePositionsRef.current) {
      topologyNetRef.current.setOptions({ physics: false, edges: { smooth: { enabled: false } } });
      Object.keys(nodePositionsRef.current).forEach(id => {
        try {
          topologyNetRef.current.moveNode(id, nodePositionsRef.current[id].x, nodePositionsRef.current[id].y);
        } catch (e) {
          // 노드가 존재하지 않을 수 있음
        }
      });
    } else {
      topologyNetRef.current.once('stabilizationIterationsDone', () => {
        if (topologyNetRef.current) {
          nodePositionsRef.current = topologyNetRef.current.getPositions();
          topologyNetRef.current.setOptions({ physics: false, edges: { smooth: { enabled: false } } });
        }
      });
    }

    // 노드 선택 이벤트
    topologyNetRef.current.on('selectNode', async (params) => {
      const nid = params.nodes && params.nodes[0];
      if (!nid) return;
      const node = nodes.get(nid);

      if (effectiveElementId) {
        // 목표가 이미 선택된 경우, 시작 노드로 설정
        const physId = await resolvePhysicalIdByElementId(node?.elementId);
        if (physId != null) {
          setSelectedStartNode(physId);
        } else {
          console.warn('No Physical id found for Device:', node?.elementId);
        }
      } else {
        // 목표 노드 선택
        const elementIdFull = node && node.elementId;
        if (onSelectDeviceRef.current) {
          onSelectDeviceRef.current(elementIdFull);
        } else {
          setInternalSelected(elementIdFull);
        }
      }
    });

    return () => {
      if (topologyNetRef.current) {
        topologyNetRef.current.destroy();
        topologyNetRef.current = null;
      }
    };
  }, [topologyData, selectedStartNode, attackGraphData, effectiveElementId, selectedPath, pathList]);

  // 4) Canvas에 파티클 애니메이션 그리기
  useEffect(() => {
    if (!canvasRef.current || !topologyNetRef.current || !isAnimating || selectedPath === null || !pathList[selectedPath]) {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      return;
    }

    const canvas = canvasRef.current;
    const network = topologyNetRef.current;
    const ctx = canvas.getContext('2d');

    // Canvas 크기를 컨테이너에 맞춤
    const container = topologyRef.current;
    if (container) {
      canvas.width = container.offsetWidth;
      canvas.height = container.offsetHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 경로 노드들의 위치 가져오기
    const pathNodes = pathList[selectedPath];
    const positions = [];

    // Physical ID -> Device elementId 매핑
    const physicalToDevice = new Map();
    if (attackGraphData.nodes) {
      attackGraphData.nodes.forEach(n => {
        if (n.properties && n.properties.id) {
          const elemId = n.properties.id.startsWith('ml:') ? n.properties.id.slice(3) : n.properties.id;
          physicalToDevice.set(n.id, elemId);
        }
      });
    }

    // 각 경로 노드의 화면 위치 찾기
    for (const pathNode of pathNodes) {
      const deviceElementId = physicalToDevice.get(pathNode.id);
      if (!deviceElementId) continue;

      // Device 토폴로지에서 해당 노드 찾기
      const baseTopology = initialTopologyRef.current ?? topologyData;
      const deviceNode = baseTopology.nodes.find(n => n.elementId === deviceElementId);
      if (!deviceNode) continue;

      try {
        const pos = network.getPosition(deviceNode.id);
        const canvasPos = network.canvasToDOM(pos);
        positions.push({ x: canvasPos.x, y: canvasPos.y });
      } catch (e) {
        console.warn('Failed to get node position:', e);
      }
    }

    if (positions.length < 2) return;

    // 전체 경로 길이 계산
    const segmentLengths = [];
    let totalLength = 0;
    for (let i = 0; i < positions.length - 1; i++) {
      const dx = positions[i + 1].x - positions[i].x;
      const dy = positions[i + 1].y - positions[i].y;
      const length = Math.sqrt(dx * dx + dy * dy);
      segmentLengths.push(length);
      totalLength += length;
    }

    // 현재 진행도에 따른 파티클 위치 계산
    const targetDistance = particlePosition * totalLength;
    let accumulatedDistance = 0;
    let particleX = positions[0].x;
    let particleY = positions[0].y;

    for (let i = 0; i < segmentLengths.length; i++) {
      if (accumulatedDistance + segmentLengths[i] >= targetDistance) {
        const segmentProgress = (targetDistance - accumulatedDistance) / segmentLengths[i];
        particleX = positions[i].x + (positions[i + 1].x - positions[i].x) * segmentProgress;
        particleY = positions[i].y + (positions[i + 1].y - positions[i].y) * segmentProgress;
        break;
      }
      accumulatedDistance += segmentLengths[i];
    }

    // 메인 파티클 그리기 (큰 빛나는 원)
    const gradient = ctx.createRadialGradient(particleX, particleY, 0, particleX, particleY, 25);
    gradient.addColorStop(0, 'rgba(255, 20, 147, 1)');
    gradient.addColorStop(0.4, 'rgba(255, 20, 147, 0.8)');
    gradient.addColorStop(0.7, 'rgba(255, 20, 147, 0.4)');
    gradient.addColorStop(1, 'rgba(255, 20, 147, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(particleX, particleY, 25, 0, Math.PI * 2);
    ctx.fill();

    // 중심 원
    ctx.fillStyle = '#FF1493';
    ctx.beginPath();
    ctx.arc(particleX, particleY, 10, 0, Math.PI * 2);
    ctx.fill();

    // 외곽 링 (회전 효과)
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(particleX, particleY, 15, 0, Math.PI * 2);
    ctx.stroke();

    // 내부 하이라이트
    ctx.fillStyle = '#FFB6C1';
    ctx.beginPath();
    ctx.arc(particleX - 3, particleY - 3, 4, 0, Math.PI * 2);
    ctx.fill();

  }, [isAnimating, particlePosition, selectedPath, pathList, topologyData, attackGraphData]);

  // 보조 유틸: 노드 상세정보
  const showNodeDetails = (node) => { const props = node?.properties || node?.props || {}; alert(JSON.stringify(props, null, 2)); };
  const startNodeObj = attackGraphData.nodes?.find(n => n.id === selectedStartNode) || null;
  const targetNodeObj = attackGraphData.nodes?.find(n => n.id === attackGraphData.targetNodeId) || null;

  // ===== project_develop_info 기반 측정 =====
  const parseCIAFromVector = (vector) => {
    if (!vector || typeof vector !== 'string') return { C: null, I: null, A: null };
    const map = { H: 1, M: 0.66, L: 0.33, N: 0 };
    const pick = (tag) => { const m = vector.match(new RegExp(`${tag}:([HNML])`)); return m ? (map[m[1]] ?? null) : null; };
    return { C: pick('C'), I: pick('I'), A: pick('A') };
  };

  const collectNodeVulnStats = (node) => {
    const props = node?.properties || node?.props || {};
    const cves = props.cveInfos || props.vulnerabilities || props.cves || [];
    const arr = Array.isArray(cves) ? cves : [];
    const scores = []; const cVals = []; const iVals = []; const aVals = [];
    for (const cv of arr) {
      const p = cv?.props || cv || {};
      const sCand = p.cvss3 ?? p.cvss ?? p.baseScore ?? p.score ?? p.score_value ?? p.severity_score;
      const sNum = typeof sCand === 'number' ? sCand : parseFloat(sCand);
      if (!Number.isNaN(sNum)) scores.push(sNum);
      const vStr = p.vectorString || p.vector || p.cvssVector || null;
      const { C, I, A } = parseCIAFromVector(vStr);
      if (C != null) cVals.push(C); if (I != null) iVals.push(I); if (A != null) aVals.push(A);
    }
    const avg = (xs) => xs.length ? xs.reduce((a,b)=>a+b,0)/xs.length : null;
    return { totalCount: arr.length, highRiskCount: scores.filter(s => s >= 7).length, avgScore: avg(scores), avgC: avg(cVals), avgI: avg(iVals), avgA: avg(aVals) };
  };

  const degreeMap = useMemo(() => {
    const map = new Map(); (attackGraphData.edges || []).forEach(e => { map.set(e.from, (map.get(e.from) || 0) + 1); map.set(e.to, (map.get(e.to) || 0) + 1); }); return map;
  }, [attackGraphData.edges]);

  const levelRange = useMemo(() => {
    let minL = Infinity, maxL = -Infinity, any = false; (attackGraphData.nodes || []).forEach(n => { if (typeof n.level === 'number') { any = true; if (n.level < minL) minL = n.level; if (n.level > maxL) maxL = n.level; } });
    return any ? { min: minL, max: maxL } : null;
  }, [attackGraphData.nodes]);

  const avgCveCount = useMemo(() => {
    const counts = (attackGraphData.nodes || []).map(n => collectNodeVulnStats(n).totalCount);
    const valid = counts.filter(c => typeof c === 'number');
    return valid.length ? valid.reduce((a,b)=>a+b,0)/valid.length : 0;
  }, [attackGraphData.nodes]);

  const computeHRN = (node) => {
    const st = collectNodeVulnStats(node); let hrn = 1;
    if (st.totalCount > 0 && st.highRiskCount >= Math.ceil(st.totalCount / 2)) hrn += 1;
    if (st.totalCount > avgCveCount) hrn += 1;
    if (hrn < 1) hrn = 1; if (hrn > 3) hrn = 3; return hrn;
  };

  const computeNLS = (nodeId) => {
    if (!degreeMap || degreeMap.size === 0) return 0.5; const degs = Array.from(degreeMap.values());
    const minD = Math.min(...degs), maxD = Math.max(...degs); const d = degreeMap.get(nodeId) || 0; if (maxD === minD) return 0.5; return (d - minD) / (maxD - minD);
  };

  const computeCPS = (node) => {
    if (!levelRange || typeof node.level !== 'number') return 0.5; const { min, max } = levelRange; if (max === min) return 0.5; const norm = (node.level - min) / (max - min); return 1 - norm;
  };

  const computeNodeAttackPossibility = (node) => {
    if (!node) return 0.5; const hrn = computeHRN(node); const nls = computeNLS(node.id); const cps = computeCPS(node); const raw = (hrn + nls) * cps; return Math.max(0, Math.min(raw / 4, 1));
  };

  const computeNodeRS = (node) => {
    const { avgScore, avgC, avgI, avgA } = collectNodeVulnStats(node);
    if (avgScore == null || avgC == null || avgI == null || avgA == null) return null;
    const val = (avgScore * (avgC + avgI + avgA)) / 3; return val / 10; // 0..1
  };

  const networkRSMean = useMemo(() => {
    const rs = (attackGraphData.nodes || []).map(computeNodeRS).filter(v => typeof v === 'number');
    return rs.length ? rs.reduce((a,b)=>a+b,0)/rs.length : null;
  }, [attackGraphData.nodes]);

  const pathMetrics = useMemo(() => {
    return (pathList || []).map((p, idx) => {
      const nodes = Array.isArray(p) ? p : [];
      const rsVals = nodes.map(node => { const full = (attackGraphData.nodes || []).find(n => n.id === node.id) || node; return computeNodeRS(full); }).filter(v => typeof v === 'number');
      const nodeCount = nodes.length; const pathRS = rsVals.length ? (rsVals.reduce((a,b)=>a+b,0)/rsVals.length) : null;
      let success = null; if (pathRS != null && networkRSMean != null && networkRSMean > 0) success = Math.min(Math.max(pathRS / networkRSMean, 0), 1);
      return { index: idx, path: nodes, nodeCount, success };
    });
  }, [pathList, attackGraphData.nodes, networkRSMean]);

  const buildCalculationText = (pathIdx) => {
    const p = pathList?.[pathIdx] || []; const lines = []; lines.push(`방책 ${pathIdx + 1} 계산 시작`);
    const rsVals = [];
    for (let i = 0; i < p.length; i++) {
      const n = p[i]; const full = (attackGraphData.nodes || []).find(x => x.id === n.id) || n;
      const hrn = computeHRN(full); const nls = computeNLS(full.id); const cps = computeCPS(full); const poss = computeNodeAttackPossibility(full);
      lines.push(`- 노드 ${i + 1}: ${full.label || full.id} → HRN ${hrn.toFixed(2)}, NLS ${nls.toFixed(2)}, CPS ${cps.toFixed(2)} ⇒ 가능도 ${(poss*100).toFixed(2)}%`);
      const rs = computeNodeRS(full); if (typeof rs === 'number') rsVals.push(rs);
    }
    if (rsVals.length && networkRSMean != null && networkRSMean > 0) {
      const pathRS = rsVals.reduce((a,b)=>a+b,0)/rsVals.length;
      lines.push(`RS 평균(경로) = ${(pathRS*100).toFixed(2)}%, RS 평균(네트워크) = ${(networkRSMean*100).toFixed(2)}%`);
      const success = Math.min(Math.max(pathRS / networkRSMean, 0), 1);
      lines.push(`결론: 방책 ${pathIdx + 1}의 성공 가능성 = ${(success*100).toFixed(2)}%`);
    } else {
      lines.push('RS 데이터를 충분히 수집하지 못해 방책 성공 가능성을 계산할 수 없습니다.');
    }
    return lines.join('\n');
  };

  const startTypingLogs = (text) => {
    if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    setTypedLogText(""); let i = 0;
    const interval = setInterval(() => { i += 1; setTypedLogText(text.slice(0, i)); if (i >= text.length) { clearInterval(interval); typingTimerRef.current = null; } }, 12);
    typingTimerRef.current = interval;
  };

  // 경로 애니메이션 시작 함수 (파티클 이동)
  const startPathAnimation = (pathIdx) => {
    // 기존 애니메이션 정리
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    const path = pathList[pathIdx];
    if (!path || path.length === 0) return;

    // 애니메이션 활성화 플래그
    animationActiveRef.current = true;
    setIsAnimating(true);
    const startTime = Date.now();
    const perNodeMs = 500; // 노드 하나당 기본 시간 (조정 가능)
    const minDuration = 1000; // 최소 지속시간 보장
    const duration = Math.max(minDuration, path.length * perNodeMs);

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      setParticlePosition(progress);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // 한 회 완료
        animationFrameRef.current = null;
        // 자동 반복: animationActiveRef.current 가 true 인 경우에만 재시작
        setTimeout(() => {
          if (animationActiveRef.current) {
            startPathAnimation(pathIdx);
          } else {
            setIsAnimating(false);
          }
        }, 500);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  const onSelectPathWithLogs = (idx) => {
    // 이전 애니메이션 중지
    animationActiveRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsAnimating(false);
    setParticlePosition(0);

    setSelectedPath(idx);
    const text = buildCalculationText(idx);
    startTypingLogs(text);

    // 약간의 지연 후 새 애니메이션 시작
    setTimeout(() => {
      startPathAnimation(idx);
    }, 100);
  };

  // 컴포넌트 언마운트 시 애니메이션 정리
  useEffect(() => {
    return () => {
      animationActiveRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
      }
    };
  }, []);

  // 렌더링
  return (
    <Card component="main" role="main" aria-label="공격 경로 시각화" className="offensive-strategy-container" sx={{ width: '100%', height: 'calc(100vh - 120px)', bgcolor: 'background.paper', boxShadow: 3, m: 0 }}>
      <CardContent sx={{ p: 1, height: '100%', '&:last-child': { pb: 1 }, display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 1, overflow: 'hidden' }}>
        {/* 메인 Device Topology */}
        <Card component="section" aria-label="Device Topology 영역" className="attack-graph-section" sx={{ flex: 1, position: 'relative', overflow: 'hidden', height: '100%' }}>
          <CardContent sx={{ p: 0, height: '100%', '&:last-child': { pb: 0 }, position: 'relative' }}>
            <Box className="status-bar">
              <Typography variant="caption" color="inherit">
                {loadingAttack ? '' : (effectiveElementId ? `공격 목표: ${effectiveElementId}${selectedStartNode ? ' (시작 노드 선택됨)' : ''}` : '공격 목표 미선택')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton size="small" onClick={() => setCalculationLogPopupOpen(true)} sx={{ bgcolor: '#7c3aed', color: 'white', '&:hover': { bgcolor: '#6d28d9' }, width: 32, height: 32 }} title="계산 로그 보기">
                  <FundOutlined style={{ fontSize: 16 }} />
                </IconButton>
                {selectedStartNode && (
                  <Button size="small" variant="contained" onClick={() => setSelectedStartNode(null)} sx={{ bgcolor: '#4CAF50', color: 'white', '&:hover': { bgcolor: '#45a049' }, fontSize: 11, py: 0.5, px: 1.5 }}>
                    시작 노드 초기화
                  </Button>
                )}
              </Box>
            </Box>
            <div ref={topologyRef} role="img" aria-label="Device Topology를 표시하는 네트워크 그래프" className="attack-graph-canvas" />
            <canvas
              ref={canvasRef}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 5
              }}
            />
            <Box className="legend-box">
              <ul className="legend-list" role="list">
                <li className="legend-item"><Box className="legend-dot start" aria-hidden="true" /><Typography variant="caption" sx={{ color: '#fff' }}>시작 노드</Typography></li>
                <li className="legend-item"><Box className="legend-dot target" aria-hidden="true" /><Typography variant="caption" sx={{ color: '#fff' }}>목표 노드</Typography></li>
                <li className="legend-item"><Box className="legend-dot via" aria-hidden="true" /><Typography variant="caption" sx={{ color: '#fff' }}>경로 노드</Typography></li>
                {isAnimating && (
                  <li className="legend-item"><Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#FF1493', boxShadow: '0 0 10px #FF1493' }} aria-hidden="true" /><Typography variant="caption" sx={{ color: '#fff' }}>경로 이동 중</Typography></li>
                )}
                {/*<li className="legend-item"><Box className="legend-line" aria-hidden="true" /><Typography variant="caption" sx={{ color: '#fff' }}>공격 경로</Typography></li>*/}
              </ul>
            </Box>
          </CardContent>
        </Card>

        {/* 우측 패널 */}
        {selectedStartNode && (
          <Box component="aside" aria-label="경로 정보 패널" className="right-panel" sx={{ width: { xs: '100%', lg: 400 }, maxWidth: { xs: '100%', lg: 400 } }}>
            {/* 카드 1 */}
            <Card component="section" aria-label="시작 및 목표 노드 정보" className="info-card">
              <CardContent>
                <Typography variant="body2" component="h3" className="card-title">📍 시작 및 목표 노드</Typography>
                <Box sx={{ fontSize: 12, color: '#555', display: 'grid', gap: 0.5 }}>
                  {startNodeObj ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span><strong>시작:</strong> {startNodeObj.label || startNodeObj.id}</span>
                      <Button size="small" variant="outlined" onClick={() => showNodeDetails(startNodeObj)} sx={{ ml: 1 }}>상세정보</Button>
                    </Box>
                  ) : (<Typography variant="caption" className="empty-message">시작 노드를 선택하세요</Typography>)}
                  {targetNodeObj ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span><strong>목표:</strong> {targetNodeObj.label || targetNodeObj.id}</span>
                      <Button size="small" variant="outlined" onClick={() => showNodeDetails(targetNodeObj)} sx={{ ml: 1 }}>상세정보</Button>
                    </Box>
                  ) : (<Typography variant="caption" className="empty-message">목표 노드 정보가 없습니다</Typography>)}
                </Box>
              </CardContent>
            </Card>

            {/* 카드 2: 방책 리스트 (테이블) */}
            <Card component="section" aria-label="경로 리스트" className="info-card scrollable" sx={{ flex: 1, minHeight: 0 }}>
              <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', flex: 1, '&:last-child': { pb: 2 } }}>
                <Typography variant="body2" component="h3" className="card-title">🛤️ 방책 리스트</Typography>
                <Box className="card-content-scroll" sx={{ overflowX: 'auto' }}>
                  {pathMetrics.length === 0 ? (
                    <Typography variant="caption" className="empty-message">경로가 없습니다</Typography>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #ccc' }}>방책 No.</th>
                          <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #ccc' }}>노드 수</th>
                          <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #ccc' }}>순위</th>
                          <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #ccc' }}>성공 가능성</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pathMetrics.map((m) => {
                          const sorted = [...pathMetrics].sort((a, b) => (b.success ?? -1) - (a.success ?? -1));
                          const rank = (sorted.findIndex(x => x.index === m.index) + 1) || '-';
                          const successDisplay = m.success == null ? 'N/A' : `${((m.success) * 100).toFixed(2)}%`;
                          const isSelected = selectedPath === m.index;
                          return (
                            <tr key={m.index} onClick={() => onSelectPathWithLogs(m.index)} style={{ background: isSelected ? '#fff' : '#f9f9f9', cursor: 'pointer', border: isSelected ? '2px solid #4CAF50' : '1px solid #ccc' }}>
                              <td style={{ padding: '8px' }}>{`경로 ${m.index + 1}`}</td>
                              <td style={{ padding: '8px' }}>{m.nodeCount}</td>
                              <td style={{ padding: '8px' }}>{rank}</td>
                              <td style={{ padding: '8px' }}>{successDisplay}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </Box>
              </CardContent>
            </Card>

            {/* 카드 3: 경로 노드 정보 (테이블) */}
            <Card component="section" aria-label="경로 노드 정보" className="info-card scrollable" sx={{ flex: 1, minHeight: 0 }}>
              <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', flex: 1, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" component="h3" className="card-title">🔗 경로 노드 정보</Typography>
                  <IconButton
                    size="small"
                    onClick={() => setInfoPopupOpen(true)}
                    sx={{
                      width: 32,
                      height: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: '#e3f2fd',
                      border: '1px solid #90caf9',
                      borderRadius: '50%',
                      '&:hover': { bgcolor: '#bbdefb' }
                    }}
                  >
                    <InfoOutlined style={{ fontSize: 16, color: '#1976d2' }} />
                  </IconButton>
                </Box>
                <Box className="card-content-scroll" sx={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #ccc' }}>노드 No</th>
                        <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #ccc' }}>경로 No</th>
                        <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #ccc' }}>노드 정보</th>
                        <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #ccc' }}>취약점 개수/평균</th>
                        <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #ccc' }}>가능도</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPath !== null && pathList[selectedPath] ? (
                        pathList[selectedPath].map((node, idx) => {
                          const full = (attackGraphData.nodes || []).find(n => n.id === node.id) || node;
                          const props = full?.properties || full?.props || {};
                          const cveInfos = props.cveInfos || [];
                          const vulnCount = Array.isArray(cveInfos) ? cveInfos.length : 0;

                          // 취약점 평균 점수 계산
                          let avgScore = 0;
                          if (vulnCount > 0 && Array.isArray(cveInfos)) {
                            const scores = cveInfos.map(v => {
                              const vProps = v?.props || v || {};
                              const score = vProps.cvss3 ?? vProps.cvss ?? vProps.baseScore ?? vProps.score ?? vProps.score_value ?? vProps.severity_score;
                              return typeof score === 'number' ? score : parseFloat(score) || 0;
                            }).filter(s => !isNaN(s) && s > 0);

                            if (scores.length > 0) {
                              avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
                            }
                          }

                          const poss = computeNodeAttackPossibility(full);
                          const nodeLabel = full?.label || full?.name || props?.name || props?.label || node?.label || `Node ${idx + 1}`;
                          const nodeType = full?.nodeType || props?.type || 'Unknown';
                          const nodeIp = full?.ip || props?.ip || 'N/A';

                          return (
                            <tr key={`${selectedPath}-${idx}`} style={{ borderBottom: '1px solid #eee', cursor: 'default' }}>
                              <td style={{ padding: '8px', verticalAlign: 'top' }}>{idx + 1}</td>
                              <td style={{ padding: '8px', verticalAlign: 'top' }}>{selectedPath + 1}</td>
                              <td style={{
                                padding: '8px',
                                verticalAlign: 'top',
                                maxWidth: 180,
                                wordBreak: 'break-word',
                                color: '#1976d2',
                                cursor: 'pointer',
                                textDecoration: 'underline'
                              }}
                              onClick={() => {
                                setSelectedNodeDetail(full);
                                setNodeDetailPopupOpen(true);
                              }}
                              >
                                {nodeLabel}
                              </td>
                              <td style={{ padding: '8px', verticalAlign: 'top' }}>
                                {vulnCount > 0 ? `${vulnCount}개 / ${avgScore.toFixed(2)}점` : '0개 / N/A'}
                              </td>
                              <td style={{ padding: '8px', verticalAlign: 'top' }}>{(poss*100).toFixed(2)}%</td>
                            </tr>
                          );
                        })
                      ) : (
                        (pathList || []).flatMap((path, pidx) => (
                          (path || []).map((node, idx) => {
                            const full = (attackGraphData.nodes || []).find(n => n.id === node.id) || node;
                            const props = full?.properties || full?.props || {};
                            const cveInfos = props.cveInfos || [];
                            const vulnCount = Array.isArray(cveInfos) ? cveInfos.length : 0;

                            // 취약점 평균 점수 계산
                            let avgScore = 0;
                            if (vulnCount > 0 && Array.isArray(cveInfos)) {
                              const scores = cveInfos.map(v => {
                                const vProps = v?.props || v || {};
                                const score = vProps.cvss3 ?? vProps.cvss ?? vProps.baseScore ?? vProps.score ?? vProps.score_value ?? vProps.severity_score;
                                return typeof score === 'number' ? score : parseFloat(score) || 0;
                              }).filter(s => !isNaN(s) && s > 0);

                              if (scores.length > 0) {
                                avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
                              }
                            }

                            const poss = computeNodeAttackPossibility(full);
                            const nodeLabel = full?.label || full?.name || props?.name || props?.label || node?.label || `Node ${idx + 1}`;

                            return (
                              <tr key={`${pidx}-${idx}`} style={{ borderBottom: '1px solid #eee', cursor: 'default' }}>
                                <td style={{ padding: '8px', verticalAlign: 'top' }}>{idx + 1}</td>
                                <td style={{ padding: '8px', verticalAlign: 'top' }}>{pidx + 1}</td>
                                <td style={{
                                  padding: '8px',
                                  verticalAlign: 'top',
                                  maxWidth: 180,
                                  wordBreak: 'break-word',
                                  color: '#1976d2',
                                  cursor: 'pointer',
                                  textDecoration: 'underline'
                                }}
                                onClick={() => {
                                  setSelectedNodeDetail(full);
                                  setNodeDetailPopupOpen(true);
                                }}
                                >
                                  {nodeLabel}
                                </td>
                                <td style={{ padding: '8px', verticalAlign: 'top' }}>
                                  {vulnCount > 0 ? `${vulnCount}개 / ${avgScore.toFixed(2)}점` : '0개 / N/A'}
                                </td>
                                <td style={{ padding: '8px', verticalAlign: 'top' }}>{(poss*100).toFixed(2)}%</td>
                              </tr>
                            );
                          })
                        ))
                      )}
                    </tbody>
                  </table>
                  {(!pathList || pathList.length === 0) && (<Typography variant="caption" className="empty-message" sx={{ mt: 1 }}>경로가 없습니다</Typography>)}
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* TreatAnalysis 팝업 */}
        <Dialog open={treatAnalysisOpen} onClose={() => closePopup('treatAnalysis')} maxWidth="md" fullWidth PaperProps={{ sx: { height: '70vh', maxHeight: '70vh', m: 0, position: 'relative', overflow: 'hidden' } }}>
          <IconButton onClick={() => closePopup('treatAnalysis')} sx={{ position: 'absolute', right: 23, top: 8.5, color: '#000000ff', zIndex: 1, bgcolor: '#cac7d4ff', '&:hover': { bgcolor: '#39306b', color: '#ffffffff' } }}>x</IconButton>
          <DialogContent sx={{ p: 0, height: '100%', overflow: 'hidden' }}>
            <TreatAnalysis open={treatAnalysisOpen} isPopup={true} logText={typedLogText} />
          </DialogContent>
        </Dialog>

        {/* 계산 로그 팝업 */}
        <Dialog
          open={calculationLogPopupOpen}
          onClose={() => setCalculationLogPopupOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{ sx: { height: '70vh', maxHeight: '70vh', m: 0, position: 'relative', overflow: 'hidden', borderRadius: 0 } }}
        >
          <IconButton onClick={() => setCalculationLogPopupOpen(false)} sx={{ position: 'absolute', right: 23, top: 8.5, color: '#000000ff', zIndex: 1, bgcolor: '#cac7d4ff', '&:hover': { bgcolor: '#39306b', color: '#ffffffff' } }}>x</IconButton>
          <DialogContent sx={{ p: 0, height: '100%', overflow: 'auto', bgcolor: 'background.paper' }}>
            <div style={{
              background: '#f0edfd',
              color: '#39306b',
              padding: '20px',
              fontFamily: "'Noto Sans KR', 'Malgun Gothic', 'Apple SD Gothic Neo', Arial, Helvetica, sans-serif",
              height: '100%',
              fontSize: '14px',
              lineHeight: '1.5',
              overflow: 'auto'
            }}>
              <div style={{ 
                borderBottom: '2px solid #39306b', 
                paddingBottom: '10px', 
                marginBottom: '20px' 
              }}>
                <h2 style={{ margin: 0 }}>📋 계산 로그</h2>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>
                  Loading - Neo4j - neo4j://elf116i19.databases.neo4j.io
                </div>
              </div>
              
              <div style={{ fontFamily: 'monospace', fontSize: '13px', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#39306b' }}>
                {typedLogText && typedLogText.length > 0 ? typedLogText : (
                  <span style={{ opacity: 0.6 }}>방책 리스트에서 경로를 선택하면 계산 과정을 표시합니다.</span>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 정보 팝업 - 공격 가능도 및 성공 가능성 설명 */}
        <Dialog
          open={infoPopupOpen}
          onClose={() => setInfoPopupOpen(false)}
          maxWidth="lg"
          fullWidth
          PaperProps={{ sx: { height: '80vh', maxHeight: '80vh', m: 0, position: 'relative', overflow: 'hidden', borderRadius: 0 } }}
        >
          <IconButton onClick={() => setInfoPopupOpen(false)} sx={{ position: 'absolute', right: 23, top: 8.5, color: '#000000ff', zIndex: 1, bgcolor: '#cac7d4ff', '&:hover': { bgcolor: '#39306b', color: '#ffffffff' } }}>x</IconButton>
          <DialogContent sx={{ p: 0, height: '100%', overflow: 'auto', bgcolor: 'background.paper' }}>
            <div style={{
              background: '#f0edfd',
              color: '#39306b',
              padding: '20px',
              fontFamily: "'Noto Sans KR', 'Malgun Gothic', 'Apple SD Gothic Neo', Arial, Helvetica, sans-serif",
              height: '100%',
              fontSize: '14px',
              lineHeight: '1.5',
              overflow: 'auto'
            }}>
              <div style={{ 
                borderBottom: '2px solid #39306b', 
                paddingBottom: '10px', 
                marginBottom: '20px' 
              }}>
                <h2 style={{ margin: 0 }}>📊 공격 가능도 & 성공 가능성 분석</h2>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>
                  위험 노출도 및 공격 가능도 측정
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* HRN 설명 */}
              <Paper sx={{ p: 2, bgcolor: '#f5f5f5', borderLeft: '4px solid #ff6b6b' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#ff6b6b', mb: 1 }}>
                  🔴 HRN (고위험 노드 점수)
                </Typography>
                <Typography variant="body2" sx={{ lineHeight: 1.6, color: '#333' }}>
                  노드의 보안 위험도를 측정하는 점수입니다.
                  <br />
                  <strong>측정 기준:</strong>
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    <li>노드의 고위험 취약점 개수 ≥ 전체 취약점 개수의 50% 이상 → 고위험 점수 부여</li>
                    <li>노드의 CVE 개수 &gt; 평균 CVE 개수 → 고위험 점수(HRN) 부여</li>
                    <li>점수 범위: 1~3 (1: 낮음, 3: 높음)</li>
                  </ul>
                </Typography>
              </Paper>

              {/* NLS 설명 */}
              <Paper sx={{ p: 2, bgcolor: '#f5f5f5', borderLeft: '4px solid #4ecdc4' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#4ecdc4', mb: 1 }}>
                  🔗 NLS (연결 중요도 점수)
                </Typography>
                <Typography variant="body2" sx={{ lineHeight: 1.6, color: '#333' }}>
                  네트워크 내에서 다른 노드와의 연결 중요도입니다.
                  <br />
                  <strong>특징:</strong>
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    <li>높을수록 보안 위험도 상승 ⬆️</li>
                    <li>많은 연결을 통해 공격이 빠르게 확산될 수 있음</li>
                    <li>네트워크 허브 역할을 하는 노드가 높은 NLS를 가짐</li>
                  </ul>
                </Typography>
              </Paper>

              {/* 공격 가능도 설명 */}
              <Paper sx={{ p: 2, bgcolor: '#f5f5f5', borderLeft: '4px solid #ffa502' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#ffa502', mb: 1 }}>
                  ⚔️ 공격 가능도 (Exploitability)
                </Typography>
                <Typography variant="body2" sx={{ lineHeight: 1.6, color: '#333' }}>
                  네트워크 경로를 통한 실제 공격 가능성을 측정합니다.
                  <br />
                  <strong>계산 공식:</strong>
                  <div style={{
                    bgcolor: '#fff9e6',
                    padding: '12px',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    margin: '8px 0',
                    border: '1px solid #ffe58f'
                  }}>
                    공격 가능도 = (HRN + NLS) × CPS
                  </div>
                  <strong>구성 요소:</strong>
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    <li><strong>HRN:</strong> 고위험 노드 점수</li>
                    <li><strong>NLS:</strong> 연결 중요도 점수</li>
                    <li><strong>CPS:</strong> 네트워크 중심 점수 (1 - 중심성) <br/>
                      → 낮을수록 감시가 어려워 위험도 상승
                    </li>
                  </ul>
                </Typography>
              </Paper>

              {/* 성공 가능성 설명 */}
              <Paper sx={{ p: 2, bgcolor: '#f5f5f5', borderLeft: '4px solid #00b4d8' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#00b4d8', mb: 1 }}>
                  ✅ 공격 성공 가능성 (Success Probability)
                </Typography>
                <Typography variant="body2" sx={{ lineHeight: 1.6, color: '#333' }}>
                  특정 경로에서 공격이 성공할 가능성을 측정합니다.
                  <br />
                  <strong>측정 단계:</strong>
                  <ol style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    <li><strong>RS 점수 산출:</strong> 각 노드의 취약점 심각도와 영향도 계산
                      <div style={{ fontSize: '12px', margin: '4px 0', color: '#666' }}>
                        RS = (취약점 점수 평균 × (C벡터 + I벡터 + A벡터) / 3)
                      </div>
                    </li>
                    <li><strong>경로의 RS 평균:</strong> 연결된 모든 노드의 RS 점수 평균</li>
                    <li><strong>전체 네트워크 RS 평균:</strong> 망 전체의 평균 RS 점수</li>
                    <li><strong>성공 가능성:</strong> 경로 RS 평균 ÷ 전체 네트워크 RS 평균
                      <div style={{ fontSize: '12px', margin: '4px 0', color: '#666' }}>
                        = 경로의 평균 취약성 / 전체 네트워크 평균 취약성
                      </div>
                    </li>
                  </ol>
                  <strong>해석:</strong>
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    <li>&gt; 100%: 평균보다 취약한 경로</li>
                    <li>= 100%: 평균 수준의 취약성</li>
                    <li>&lt; 100%: 평균보다 안전한 경로</li>
                  </ul>
                </Typography>
              </Paper>

              {/* 종합 분석 */}
              <Paper sx={{ p: 2, bgcolor: '#e8f5e9', borderLeft: '4px solid #43a047' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#43a047', mb: 1 }}>
                  🎯 종합 분석
                </Typography>
                <Typography variant="body2" sx={{ lineHeight: 1.6, color: '#333' }}>
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    <li><strong>공격 가능도</strong>: 경로 자체가 얼마나 공격받을 수 있는가?</li>
                    <li><strong>공격 성공 가능성</strong>: 경로를 통한 공격이 성공할 확률은?</li>
                    <li>높은 공격 가능도 + 높은 성공 가능성 = 📍 가장 위험한 경로</li>
                  </ul>
                </Typography>
              </Paper>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 노드 상세 정보 팝업 */}
        <Dialog
          open={nodeDetailPopupOpen}
          onClose={() => setNodeDetailPopupOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{ sx: { borderRadius: 2 } }}
        >
          <Box sx={{ p: 3, bgcolor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                🔍 노드 상세 정보
              </Typography>
              <IconButton
                onClick={() => setNodeDetailPopupOpen(false)}
                sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}
              >
                ✕
              </IconButton>
            </Box>
          </Box>

          <DialogContent sx={{ p: 3 }}>
            {selectedNodeDetail && (() => {
              const props = selectedNodeDetail?.properties || selectedNodeDetail?.props || {};
              const cveInfos = props.cveInfos || [];
              const nodeLabel = selectedNodeDetail?.label || selectedNodeDetail?.name || props?.name || props?.label || 'Unknown';
              const nodeType = selectedNodeDetail?.nodeType || props?.type || 'Unknown';
              const nodeIp = selectedNodeDetail?.ip || props?.ip || 'N/A';
              const nodeId = props?.id || selectedNodeDetail?.id || 'N/A';

              return (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* 기본 정보 */}
                  <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, color: '#1976d2' }}>
                      📋 기본 정보
                    </Typography>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #ddd' }}>
                          <td style={{ padding: '8px', fontWeight: 'bold', width: '30%', background: '#e3f2fd' }}>노드 이름</td>
                          <td style={{ padding: '8px' }}>{nodeLabel}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #ddd' }}>
                          <td style={{ padding: '8px', fontWeight: 'bold', background: '#e3f2fd' }}>노드 타입</td>
                          <td style={{ padding: '8px' }}>{nodeType}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #ddd' }}>
                          <td style={{ padding: '8px', fontWeight: 'bold', background: '#e3f2fd' }}>IP 주소</td>
                          <td style={{ padding: '8px' }}>{nodeIp}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #ddd' }}>
                          <td style={{ padding: '8px', fontWeight: 'bold', background: '#e3f2fd' }}>노드 ID</td>
                          <td style={{ padding: '8px', fontFamily: 'monospace', fontSize: '12px' }}>{nodeId}</td>
                        </tr>
                      </tbody>
                    </table>
                  </Paper>

                  {/* 취약점 정보 */}
                  <Paper sx={{ p: 2, bgcolor: '#fff3e0' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, color: '#f57c00' }}>
                      🛡️ 취약점 정보 ({Array.isArray(cveInfos) ? cveInfos.length : 0}개)
                    </Typography>
                    {Array.isArray(cveInfos) && cveInfos.length > 0 ? (
                      <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                          <thead style={{ position: 'sticky', top: 0, background: '#ffe0b2', zIndex: 1 }}>
                            <tr>
                              <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ff9800' }}>CVE ID</th>
                              <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ff9800' }}>CVSS 점수</th>
                              <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ff9800' }}>심각도</th>
                              <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ff9800' }}>설명</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cveInfos.map((cve, idx) => {
                              const cveProps = cve?.props || cve || {};
                              const cveId = cveProps.cve || cveProps.cveId || cveProps.id || cveProps.name || `CVE-${idx + 1}`;
                              const cvssScore = cveProps.cvss3 || cveProps.cvss || cveProps.baseScore || cveProps.score || cveProps.score_value || cveProps.severity_score || 'N/A';
                              const severity = cveProps.severity || cveProps.severityLevel ||
                                (cvssScore !== 'N/A' && typeof cvssScore === 'number' ?
                                  (cvssScore >= 9.0 ? 'CRITICAL' :
                                   cvssScore >= 7.0 ? 'HIGH' :
                                   cvssScore >= 4.0 ? 'MEDIUM' : 'LOW') : 'N/A');
                              const description = cveProps.description || cveProps.summary || cveProps.desc || 'N/A';

                              const severityColor =
                                severity === 'CRITICAL' ? '#d32f2f' :
                                severity === 'HIGH' ? '#f57c00' :
                                severity === 'MEDIUM' ? '#fbc02d' :
                                severity === 'LOW' ? '#388e3c' : '#757575';

                              return (
                                <tr key={idx} style={{ borderBottom: '1px solid #ffe0b2' }}>
                                  <td style={{ padding: '8px', fontFamily: 'monospace', fontSize: '12px' }}>{cveId}</td>
                                  <td style={{ padding: '8px', fontWeight: 'bold' }}>{cvssScore}</td>
                                  <td style={{ padding: '8px' }}>
                                    <span style={{
                                      color: 'white',
                                      background: severityColor,
                                      padding: '2px 8px',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      fontWeight: 'bold'
                                    }}>
                                      {severity}
                                    </span>
                                  </td>
                                  <td style={{ padding: '8px', maxWidth: '300px', wordBreak: 'break-word', fontSize: '12px' }}>
                                    {typeof description === 'string' && description.length > 100
                                      ? description.substring(0, 100) + '...'
                                      : description}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </Box>
                    ) : (
                      <Typography variant="body2" sx={{ color: '#666', fontStyle: 'italic' }}>
                        취약점 정보가 없습니다.
                      </Typography>
                    )}
                  </Paper>

                  {/* 추가 속성 정보 */}
                  <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, color: '#7b1fa2' }}>
                      ⚙️ 추가 속성
                    </Typography>
                    <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <tbody>
                          {Object.entries(props).filter(([key]) => !['cveInfos', 'vulnerabilities', 'cves'].includes(key)).map(([key, value], idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #ddd' }}>
                              <td style={{ padding: '6px 8px', fontWeight: 'bold', width: '30%', background: '#ede7f6' }}>{key}</td>
                              <td style={{ padding: '6px 8px', wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '11px' }}>
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </td>
                            </tr>
                          ))}
                          {Object.keys(props).filter(key => !['cveInfos', 'vulnerabilities', 'cves'].includes(key)).length === 0 && (
                            <tr>
                              <td colSpan={2} style={{ padding: '8px', textAlign: 'center', color: '#666', fontStyle: 'italic' }}>
                                추가 속성이 없습니다.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </Box>
                  </Paper>
                </Box>
              );
            })()}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export default OffensiveStrategy;
