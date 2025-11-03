// src/OffensiveStrategy.jsx
import { useState, useEffect, useRef, useMemo } from "react";
import neo4j from "neo4j-driver";
import { DataSet } from "vis-data";
import { Network } from "vis-network/standalone";
import "vis-network/styles/vis-network.css";
import { Box, Typography, Card, CardContent, IconButton, Button, Dialog, DialogContent } from '@mui/material';
import { MinusOutlined, PlusOutlined, FundOutlined } from '@ant-design/icons';
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

  // Topology (좌측/미니)
  const topologyRef = useRef(null);
  const topologyNetRef = useRef(null);
  const [topologyData, setTopologyData] = useState({ nodes: [], edges: [] });
  const [topologyMinimized, setTopologyMinimized] = useState(false);
  const initialTopologyRef = useRef(null);
  const nodePositionsRef = useRef(null);

  // Attack Graph (메인)
  const attackRef = useRef(null);
  const attackNetRef = useRef(null);
  const [attackGraphData, setAttackGraphData] = useState({ nodes: [], edges: [] });
  const [loadingAttack, setLoadingAttack] = useState(false);
  const [selectedStartNode, setSelectedStartNode] = useState(null);

  // 우측 패널 상태
  const [pathList, setPathList] = useState([]);
  const [selectedPath, setSelectedPath] = useState(null);
  const [typedLogText, setTypedLogText] = useState("");
  const typingTimerRef = useRef(null);

  // 내부 선택 device elementId (부모 미제공 시)
  const [internalSelected, setInternalSelected] = useState(null);
  const effectiveElementId = deviceElementId ?? internalSelected;

  // 재사용 refs
  const topologyNodesRef = useRef(null);
  const topologyEdgesRef = useRef(null);
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
      CALL {
        MATCH (start:Physical {project:'multi-layer'}), (target:Physical {id:$targetPhysicalId, project:'multi-layer'})
        WHERE id(start) = $startId
        MATCH p = (start)-[:CONNECTED*1..100]-(target)
        WHERE ALL(r IN relationships(p) WHERE r.project = 'multi-layer')
          AND size(nodes(p)) = size(apoc.coll.toSet(nodes(p)))
        WITH start, target, nodes(p) AS pathNodes
        LIMIT 100
        RETURN start, target, pathNodes
      }
      WITH start, target, pathNodes, range(0, size(pathNodes)-1) AS indices
      UNWIND indices AS idx
      WITH start, target, pathNodes, idx, pathNodes[idx] AS n
      WITH start, target, pathNodes, idx, n,
           COUNT { (n)-[:CONNECTED {project:'multi-layer'}]-() } AS deg,
           properties(n).type AS nodeType,
           properties(n).ip AS nodeIp,
           properties(n).name AS nodeName,
           properties(n).id AS nodeId
      OPTIONAL MATCH (n)-[:HOSTS]->(l:Logical)
      OPTIONAL MATCH (l)-[:HAS_CVE]->(c:CveDetail)
      WITH start, target, pathNodes, idx, n, deg, nodeType, nodeIp, nodeName, nodeId,
           collect(DISTINCT c) AS cList
      WITH start, target, pathNodes, idx, n, deg, nodeType, nodeIp, nodeName, nodeId,
           [ci IN cList WHERE ci IS NOT NULL | { id: id(ci), props: properties(ci) }] AS cveInfos,
           [ci IN cList WHERE ci IS NOT NULL | coalesce(ci.cve, ci.cveId, ci.id, ci.name)] AS cveIdList,
           [ci IN cList WHERE ci IS NOT NULL |
              coalesce(toFloat(ci.cvss3), toFloat(ci.cvss), toFloat(ci.baseScore), toFloat(ci.score), toFloat(ci.score_value), toFloat(ci.severity), toFloat(ci.severity_score))
           ] AS rawScores
      WITH start, target, pathNodes, idx, n, deg, nodeType, nodeIp, nodeName, nodeId, cveInfos, cveIdList,
           [s IN rawScores WHERE s IS NOT NULL] AS scoreVals
      WITH start, target, pathNodes, idx,
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
      WITH start, target, collect(nodeInfo) AS orderedNodeInfos
      RETURN start, target, orderedNodeInfos

      UNION

      CALL {
        MATCH (start:Physical {project:'multi-layer'}), (target:Physical {id:$targetPhysicalId, project:'multi-layer'})
        WHERE id(start) = $startId
        MATCH (via:Physical {project:'multi-layer'})
        WHERE via <> start AND via <> target AND properties(via).type IS NOT NULL
        WITH start, target, via ORDER BY rand() LIMIT 50
        MATCH p1 = shortestPath((start)-[:CONNECTED*]-(via))
        WHERE ALL(r IN relationships(p1) WHERE r.project = 'multi-layer')
        MATCH p2 = shortestPath((via)-[:CONNECTED*]-(target))
        WHERE ALL(r IN relationships(p2) WHERE r.project = 'multi-layer')
        WITH start, target, nodes(p1) + nodes(p2)[1..] AS pathNodes
        RETURN start, target, pathNodes
      }
      WITH start, target, pathNodes, range(0, size(pathNodes)-1) AS indices
      UNWIND indices AS idx
      WITH start, target, pathNodes, idx, pathNodes[idx] AS n
      WITH start, target, pathNodes, idx, n,
           COUNT { (n)-[:CONNECTED {project:'multi-layer'}]-() } AS deg,
           properties(n).type AS nodeType,
           properties(n).ip AS nodeIp,
           properties(n).name AS nodeName,
           properties(n).id AS nodeId
      OPTIONAL MATCH (n)-[:HOSTS]->(l:Logical)
      OPTIONAL MATCH (l)-[:HAS_CVE]->(c:CveDetail)
      WITH start, target, pathNodes, idx, n, deg, nodeType, nodeIp, nodeName, nodeId,
           collect(DISTINCT c) AS cList
      WITH start, target, pathNodes, idx, n, deg, nodeType, nodeIp, nodeName, nodeId,
           [ci IN cList WHERE ci IS NOT NULL | { id: id(ci), props: properties(ci) }] AS cveInfos,
           [ci IN cList WHERE ci IS NOT NULL | coalesce(ci.cve, ci.cveId, ci.id, ci.name)] AS cveIdList,
           [ci IN cList WHERE ci IS NOT NULL |
              coalesce(toFloat(ci.cvss3), toFloat(ci.cvss), toFloat(ci.baseScore), toFloat(ci.score), toFloat(ci.score_value), toFloat(ci.severity), toFloat(ci.severity_score))
           ] AS rawScores
      WITH start, target, pathNodes, idx, n, deg, nodeType, nodeIp, nodeName, nodeId, cveInfos, cveIdList,
           [s IN rawScores WHERE s IS NOT NULL] AS scoreVals
      WITH start, target, pathNodes, idx,
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
      WITH start, target, collect(nodeInfo) AS orderedNodeInfos
      RETURN start, target, orderedNodeInfos
      LIMIT 500
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
        targetId = targetId ?? (targetNode?.identity ? toNum(targetNode.identity) : null);

        // 엔드포인트/연속 중복 제거
        const endpointIds = new Set();
        const filteredNodeInfos = [];
        for (let idx = 0; idx < orderedNodeInfos.length; idx++) {
          const nodeInfo = orderedNodeInfos[idx];
          const nodeId = toNum(nodeInfo.id);
          const nodeType = nodeInfo.nodeType; const typeStr = nodeType ? String(nodeType).toLowerCase() : '';
          const isSwitchOrRouter = typeStr.includes('switch') || typeStr.includes('router');
          if (filteredNodeInfos.length > 0) {
            const lastNodeId = toNum(filteredNodeInfos[filteredNodeInfos.length - 1].id);
            if (nodeId === lastNodeId) continue;
          }
          if (isSwitchOrRouter) filteredNodeInfos.push(nodeInfo);
          else {
            if (!endpointIds.has(nodeId)) { endpointIds.add(nodeId); filteredNodeInfos.push(nodeInfo); }
          }
        }
        if (filteredNodeInfos.length < 2) continue;

        // path list용 축약 저장
        const pathNodesForList = filteredNodeInfos.map((ni) => {
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
        pathsArr.push(pathNodesForList);

        for (let i = 0; i < filteredNodeInfos.length; i++) {
          const nodeInfo = filteredNodeInfos[i];
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
          if (i > 0) {
            const prevNodeInfo = filteredNodeInfos[i - 1];
            const prevId = toNum(prevNodeInfo.id);
            const edgeKey = `${prevId}-${originalId}`;
            if (!edgesSet.has(edgeKey)) { edgesSet.add(edgeKey); allEdges.push({ id: edgeKey, from: prevId, to: originalId, arrows: 'to', color: { color: '#FFD700' }, width: 3, title: 'Attack Path' }); }
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

  // 3) 좌측 Device topology 렌더링
  useEffect(() => {
    if (!topologyRef.current) return;
    // 최초 1회 생성
    if (!topologyNetRef.current) {
      const baseTopology = initialTopologyRef.current ?? topologyData;
      topologyNodesRef.current = new DataSet((baseTopology.nodes || []).map(n => { const c = { ...n }; c.shape='image'; c.image=getNodeImage(c); c.borderWidth=2; c.size=c.size ?? 20; c.color={ border: '#205AAA' }; c.font={ color: '#7c3aed' }; return c; }));
      topologyEdgesRef.current = new DataSet((baseTopology.edges || []).map(e => ({ ...e })));
      const data = { nodes: topologyNodesRef.current, edges: topologyEdgesRef.current };
      const options = { interaction: { hover: true, multiselect: false }, nodes: { shape:'image', brokenImage: getNodeImage({}), size:30, borderWidth:2, color:{ border:'#b39ddb' }, font:{ size:10, color:'#7c3aed' } }, edges: { smooth: { enabled: false } }, physics: { stabilization: true } };
      topologyNetRef.current = new Network(topologyRef.current, data, options);
      if (nodePositionsRef.current) {
        topologyNetRef.current.setOptions({ physics: false, edges: { smooth: { enabled: false } } });
        Object.keys(nodePositionsRef.current).forEach(id => { try { topologyNetRef.current.moveNode(id, nodePositionsRef.current[id].x, nodePositionsRef.current[id].y); } catch {} });
      } else {
        topologyNetRef.current.once('stabilizationIterationsDone', () => {
          if (topologyNetRef.current) { nodePositionsRef.current = topologyNetRef.current.getPositions(); topologyNetRef.current.setOptions({ physics: false, edges: { smooth: { enabled: false } } }); }
        });
      }
      topologyNetRef.current.on('selectNode', async (params) => {
        const nid = params.nodes && params.nodes[0]; if (!nid) return; const node = topologyNodesRef.current.get(nid);
        if (effectiveElementId) {
          const physId = await resolvePhysicalIdByElementId(node?.elementId);
          if (physId != null) setSelectedStartNode(physId); else console.warn('No Physical id found for Device:', node?.elementId);
        }
      });
      if (topologyMinimized) return;
    }

    // 데이터셋 업데이트
    try {
      const baseTopology = initialTopologyRef.current ?? topologyData;
      const pathNodeElementIds = new Set();
      if (attackGraphData.nodes) {
        attackGraphData.nodes.forEach(n => {
          if (n.group !== 'StartPhysical' && n.group !== 'TargetPhysical' && n.properties && n.properties.id) {
            const elemId = n.properties.id.startsWith('ml:') ? n.properties.id.slice(3) : n.properties.id;
            pathNodeElementIds.add(elemId);
          }
        });
      }
      const startNodeOriginalId = attackGraphData.nodes?.find(p => p.id === selectedStartNode || p.originalId === selectedStartNode)?.originalId || selectedStartNode;
      const nodesToShow = (baseTopology.nodes || []).map(n => {
        const copy = { ...n };
        let isStartSelected = false;
        if (selectedStartNode != null && startNodeOriginalId != null) {
          const phys = attackGraphData.nodes?.find(p => p.originalId === startNodeOriginalId || p.id === startNodeOriginalId);
          if (phys?.properties && typeof phys.properties.id === 'string') {
            const physElementId = phys.properties.id.startsWith('ml:') ? phys.properties.id.slice(3) : phys.properties.id;
            if (physElementId === copy.elementId) isStartSelected = true;
          }
          if (!isStartSelected && copy.id === startNodeOriginalId) isStartSelected = true;
        }
        const isTarget = effectiveElementId && copy.elementId === effectiveElementId;
        const isInPath = copy.elementId && pathNodeElementIds.has(copy.elementId);
        copy.shape='image'; copy.image=getNodeImage(copy); copy.font={ color:'#7c3aed' }; copy.borderWidth=2; copy.color={ border:'#205AAA' }; copy.size=copy.size ?? 12;
        if (isTarget) { copy.color={ border:'#CC0000' }; copy.size=25; }
        else if (isStartSelected) { copy.color={ border:'#00FF00' }; copy.size=20; }
        else if (isInPath) { copy.color={ border:'#FF8C00' }; copy.size=18; }
        return copy;
      });
      const edgesToShow = (baseTopology.edges || []).map(e => ({ ...e }));
      topologyNodesRef.current.clear(); topologyEdgesRef.current.clear();
      topologyNodesRef.current.add(nodesToShow); topologyEdgesRef.current.add(edgesToShow);
    } catch (err) { console.error('Failed to update topology datasets:', err); }

    if (nodePositionsRef.current && topologyNetRef.current) {
      topologyNetRef.current.setOptions({ physics: false });
      Object.keys(nodePositionsRef.current).forEach(id => { try { topologyNetRef.current.moveNode(id, nodePositionsRef.current[id].x, nodePositionsRef.current[id].y); } catch {} });
    }

    return () => {
      if (topologyNetRef.current) {
        topologyNetRef.current.destroy(); topologyNetRef.current = null; topologyNodesRef.current = null; topologyEdgesRef.current = null;
      }
    };
  }, [topologyData, selectedStartNode, attackGraphData, effectiveElementId, topologyMinimized]);

  // 4) 메인(공격/토폴로지) 렌더링
  useEffect(() => {
    if (!attackRef.current) return;
    if (attackNetRef.current) { attackNetRef.current.destroy(); attackNetRef.current = null; }
    const baseTopology = initialTopologyRef.current ?? topologyData;

    let nodesToShow; let edgesToShow; let isFiltered = false;
    let options = {
      interaction: { hover: true, multiselect: false },
      nodes: { shape: 'image', brokenImage: getNodeImage({}), size: 30, borderWidth: 2, color: { border: '#b39ddb' }, font: { size: 18, color: '#7c3aed' } },
      edges: { smooth: selectedStartNode ? { enabled: true, type: 'dynamic', roundness: 0.7 } : { enabled: false } },
      physics: { stabilization: true, barnesHut: { gravitationalConstant: -8000, springConstant: 0.04, springLength: 95 } }
    };

    if (!selectedStartNode) {
      nodesToShow = (effectiveElementId ? (baseTopology.nodes || []).map(n => {
        const copy = { ...n }; if (copy.elementId && copy.elementId === effectiveElementId) { copy.color = { border: '#9f1515' }; copy.size = 25; }
        copy.shape='image'; copy.image=getNodeImage(copy); copy.font={ color:'#7c3aed' }; return copy;
      }) : (baseTopology.nodes || []).map(n => { const copy = { ...n }; copy.shape='image'; copy.image=getNodeImage(copy); copy.font={ color:'#7c3aed' }; return copy; }));
      edgesToShow = (baseTopology.edges || []).map(e => ({ ...e }));
      options.physics.enabled = true;
    } else {
      nodesToShow = attackGraphData.nodes ? attackGraphData.nodes.map(n => { const c = { ...n }; c.shape='image'; c.image=getNodeImage(c); c.borderWidth=2; c.size=c.size ?? 20; c.color=c.color || { border:'#2B7CE9' }; c.font={ color:'#7c3aed' }; return c; }) : [];
      edgesToShow = attackGraphData.edges ? attackGraphData.edges.map(e => ({ ...e })) : [];
      if (attackGraphData.pathsMap) {
        const pathEdges = attackGraphData.pathsMap.get(selectedStartNode);
        if (pathEdges && pathEdges.size > 0) {
          isFiltered = true;
          const filteredEdges = edgesToShow.filter(edge => pathEdges.has(edge.id));
          const nodeIds = new Set([selectedStartNode, attackGraphData.targetNodeId]);
          filteredEdges.forEach(e => { nodeIds.add(e.from); nodeIds.add(e.to); });
          edgesToShow = filteredEdges;
          nodesToShow = nodesToShow.filter(n => nodeIds.has(n.id)).map(n => {
            if (n.id === selectedStartNode) return { ...n, color: { border: '#00CC00' }, size: 20 };
            if (n.id === attackGraphData.targetNodeId) return { ...n, color: { border: '#CC0000' }, size: 25 };
            if (n.group === 'ViaPhysical') return { ...n, color: { border: '#FF8C00' }, size: 18 };
            return { ...n, color: { border: '#FF8C00' }, size: 16 };
          });
        }
      }
      options.layout = isFiltered ? { hierarchical: { enabled: true, direction: 'DU', sortMethod: 'directed', levelSeparation: 100, nodeSpacing: 300, treeSpacing: 350, blockShifting: true, edgeMinimization: false, parentCentralization: false } } : {};
      options.physics.enabled = !isFiltered;
    }

    const nodes = new DataSet(nodesToShow); const edges = new DataSet(edgesToShow);
    attackNetRef.current = new Network(attackRef.current, { nodes, edges }, options);

    if (!selectedStartNode) {
      if (nodePositionsRef.current) {
        attackNetRef.current.setOptions({ physics: false });
        Object.keys(nodePositionsRef.current).forEach(id => { try { attackNetRef.current.moveNode(id, nodePositionsRef.current[id].x, nodePositionsRef.current[id].y); } catch {} });
      } else {
        attackNetRef.current.once('stabilizationIterationsDone', () => { if (attackNetRef.current) { nodePositionsRef.current = attackNetRef.current.getPositions(); attackNetRef.current.setOptions({ physics: false }); } });
      }
    }

    attackNetRef.current.on('selectNode', async (params) => {
      const nid = params.nodes && params.nodes[0]; if (!nid) return; const node = nodes.get(nid);
      if (effectiveElementId) {
        if (node?.elementId) { const physId = await resolvePhysicalIdByElementId(node.elementId); if (physId != null) { setSelectedStartNode(physId); return; } }
        if (node && (node.group === 'StartPhysical' || attackGraphData.allStartNodes?.has(nid))) setSelectedStartNode(nid);
      } else {
        const elementIdFull = node && node.elementId; if (onSelectDeviceRef.current) onSelectDeviceRef.current(elementIdFull); else setInternalSelected(elementIdFull);
      }
    });

    return () => { if (attackNetRef.current && selectedStartNode) { attackNetRef.current.destroy(); attackNetRef.current = null; } };
  }, [attackGraphData, selectedStartNode, effectiveElementId, topologyData, onSelectDevice]);

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
  const onSelectPathWithLogs = (idx) => { setSelectedPath(idx); const text = buildCalculationText(idx); startTypingLogs(text); };

  // 렌더링
  return (
    <Card component="main" role="main" aria-label="공격 경로 시각화" className="offensive-strategy-container" sx={{ width: '100%', height: 'calc(100vh - 120px)', bgcolor: 'background.paper', boxShadow: 3, m: 0 }}>
      <CardContent sx={{ p: 1, height: '100%', '&:last-child': { pb: 1 }, display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 1, overflow: 'hidden' }}>
        {/* 메인 공격 그래프 */}
        <Card component="section" aria-label="공격 그래프 영역" className="attack-graph-section" sx={{ flex: 1, position: 'relative', overflow: 'hidden', height: '100%' }}>
          <CardContent sx={{ p: 0, height: '100%', '&:last-child': { pb: 0 }, position: 'relative' }}>
            <Box className="status-bar">
              <Typography variant="caption" color="inherit">
                {loadingAttack ? '공격 그래프 로딩 중...' : (effectiveElementId ? `공격 목표: ${effectiveElementId}${selectedStartNode ? ' (시작 노드 선택됨)' : ''}` : '공격 목표 미선택')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton size="small" onClick={() => openPopup('treatAnalysis')} sx={{ bgcolor: '#7c3aed', color: 'white', '&:hover': { bgcolor: '#6d28d9' }, width: 32, height: 32 }} title="위험 분석 보기">
                  <FundOutlined style={{ fontSize: 16 }} />
                </IconButton>
                {selectedStartNode && (
                  <Button size="small" variant="contained" onClick={() => setSelectedStartNode(null)} sx={{ bgcolor: '#4CAF50', color: 'white', '&:hover': { bgcolor: '#45a049' }, fontSize: 11, py: 0.5, px: 1.5 }}>
                    모든 시작 노드 표시
                  </Button>
                )}
              </Box>
            </Box>
            <div ref={attackRef} role="img" aria-label="공격 경로를 표시하는 네트워크 그래프" className="attack-graph-canvas" />
            <Box className="legend-box">
              <ul className="legend-list" role="list">
                <li className="legend-item"><Box className="legend-dot start" aria-hidden="true" /><Typography variant="caption" sx={{ color: '#fff' }}>시작 노드</Typography></li>
                <li className="legend-item"><Box className="legend-dot target" aria-hidden="true" /><Typography variant="caption" sx={{ color: '#fff' }}>목표 노드</Typography></li>
                <li className="legend-item"><Box className="legend-dot via" aria-hidden="true" /><Typography variant="caption" sx={{ color: '#fff' }}>경유 노드</Typography></li>
                <li className="legend-item"><Box className="legend-line" aria-hidden="true" /><Typography variant="caption" sx={{ color: '#fff' }}>공격 경로</Typography></li>
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
                <Typography variant="body2" component="h3" className="card-title">🔗 경로 노드 정보</Typography>
                <Box className="card-content-scroll" sx={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #ccc' }}>노드 No</th>
                        <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #ccc' }}>경로 No</th>
                        <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #ccc' }}>보유 취약점 목록</th>
                        <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #ccc' }}>취약점 점수</th>
                        <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #ccc' }}>가능도</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPath !== null && pathList[selectedPath] ? (
                        pathList[selectedPath].map((node, idx) => {
                          const full = (attackGraphData.nodes || []).find(n => n.id === node.id) || node;
                          const props = full?.properties || full?.props || {};
                          const cveInfos = props.cveInfos || [];
                          const vulnList = Array.isArray(cveInfos) ? cveInfos.map(v => (v?.props?.cve || v?.props?.cveId || v?.props?.id || v?.props?.name || v?.cve || v?.cveId || v?.id || v?.name || (typeof v === 'string' ? v : JSON.stringify(v)))) : [];
                          const score = props.vulnScore ?? props.vuln_score ?? null;
                          const poss = computeNodeAttackPossibility(full);
                          return (
                            <tr key={`${selectedPath}-${idx}`} style={{ borderBottom: '1px solid #eee', cursor: 'default' }}>
                              <td style={{ padding: '8px', verticalAlign: 'top' }}>{idx + 1}</td>
                              <td style={{ padding: '8px', verticalAlign: 'top' }}>{selectedPath + 1}</td>
                              <td style={{ padding: '8px', verticalAlign: 'top', maxWidth: 180, wordBreak: 'break-word' }}>{vulnList.length ? vulnList.join(', ') : 'N/A'}</td>
                              <td style={{ padding: '8px', verticalAlign: 'top' }}>{score != null ? String(score) : 'N/A'}</td>
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
                            const vulnList = Array.isArray(cveInfos) ? cveInfos.map(v => (v?.props?.cve || v?.props?.cveId || v?.props?.id || v?.props?.name || v?.cve || v?.cveId || v?.id || v?.name || (typeof v === 'string' ? v : JSON.stringify(v)))) : [];
                            const score = props.vulnScore ?? props.vuln_score ?? null;
                            const poss = computeNodeAttackPossibility(full);
                            return (
                              <tr key={`${pidx}-${idx}`} style={{ borderBottom: '1px solid #eee', cursor: 'default' }}>
                                <td style={{ padding: '8px', verticalAlign: 'top' }}>{idx + 1}</td>
                                <td style={{ padding: '8px', verticalAlign: 'top' }}>{pidx + 1}</td>
                                <td style={{ padding: '8px', verticalAlign: 'top', maxWidth: 180, wordBreak: 'break-word' }}>{vulnList.length ? vulnList.join(', ') : 'N/A'}</td>
                                <td style={{ padding: '8px', verticalAlign: 'top' }}>{score != null ? String(score) : 'N/A'}</td>
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

            {/* 카드 4: 계산 로그 (타자 애니메이션) */}
            <Card component="section" aria-label="계산 로그" className="info-card scrollable" sx={{ flex: 1, minHeight: 0 }}>
              <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', flex: 1, '&:last-child': { pb: 2 } }}>
                <Typography variant="body2" component="h3" className="card-title">📋 계산 로그</Typography>
                <Box className="card-content-scroll" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', fontSize: 11 }}>
                  {typedLogText && typedLogText.length > 0 ? typedLogText : (
                    <Typography variant="caption" className="empty-message">방책 리스트에서 경로를 선택하면 계산 과정을 타이핑 애니메이션으로 표시합니다.</Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Device Topology 미니 뷰 */}
        {effectiveElementId && selectedStartNode && !topologyMinimized && (
          <Card className="topology-mini-view">
            <Box className="topology-header">
              <Typography variant="caption" className="topology-title">Device Topology</Typography>
              <IconButton size="small" onClick={() => setTopologyMinimized(true)} sx={{ bgcolor: '#f0f0f0', border: '1px solid #ccc', borderRadius: 0.5, width: 24, height: 24, '&:hover': { bgcolor: '#e0e0e0' } }}>
                <MinusOutlined style={{ fontSize: 12 }} />
              </IconButton>
            </Box>
            <div ref={topologyRef} className="topology-canvas" />
          </Card>
        )}
        {effectiveElementId && selectedStartNode && topologyMinimized && (
          <Box className="topology-restore-button">
            <Button variant="contained" startIcon={<PlusOutlined />} onClick={() => setTopologyMinimized(false)} sx={{ bgcolor: '#4CAF50', color: 'white', '&:hover': { bgcolor: '#45a049' }, fontSize: 14, fontWeight: 'bold', py: 1, px: 2 }}>
              Topology
            </Button>
          </Box>
        )}

        {/* TreatAnalysis 팝업 */}
        <Dialog open={treatAnalysisOpen} onClose={() => closePopup('treatAnalysis')} maxWidth="md" fullWidth PaperProps={{ sx: { height: '70vh', maxHeight: '70vh', m: 0, position: 'relative', overflow: 'hidden' } }}>
          <IconButton onClick={() => closePopup('treatAnalysis')} sx={{ position: 'absolute', right: 23, top: 8.5, color: '#000000ff', zIndex: 1, bgcolor: '#cac7d4ff', '&:hover': { bgcolor: '#39306b', color: '#ffffffff' } }}>x</IconButton>
          <DialogContent sx={{ p: 0, height: '100%', overflow: 'hidden' }}>
            <TreatAnalysis open={treatAnalysisOpen} isPopup={true} />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export default OffensiveStrategy;
