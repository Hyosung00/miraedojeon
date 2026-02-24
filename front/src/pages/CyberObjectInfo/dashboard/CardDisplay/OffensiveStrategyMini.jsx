// OffensiveStrategyMini.jsx - OffensiveStrategy 원본과 동일한 방식 (2~3순위까지만 표시)
import { useState, useEffect, useRef, memo, useMemo } from "react";
import neo4j from "neo4j-driver";
import { DataSet } from "vis-data";
import { Network } from "vis-network/standalone";
import { Box, Typography, Chip, Stack } from '@mui/material';
import "vis-network/styles/vis-network.css";
import interactionTracker from "../../../../utils/interactionTracker";

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

// 순위별 색상 정의 (1순위부터)
const rankColors = [
  { border: '#FF0000', edge: '#FF0000', shadow: 'rgba(255, 0, 0, 0.8)', name: '1순위 (빨강)' },
  { border: '#FF6600', edge: '#FF6600', shadow: 'rgba(255, 102, 0, 0.7)', name: '2순위 (주황)' },
  { border: '#FFCC00', edge: '#FFCC00', shadow: 'rgba(255, 204, 0, 0.7)', name: '3순위 (노랑)' },
];

const OffensiveStrategyMini = () => {
  const topologyRef = useRef(null);
  const topologyNetRef = useRef(null);
  const nodesDataSetRef = useRef(null);
  const edgesDataSetRef = useRef(null);
  const [topologyData, setTopologyData] = useState({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  
  // 경로 선택 상태
  const [selectionStep, setSelectionStep] = useState(0); // 0: 목적지 선택, 1: 출발지 선택, 2: 경로 표시
  const [targetNode, setTargetNode] = useState(null);
  const [startNode, setStartNode] = useState(null);
  const [pathList, setPathList] = useState([]); // 공격 경로 목록
  const [loadingPath, setLoadingPath] = useState(false);
  
  // Ref로 최신 값 추적 (클로저 문제 해결)
  const targetNodeRef = useRef(null);
  const startNodeRef = useRef(null);
  useEffect(() => { targetNodeRef.current = targetNode; }, [targetNode]);
  useEffect(() => { startNodeRef.current = startNode; }, [startNode]);

  // Device 토폴로지 로드
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
        if (!entity) return null;
        const id = entity.identity;
        return id && typeof id.toNumber === 'function' ? id.toNumber() : id;
      };
      const labelOf = (entity) => {
        if (!entity) return "";
        const props = entity.properties || {};
        return props.name || props.label || (entity.labels && entity.labels[0]) || props.id || String(idOf(entity));
      };
      for (const rec of recs) {
        const d = rec.get('d');
        const r = rec.get('r');
        const d2 = rec.get('d2');
        const dId = idOf(d);
        if (d && dId != null && !nodesMap.has(dId)) {
          nodesMap.set(dId, {
            id: dId,
            label: labelOf(d),
            name: d.properties?.name,
            elementId: d.elementId,
            shape: 'image',
            image: getNodeImage(d),
            size: 12,
            color: { border: '#205AAA' },
            font: { color: '#7c3aed', size: 8 }
          });
        }
        if (d2) {
          const d2Id = idOf(d2);
          if (d2Id != null && !nodesMap.has(d2Id)) {
            nodesMap.set(d2Id, {
              id: d2Id,
              label: labelOf(d2),
              name: d2.properties?.name,
              elementId: d2.elementId,
              shape: 'image',
              image: getNodeImage(d2),
              size: 12,
              color: { border: '#205AAA' },
              font: { color: '#7c3aed', size: 8 }
            });
          }
          if (r && dId != null && d2Id != null) {
            const a = Math.min(dId, d2Id);
            const b = Math.max(dId, d2Id);
            const edgeKey = `${a}-${b}`;
            if (!edgesMap.has(edgeKey)) {
              edgesMap.set(edgeKey, {
                id: edgeKey,
                from: a,
                to: b,
                color: { color: '#848484' },
                width: 1
              });
            }
          }
        }
      }
      setTopologyData({
        nodes: Array.from(nodesMap.values()),
        edges: Array.from(edgesMap.values())
      });
      setLoading(false);
    }).catch((err) => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  // Device name -> Physical id
  const resolvePhysicalIdByName = async (deviceName) => {
    if (!deviceName) return null;
    const recs = await fetchData(
      `MATCH (p:Physical {name:$name, project:'multi-layer'}) RETURN id(p) AS pid`,
      { name: deviceName }
    );
    if (!recs?.length) return null;
    const v = recs[0].get('pid');
    return neo4j.isInt?.(v) ? v.toNumber() : v;
  };

  // 공격 경로 로드 (원본과 동일한 쿼리)
  const loadAttackPaths = async (startPhysId, targetDeviceName) => {
    if (!startPhysId || !targetDeviceName) return;
    
    setLoadingPath(true);
    const toNum = (v) => (neo4j.isInt?.(v) ? v.toNumber() : v);
    
    const query = `
      MATCH (start:Physical {project:'multi-layer'}), (target:Physical {name:$targetPhysicalName, project:'multi-layer'})
      WHERE id(start) = $startId AND start <> target
      CALL {
        WITH start, target
        MATCH (via:Physical {project:'multi-layer'})
        WHERE via <> start AND via <> target 
          AND properties(via).type IS NOT NULL
          AND (toLower(properties(via).type) CONTAINS 'laptop'
               OR toLower(properties(via).type) CONTAINS 'workstation'
               OR toLower(properties(via).type) CONTAINS 'server'
               OR toLower(properties(via).type) CONTAINS 'printer'
               OR toLower(properties(via).type) CONTAINS 'sensor'
               OR toLower(properties(via).type) CONTAINS 'plc')
        WITH start, target, via
        ORDER BY rand()
        LIMIT 30
        
        MATCH p1 = shortestPath((start)-[:CONNECTED*1..8]-(via))
        WHERE ALL(r IN relationships(p1) WHERE r.project = 'multi-layer')
          AND via <> start
          AND NONE(n IN nodes(p1)[1..-1] WHERE n = target)
        
        WITH start, target, via, nodes(p1) AS p1Nodes, relationships(p1) AS p1Rels
        MATCH p2 = shortestPath((via)-[:CONNECTED*1..8]-(target))
        WHERE ALL(r IN relationships(p2) WHERE r.project = 'multi-layer')
          AND via <> target
          AND NONE(n IN nodes(p2)[1..-1] WHERE n = start)
        
        WITH start, target, via,
             p1Nodes + nodes(p2)[1..] AS pathNodes,
             p1Rels + relationships(p2) AS pathRels,
             id(start) AS startId, 
             id(target) AS targetId
        
        WHERE size(pathNodes) <= 12 AND size(pathNodes) >= 3
        
        WITH pathNodes, pathRels, startId, targetId, range(0, size(pathNodes)-1) AS indices
        LIMIT 5
        
        UNWIND indices AS idx
        WITH pathNodes, pathRels, startId, targetId, idx, pathNodes[idx] AS n
        WITH pathNodes, pathRels, startId, targetId, idx, n,
             properties(n).type AS nodeType,
             properties(n).name AS nodeName
        WITH pathNodes, pathRels, startId, targetId, idx,
             { id: id(n), nodeType: nodeType, name: nodeName } AS nodeInfo
        ORDER BY idx
        WITH pathRels, collect(nodeInfo) AS orderedNodeInfos
        RETURN pathRels, orderedNodeInfos
      }
      WITH start, target, pathRels, orderedNodeInfos
      LIMIT 3
      RETURN start, target, pathRels, orderedNodeInfos
    `;

    try {
      const recs = await fetchData(query, { targetPhysicalName: targetDeviceName, startId: startPhysId });
      
      if (!recs || recs.length === 0) {
        setPathList([]);
        setLoadingPath(false);
        return;
      }

      const paths = [];
      for (const rec of recs) {
        const orderedNodeInfos = rec.get('orderedNodeInfos') || [];
        const pathNodes = orderedNodeInfos.map((ni) => ({
          id: toNum(ni.id),
          name: ni.name,
          nodeType: ni.nodeType
        }));
        paths.push(pathNodes);
      }

      setPathList(paths.slice(0, 3)); // 최대 3개 경로
      setLoadingPath(false);
    } catch (e) {
      console.error(e);
      setPathList([]);
      setLoadingPath(false);
    }
  };

  // 스타일 초기화
  const resetStyles = () => {
    if (!nodesDataSetRef.current || !edgesDataSetRef.current) return;
    const nodeUpdates = topologyData.nodes.map(n => ({
      id: n.id,
      color: { border: '#205AAA' },
      borderWidth: 2,
      size: 12,
      shadow: { enabled: false }
    }));
    nodesDataSetRef.current.update(nodeUpdates);
    
    const edgeUpdates = topologyData.edges.map(e => ({
      id: e.id,
      color: { color: '#848484' },
      width: 1,
      shadow: { enabled: false }
    }));
    edgesDataSetRef.current.update(edgeUpdates);
  };

  // 선택 초기화
  const handleReset = () => {
    interactionTracker.measureResponseSync(
      'OffensiveStrategyMini',
      'Reset Selection',
      () => {
        setSelectionStep(0);
        setTargetNode(null);
        setStartNode(null);
        setPathList([]);
        resetStyles();
      },
      {}
    );
  };

  // 경로 하이라이트 (2~3개 경로를 순위별 색상으로 표시)
  const highlightPaths = useMemo(() => {
    return () => {
      if (!nodesDataSetRef.current || !edgesDataSetRef.current || pathList.length === 0) return;
      
      const startNodeCurrent = startNodeRef.current;
      const targetNodeCurrent = targetNodeRef.current;
      
      // Physical ID -> Device name 매핑으로 Device 노드 찾기
      const physicalNameToDeviceId = new Map();
      topologyData.nodes.forEach(n => {
        if (n.name) physicalNameToDeviceId.set(n.name, n.id);
      });

      // 각 경로별 노드와 엣지 수집
      const allPathNodes = new Map(); // deviceNodeId -> { ranks, lowestRank }
      const allPathEdges = new Map(); // edgeId -> { ranks, lowestRank }

      pathList.forEach((path, pathIdx) => {
        const rank = pathIdx;
        
        path.forEach(node => {
          const deviceNodeId = physicalNameToDeviceId.get(node.name);
          if (deviceNodeId != null) {
            if (!allPathNodes.has(deviceNodeId)) {
              allPathNodes.set(deviceNodeId, { ranks: new Set(), lowestRank: rank });
            }
            allPathNodes.get(deviceNodeId).ranks.add(rank);
            if (rank < allPathNodes.get(deviceNodeId).lowestRank) {
              allPathNodes.get(deviceNodeId).lowestRank = rank;
            }
          }
        });

        // 엣지 - 양방향 모두 확인
        for (let i = 0; i < path.length - 1; i++) {
          const fromDeviceId = physicalNameToDeviceId.get(path[i].name);
          const toDeviceId = physicalNameToDeviceId.get(path[i + 1].name);
          
          if (fromDeviceId != null && toDeviceId != null) {
            // 정규화된 엣지 ID (항상 작은 ID - 큰 ID 순서)
            const edgeId = `${Math.min(fromDeviceId, toDeviceId)}-${Math.max(fromDeviceId, toDeviceId)}`;
            
            if (!allPathEdges.has(edgeId)) {
              allPathEdges.set(edgeId, { ranks: new Set(), lowestRank: rank });
            }
            allPathEdges.get(edgeId).ranks.add(rank);
            if (rank < allPathEdges.get(edgeId).lowestRank) {
              allPathEdges.get(edgeId).lowestRank = rank;
            }
          }
        }
      });

      // 노드 스타일 업데이트
      const nodeUpdates = topologyData.nodes.map(n => {
        const isStart = startNodeCurrent && n.id === startNodeCurrent.id;
        const isTarget = targetNodeCurrent && n.id === targetNodeCurrent.id;
        const nodeRankInfo = allPathNodes.get(n.id);

        if (isTarget) {
          return {
            id: n.id,
            size: 20,
            borderWidth: 4,
            color: { border: '#CC0000', background: '#FFE5E5' },
            shadow: { enabled: true, color: 'rgba(255, 0, 0, 0.8)', size: 15, x: 0, y: 0 }
          };
        } else if (isStart) {
          return {
            id: n.id,
            size: 18,
            borderWidth: 4,
            color: { border: '#00CC00', background: '#E5FFE5' },
            shadow: { enabled: true, color: 'rgba(0, 204, 0, 0.8)', size: 12, x: 0, y: 0 }
          };
        } else if (nodeRankInfo) {
          const lowestRank = nodeRankInfo.lowestRank;
          const colorInfo = rankColors[Math.min(lowestRank, rankColors.length - 1)];
          return {
            id: n.id,
            size: 16,
            borderWidth: 3,
            color: { border: colorInfo.border, background: '#FFFFFF' },
            shadow: { enabled: true, color: colorInfo.shadow, size: 10, x: 0, y: 0 }
          };
        } else {
          return {
            id: n.id,
            size: 10,
            borderWidth: 1,
            color: { border: 'rgba(100, 100, 100, 0.3)' },
            shadow: { enabled: false }
          };
        }
      });
      nodesDataSetRef.current.update(nodeUpdates);

      // 엣지 스타일 업데이트
      const edgeUpdates = topologyData.edges.map(e => {
        const edgeRankInfo = allPathEdges.get(e.id);
        
        if (edgeRankInfo) {
          const lowestRank = edgeRankInfo.lowestRank;
          const colorInfo = rankColors[Math.min(lowestRank, rankColors.length - 1)];
          return {
            id: e.id,
            color: { color: colorInfo.edge, highlight: colorInfo.edge, hover: colorInfo.edge },
            width: 4 - lowestRank * 0.5,
            shadow: { enabled: true, color: colorInfo.shadow, size: 8, x: 0, y: 0 }
          };
        } else {
          return {
            id: e.id,
            color: { color: 'rgba(100, 100, 100, 0.15)', highlight: 'rgba(100, 100, 100, 0.15)', hover: 'rgba(100, 100, 100, 0.15)' },
            width: 0.5,
            shadow: { enabled: false }
          };
        }
      });
      edgesDataSetRef.current.update(edgeUpdates);
    };
  }, [pathList, topologyData]);

  // 경로 변경 시 하이라이트 업데이트
  useEffect(() => {
    if (pathList.length > 0) {
      highlightPaths();
    }
  }, [pathList, highlightPaths]);

  // 토폴로지 렌더링
  useEffect(() => {
    if (!topologyRef.current || topologyData.nodes.length === 0) return;

    nodesDataSetRef.current = new DataSet(topologyData.nodes);
    edgesDataSetRef.current = new DataSet(topologyData.edges);

    const options = {
      nodes: {
        borderWidth: 2,
        shadow: true,
        font: { size: 8, color: '#7c3aed' }
      },
      edges: {
        width: 1,
        color: { color: '#848484', highlight: 'inherit' },
        smooth: { type: 'continuous' },
        selectionWidth: 0
      },
      physics: {
        enabled: true,
        solver: 'forceAtlas2Based',
        forceAtlas2Based: {
          gravitationalConstant: -30,
          centralGravity: 0.005,
          springLength: 80,
          springConstant: 0.08
        },
        stabilization: {
          enabled: true,
          iterations: 100,
          updateInterval: 25
        }
      },
      interaction: {
        hover: true,
        zoomView: true,
        dragView: true,
        dragNodes: false
      }
    };

    topologyNetRef.current = new Network(
      topologyRef.current,
      { nodes: nodesDataSetRef.current, edges: edgesDataSetRef.current },
      options
    );

    // 안정화 후 물리 엔진 끄기
    topologyNetRef.current.once('stabilized', () => {
      topologyNetRef.current.setOptions({ physics: { enabled: false } });
      topologyNetRef.current.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } });
    });

    // 노드 클릭 이벤트
    topologyNetRef.current.on('selectNode', async (params) => {
      const nid = params.nodes && params.nodes[0];
      if (!nid || !nodesDataSetRef.current) return;
      const node = nodesDataSetRef.current.get(nid);
      
      interactionTracker.measureResponseSync(
        'OffensiveStrategyMini',
        'Node Selection',
        () => {
          setSelectionStep(prev => {
            if (prev === 0) {
              // 목적지 선택
              setTargetNode(node);
              nodesDataSetRef.current.update({
                id: nid,
                color: { border: '#FF0000' },
                borderWidth: 3,
                size: 16
              });
              return 1;
            } else if (prev === 1) {
              // 출발지 선택
              const currentTarget = targetNodeRef.current;
              if (!currentTarget || nid === currentTarget.id) return prev;
              
              setStartNode(node);
              nodesDataSetRef.current.update({
                id: nid,
                color: { border: '#00CC00' },
                borderWidth: 3,
                size: 16
              });
              
              // 공격 경로 로드
              (async () => {
                const startPhysId = await resolvePhysicalIdByName(node.name);
                if (startPhysId != null) {
                  loadAttackPaths(startPhysId, currentTarget.name);
                }
              })();
              
              return 2;
            } else {
              // 이미 선택 완료 - 초기화 후 새 목적지 선택
              resetStyles();
              setTargetNode(node);
              setStartNode(null);
              setPathList([]);
              nodesDataSetRef.current.update({
                id: nid,
                color: { border: '#FF0000' },
                borderWidth: 3,
                size: 16
              });
              return 1;
            }
          });
        },
        { nodeId: nid, nodeName: node.name, selectionStep: selectionStep }
      );
    });

    return () => {
      if (topologyNetRef.current) {
        topologyNetRef.current.destroy();
        topologyNetRef.current = null;
        nodesDataSetRef.current = null;
        edgesDataSetRef.current = null;
      }
    };
  }, [topologyData]);

  if (loading) {
    return (
      <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F0EDFD' }}>
        <Typography variant="body2" color="text.secondary">Loading Topology...</Typography>
      </Box>
    );
  }

  if (topologyData.nodes.length === 0) {
    return (
      <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F0EDFD' }}>
        <Typography variant="body2" color="text.secondary">토폴로지 데이터 없음</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, bgcolor: '#F0EDFD', overflow: 'hidden' }}>
      {/* 상태 표시 */}
      <Box sx={{ position: 'absolute', bottom: 4, left: 4, zIndex: 10 }}>
        <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap">
          {selectionStep === 0 && (
            <Chip label="🎯 목적지 클릭" size="small" sx={{ fontSize: '10px', height: 20 }} />
          )}
          {selectionStep === 1 && (
            <>
              <Chip label={`🎯 ${targetNode?.label || ''}`} size="small" color="error" sx={{ fontSize: '10px', height: 20 }} />
              <Chip label="🚀 출발지 클릭" size="small" sx={{ fontSize: '10px', height: 20 }} />
            </>
          )}
          {selectionStep === 2 && (
            <>
              <Chip label={`🚀 ${startNode?.label || ''}`} size="small" color="success" sx={{ fontSize: '10px', height: 20 }} />
              <Chip label="→" size="small" sx={{ fontSize: '10px', height: 20, minWidth: 20 }} />
              <Chip label={`🎯 ${targetNode?.label || ''}`} size="small" color="error" sx={{ fontSize: '10px', height: 20 }} />
              {loadingPath ? (
                <Chip label="경로 탐색중..." size="small" sx={{ fontSize: '10px', height: 20 }} />
              ) : (
                <Chip label={`${pathList.length}개 경로`} size="small" color="primary" sx={{ fontSize: '10px', height: 20 }} />
              )}
              <Chip label="초기화" size="small" onClick={handleReset} sx={{ fontSize: '10px', height: 20, cursor: 'pointer' }} />
            </>
          )}
        </Stack>
      </Box>
      
      {/* 범례 */}
      {pathList.length > 0 && (
        <Box sx={{ position: 'absolute', top: 50, right: 4, zIndex: 10, bgcolor: 'rgba(255,255,255,0.9)', p: 0.5, borderRadius: 1 }}>
          <Stack spacing={0.25}>
            {pathList.slice(0, 3).map((_, idx) => (
              <Stack key={idx} direction="row" spacing={0.5} alignItems="center">
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: rankColors[idx].border }} />
                <Typography sx={{ fontSize: '9px' }}>{idx + 1}순위</Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
      )}
      
      <Box
        ref={topologyRef}
        sx={{
          width: '100%',
          height: '100%',
          '& .vis-network': {
            outline: 'none'
          }
        }}
      />
    </Box>
  );
};

export default memo(OffensiveStrategyMini);
