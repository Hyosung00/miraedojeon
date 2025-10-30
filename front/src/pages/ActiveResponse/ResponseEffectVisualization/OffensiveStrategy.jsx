// 노드 타입에 따른 이미지 경로 반환 함수 (TargetDashboard와 동일한 방식)
const getNodeImage = (node) => {
    // 다양한 데이터 구조 지원
    // 1. nodeInfo.nodeType (공격 그래프)
    // 2. node.properties.type (Device 토폴로지)
    // 3. node.props.type (공격 그래프의 props)
    let type = node?.nodeType || node?.type || node?.properties?.type || node?.props?.type;
    // title에 type이 있을 경우 파싱해서 추출
    if (!type && node?.title && typeof node.title === 'string') {
        try {
            const parsed = JSON.parse(node.title);
            if (parsed.type) type = parsed.type;
        } catch (e) {
            // title이 JSON이 아닐 수도 있으니 무시
        }
    }
    if (!type) {
        console.log('⚠️ No type found for node:', node);
        return '/image/switch.png';
    }
    // type을 소문자로 변환하여 비교 (대소문자 무시)
    const typeStr = String(type).toLowerCase();
    if (typeStr === 'switch') return '/image/switch.png';
    if (typeStr === 'workstation') return '/image/workstation.png';
    if (typeStr === 'server') return '/image/server.png';
    if (typeStr === 'router') return '/image/router.png';
    if (typeStr === 'firewall') return '/image/firewall.png';
    if (typeStr === 'laptop') return '/image/laptop.png';
    if (typeStr === 'printer') return '/image/printer.png';
    if (typeStr === 'sensor') return '/image/sensor.png';
    if (typeStr === 'plc') return '/image/plc.png';
    // 알 수 없는 타입
    console.log('⚠️ Unknown type:', type, 'for node:', node);
    return '/image/switch.png';
};
// src/OffensiveStrategy.jsx
import { useState, useEffect, useRef } from "react";
import neo4j from "neo4j-driver";
import { DataSet } from "vis-data";
import { Network } from "vis-network/standalone";
import "vis-network/styles/vis-network.css";
import { Box, Typography, Card, CardContent, Grid, IconButton, Button } from '@mui/material';
import { MinusOutlined, PlusOutlined } from '@ant-design/icons';
import './OS.css';

const driver = neo4j.driver(
    "neo4j+s://eff16eb9.databases.neo4j.io",
    neo4j.auth.basic("neo4j", "_G6MBldCj1gGO_hWjogaMJpleFbjuSZKlMHohGucVrA")
);

async function fetchData(queryString = "MATCH (n) RETURN n LIMIT 25", params = {}) {
    const session = driver.session();
    try {
        const result = await session.run(queryString, params);
        return result.records;
    } finally {
        await session.close();
    }
}



function OffensiveStrategy({ deviceElementId, onSelectDevice }) {
    // topology: Device 노드들(좌측)
    const topologyRef = useRef(null);
    const topologyNetRef = useRef(null);
    const [topologyData, setTopologyData] = useState({ nodes: [], edges: [] });
    const [topologyMinimized, setTopologyMinimized] = useState(false);

    // 초기 토폴로지 스냅샷
    const initialTopologyRef = useRef(null);

    // 노드 위치 저장
    const nodePositionsRef = useRef(null);

    // attack graph: 메인 영역
    const attackRef = useRef(null);
    const attackNetRef = useRef(null);
    const [attackGraphData, setAttackGraphData] = useState({ nodes: [], edges: [] });
    const [loadingAttack, setLoadingAttack] = useState(false);

    // 선택된 시작 노드(Physical 내부 id)
    const [selectedStartNode, setSelectedStartNode] = useState(null);

    // 우측 패널 상태
    const [pathList] = useState([]);
    const [selectedPath, setSelectedPath] = useState(null);
    const [calculationLogs] = useState([]);

    // 부모 미제공 시 내부 선택값
    const [internalSelected, setInternalSelected] = useState(null);
    const effectiveElementId = deviceElementId ?? internalSelected;

    // 재사용 refs
    const topologyNodesRef = useRef(null);
    const topologyEdgesRef = useRef(null);
    const onSelectDeviceRef = useRef(onSelectDevice);

    // 안정화 refs
    const attackGraphDataRef = useRef(attackGraphData);
    const loadingAttackRef = useRef(loadingAttack);

    useEffect(() => { attackGraphDataRef.current = attackGraphData; }, [attackGraphData]);
    useEffect(() => { loadingAttackRef.current = loadingAttack; }, [loadingAttack]);
    useEffect(() => { onSelectDeviceRef.current = onSelectDevice; }, [onSelectDevice]);

    // Device elementId -> Physical 내부 id 조회
    const resolvePhysicalIdByElementId = async (elementId) => {
        if (!elementId) return null;
        console.log("Resolving Physical id for Device elementId:", elementId);
        const recs = await fetchData(
            `MATCH (p:Physical {id:$pid, project:'multi-layer'}) RETURN id(p) AS pid`,
            { pid: `ml:${elementId}` }
        );
        if (!recs?.length) return null;
        const v = recs[0].get("pid");
        return neo4j.isInt?.(v) ? v.toNumber() : v;
    };

    // 1) 초기 Device 토폴로지 로드
    useEffect(() => {
        const query = `
      MATCH (d:Device{project:"facility"})
      OPTIONAL MATCH (d)-[r:CONNECTED{project:"facility"}]-(d2:Device{project:"facility"})
      RETURN d, r, d2
    `;

        fetchData(query)
            .then((recs) => {
                const nodesMap = new Map();
                const edgesMap = new Map();

                const idOf = (entity) => {
                    if (!entity) return null;
                    const id = entity.identity;
                    return id && typeof id.toNumber === "function" ? id.toNumber() : id;
                };
                const labelOf = (entity) => {
                    if (!entity) return "";
                    const props = entity.properties || {};
                    return props.name || props.label || (entity.labels && entity.labels[0]) || props.id || String(idOf(entity));
                };

                for (const rec of recs) {
                    const d = rec.get("d");
                    const r = rec.get("r");
                    const d2 = rec.get("d2");

                    const dId = idOf(d);
                    if (d && dId != null && !nodesMap.has(dId)) {
                        nodesMap.set(dId, {
                            id: dId,
                            label: labelOf(d),
                            elementId: d.elementId,
                            group: "Device",
                            title: JSON.stringify(d.properties || {}, null, 2),
                            shape: "image",
                            image: getNodeImage(d),
                            size: 12,
                            color: { border: "#205AAA" },
                            font: { color: "#7c3aed" }
                        });
                    }

                    if (d2) {
                        const d2Id = idOf(d2);
                        if (d2Id != null && !nodesMap.has(d2Id)) {
                            nodesMap.set(d2Id, {
                                id: d2Id,
                                label: labelOf(d2),
                                elementId: d2.elementId,
                                group: "Device",
                                title: JSON.stringify(d2.properties || {}, null, 2),
                                shape: "image",
                                image: getNodeImage(d2),
                                size: 12,
                                color: { border: "#205AAA" },
                                font: { color: "#7c3aed" }
                            });
                        }

                        if (r && dId != null && d2Id != null) {
                            const a = Math.min(dId, d2Id);
                            const b = Math.max(dId, d2Id);
                            const edgeKey = `${a}-${b}`;
                            if (!edgesMap.has(edgeKey)) {
                                edgesMap.set(edgeKey, { id: edgeKey, from: a, to: b, color: { color: "#848484" }, width: 1 });
                            }
                        }
                    }
                }

                const nodesArr = Array.from(nodesMap.values());
                const edgesArr = Array.from(edgesMap.values());
                setTopologyData({ nodes: nodesArr, edges: edgesArr });

                if (!initialTopologyRef.current) {
                    initialTopologyRef.current = {
                        nodes: nodesArr.map(n => ({ ...n })),
                        edges: edgesArr.map(e => ({ ...e }))
                    };
                }
            })
            .catch(console.error);
    }, []);

    // 2) 공격 그래프 로드(시작노드 선택 시 제약 적용)
    useEffect(() => {
        let canceled = false;
        const toNum = (v) => (neo4j.isInt?.(v) ? v.toNumber() : v);

        if (!effectiveElementId) {
            const prevAG = attackGraphDataRef.current || { nodes: [], edges: [] };
            if ((prevAG.nodes && prevAG.nodes.length) || (prevAG.edges && prevAG.edges.length)) {
                setAttackGraphData({ nodes: [], edges: [] });
            }
            if (loadingAttackRef.current) setLoadingAttack(false);
            if (selectedStartNode !== null) setSelectedStartNode(null);
            return;
        }

        const targetPhysicalId = `ml:${effectiveElementId}`;

        if (!loadingAttackRef.current) setLoadingAttack(true);
        const startId = selectedStartNode;

        // 직접 경로 + 경유 노드 명시적 방문 경로
        const query = `
  // 1. 직접 경로
  CALL {
    MATCH (start:Physical {project:'multi-layer'}), (target:Physical {id:$targetPhysicalId, project:'multi-layer'})
    WHERE id(start) = $startId
    
    MATCH p = (start)-[:CONNECTED*1..10]-(target)
    WHERE ALL(r IN relationships(p) WHERE r.project = 'multi-layer')
      AND size(nodes(p)) = size(apoc.coll.toSet(nodes(p)))
    
    WITH start, target, nodes(p) AS pathNodes
    LIMIT 10
    
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
  WITH start, target, pathNodes, idx,
       {
         id: id(n),
         props: properties(n),
         labels: labels(n),
         deg: deg,
         nodeType: nodeType,
         ip: nodeIp,
         name: nodeName,
         nodeId: nodeId
       } AS nodeInfo
  ORDER BY idx
  
  WITH start, target, collect(nodeInfo) AS orderedNodeInfos
  RETURN start, target, orderedNodeInfos
  
  UNION
  
  // 2. 경유 노드를 거치는 경로
  CALL {
    MATCH (start:Physical {project:'multi-layer'}), (target:Physical {id:$targetPhysicalId, project:'multi-layer'})
    WHERE id(start) = $startId
    
    // 다른 서브넷의 엔드포인트 찾기
    MATCH (via:Physical {project:'multi-layer'})
    WHERE via <> start AND via <> target
      AND properties(via).type IS NOT NULL
      AND toLower(toString(properties(via).type)) <> 'switch'
      AND toLower(toString(properties(via).type)) <> 'router'
      AND properties(start).ip IS NOT NULL
      AND properties(via).ip IS NOT NULL
      // 시작과 다른 서브넷
      AND split(properties(start).ip, '.')[0..1] <> split(properties(via).ip, '.')[0..1]
    
    WITH start, target, via
    ORDER BY rand()
    LIMIT 5
    
    // start -> via
    MATCH p1 = shortestPath((start)-[:CONNECTED*]-(via))
    WHERE ALL(r IN relationships(p1) WHERE r.project = 'multi-layer')
    
    // via -> target
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
  WITH start, target, pathNodes, idx,
       {
         id: id(n),
         props: properties(n),
         labels: labels(n),
         deg: deg,
         nodeType: nodeType,
         ip: nodeIp,
         name: nodeName,
         nodeId: nodeId
       } AS nodeInfo
  ORDER BY idx
  
  WITH start, target, collect(nodeInfo) AS orderedNodeInfos
  
  RETURN 
    start,
    target,
    orderedNodeInfos
  LIMIT 50
`;

        fetchData(query, { targetPhysicalId, startId })
            .then((recs) => {
                if (canceled) return;

                console.log("=== Query returned", recs.length, "path(s) ===");

                if (!recs || recs.length === 0) {
                    console.log("⚠️ No paths found");
                    const fallbackNodes = [];
                    if (startId != null) {
                        fallbackNodes.push({
                            id: startId,
                            label: `Start`,
                            group: "StartPhysical",
                            title: "",
                            shape: "image",
                            image: getNodeImage({ properties: {} }),
                            size: 20,
                            color: { border: "#00CC00" },
                            font: { color: "#7c3aed" },
                            properties: {},
                        });
                    }

                    const newAttackEmpty = {
                        nodes: fallbackNodes,
                        edges: [],
                        pathsMap: new Map(),
                        targetNodeId: null,
                        allStartNodes: new Set([startId]),
                        nodeConnections: new Map(),
                    };
                    setAttackGraphData(newAttackEmpty);
                    if (loadingAttackRef.current) setLoadingAttack(false);
                    return;
                }

                // 모든 경로를 하나의 그래프로 통합
                const nodesMap = new Map(); // originalId -> node
                const edgesSet = new Set(); // "fromId-toId" 형태
                const allEdges = [];
                let targetId = null;

                // 각 노드의 경로별 순서 추적 (nodeId -> [순서들])
                const nodePathPositions = new Map();

                for (let pathIdx = 0; pathIdx < recs.length; pathIdx++) {
                    const rec = recs[pathIdx];
                    const targetNode = rec.get("target");
                    const orderedNodeInfos = rec.get("orderedNodeInfos") || [];

                    targetId = targetId ?? (targetNode?.identity ? toNum(targetNode.identity) : null);

                    console.log(`\n📍 Path ${pathIdx + 1}/${recs.length}: ${orderedNodeInfos.length} nodes`);

                    // 첫 경로의 첫 노드 props 확인
                    if (pathIdx === 0 && orderedNodeInfos.length > 0) {
                        console.log('🔍 First node full data:', orderedNodeInfos[0]);
                    }

                    // ===== 엔드포인트 중복 제거 + 연속 중복 노드 제거 =====
                    const endpointIds = new Set();
                    const filteredNodeInfos = [];

                    for (let idx = 0; idx < orderedNodeInfos.length; idx++) {
                        const nodeInfo = orderedNodeInfos[idx];
                        const nodeId = toNum(nodeInfo.id);
                        const nodeType = nodeInfo.nodeType;
                        const typeStr = nodeType ? String(nodeType).toLowerCase() : '';
                        const isSwitchOrRouter = typeStr.includes('switch') || typeStr.includes('router');

                        // 자기 자신이 연속으로 나오는 경우 제거 (모든 노드 타입)
                        if (filteredNodeInfos.length > 0) {
                            const lastNodeId = toNum(filteredNodeInfos[filteredNodeInfos.length - 1].id);
                            if (nodeId === lastNodeId) {
                                console.log(`  ⚠️ Skipping consecutive duplicate node: ${nodeInfo.name || nodeId}`);
                                continue;
                            }
                        }

                        // 스위치/라우터는 항상 포함 (연속 중복만 제거됨)
                        if (isSwitchOrRouter) {
                            filteredNodeInfos.push(nodeInfo);
                        } else {
                            // 엔드포인트는 경로 전체에서 중복 체크
                            if (!endpointIds.has(nodeId)) {
                                endpointIds.add(nodeId);
                                filteredNodeInfos.push(nodeInfo);
                            } else {
                                console.log(`  ⚠️ Skipping duplicate endpoint: ${nodeInfo.name || nodeId}`);
                            }
                        }
                    }

                    // 중복 제거 후 노드가 2개 미만이면 경로 건너뛰기
                    if (filteredNodeInfos.length < 2) {
                        console.log(`  ❌ Path rejected: too few nodes after deduplication (${filteredNodeInfos.length})`);
                        continue;
                    }
                    // ===== 중복 제거 끝 =====

                    const pathNodeLabels = [];
                    let viaCount = 0;
                    const nodeTypeDebug = [];

                    // 중복 제거된 노드들로 경로 구성 + 경로 내 순서 기록
                    for (let i = 0; i < filteredNodeInfos.length; i++) {
                        const nodeInfo = filteredNodeInfos[i];
                        const originalId = toNum(nodeInfo.id);

                        // 이 경로에서 노드의 순서(위치) 기록
                        if (!nodePathPositions.has(originalId)) {
                            nodePathPositions.set(originalId, []);
                        }
                        nodePathPositions.get(originalId).push(i);

                        // ...existing code...

                        const isStart = originalId === startId;
                        const isTarget = originalId === targetId;

                        // 경유 노드 판별: switch/router 아님 && 시작/목표 제외
                        const nodeType = nodeInfo.nodeType;
                        const typeStr = nodeType ? String(nodeType).toLowerCase() : '';
                        const isSwitchOrRouter = typeStr.includes('switch') || typeStr.includes('router');
                        const isVia = !isStart && !isTarget && !isSwitchOrRouter;

                        if (isVia) viaCount++;

                        const label = nodeInfo.name || nodeInfo.props?.name || nodeInfo.props?.label ||
                            nodeInfo.labels?.[0] || nodeInfo.nodeId || nodeInfo.props?.id || String(originalId);

                        // IP 주소 사용 (Cypher에서 명시적으로 추출한 값)
                        const ip = nodeInfo.ip || nodeInfo.props?.ip || 'N/A';
                        const subnet = ip !== 'N/A' && ip.includes('.') ? ip.substring(0, ip.lastIndexOf('.')) : 'N/A';

                        // 디버깅: 각 노드의 타입 정보 수집
                        nodeTypeDebug.push({
                            label,
                            type: nodeType || 'NULL',
                            ip,
                            subnet,
                            isVia,
                            isStart,
                            isTarget
                        });

                        pathNodeLabels.push(label + (isVia ? '(경유)' : ''));

                        // 노드가 없으면 추가
                        if (!nodesMap.has(originalId)) {
                            let nodeColor, nodeSize, nodeGroup;
                            if (isTarget) {
                                nodeColor = { border: "#CC0000" };
                                nodeSize = 25;
                                nodeGroup = "TargetPhysical";
                            } else if (isStart) {
                                nodeColor = { border: "#00CC00" };
                                nodeSize = 20;
                                nodeGroup = "StartPhysical";
                            } else if (isVia) {
                                nodeColor = { border: "#FF8C00" };
                                nodeSize = 18;
                                nodeGroup = "ViaPhysical";
                            } else {
                                nodeColor = { border: "#205AAA" };
                                nodeSize = 15;
                                nodeGroup = "Physical";
                            }

                                const nodeData = {
                                    id: originalId,
                                    label: label,
                                    group: nodeGroup,
                                    title: JSON.stringify(nodeInfo.props || {}, null, 2),
                                    shape: "image",
                                    image: getNodeImage(nodeInfo),
                                    size: nodeSize,
                                    color: nodeColor,
                                    properties: nodeInfo.props,
                                    font: { color: "#7c3aed" },
                                };

                            // 경유 노드만 랜덤 X 좌표 설정 (Y는 hierarchical layout이 level에 따라 자동 배치)
                            if (!isTarget && !isStart) {
                                nodeData.x = Math.random() * 1600 - 1200;  // -800 ~ 800 범위
                                nodeData.physics = false;  // 물리 시뮬레이션 비활성화하여 X 좌표 고정
                            }

                            nodesMap.set(originalId, nodeData);
                        }

                        // 이전 노드와 엣지 연결
                        if (i > 0) {
                            const prevNodeInfo = filteredNodeInfos[i - 1];
                            const prevId = toNum(prevNodeInfo.id);
                            const edgeKey = `${prevId}-${originalId}`;

                            if (!edgesSet.has(edgeKey)) {
                                edgesSet.add(edgeKey);
                                allEdges.push({
                                    id: edgeKey,
                                    from: prevId,
                                    to: originalId,
                                    arrows: "to",
                                    color: { color: "#FFD700" },
                                    width: 3,
                                    title: "Attack Path"
                                });
                            }
                        }
                    }

                    console.log(`  ✅ Path (${viaCount}개 경유${viaCount === 0 ? ' - 직접 경로' : ''}): ${pathNodeLabels.join(' → ')}`);
                    console.log(`  📊 Subnets:`, nodeTypeDebug.map(n => `${n.label}(${n.subnet})`).join(' → '));
                    if (viaCount > 0) {
                        console.log(`  🔍 Via node details:`, nodeTypeDebug.filter(n => n.isVia));
                    }
                }

                console.log(`\n✅ Merged graph: ${nodesMap.size} nodes, ${allEdges.length} edges from ${recs.length} path(s)`);

                // 각 노드의 평균 level 계산 및 반올림 (목표 노드 제외)
                nodesMap.forEach((node, nodeId) => {
                    if (nodeId === targetId) {
                        // 목표 노드는 나중에 처리
                        node.tempLevel = 999999;  // 임시로 큰 값
                        return;
                    }
                    const positions = nodePathPositions.get(nodeId);
                    if (positions && positions.length > 0) {
                        const avgLevel = positions.reduce((sum, pos) => sum + pos, 0) / positions.length;
                        node.tempLevel = Math.round(avgLevel);  // 임시 레벨 저장
                    } else {
                        node.tempLevel = 0;
                    }
                });

                // 모든 고유한 tempLevel 값을 수집하고 정렬 (목표 노드의 999999 제외)
                const uniqueLevels = [...new Set(Array.from(nodesMap.values())
                    .filter(n => n.tempLevel !== 999999)
                    .map(n => n.tempLevel))].sort((a, b) => a - b);

                // tempLevel -> 순차 레벨(1부터 시작) 매핑 생성
                const levelMapping = new Map();
                uniqueLevels.forEach((tempLevel, index) => {
                    levelMapping.set(tempLevel, index + 1);
                });

                console.log('📊 Level mapping:', Object.fromEntries(levelMapping));

                // 각 노드에 순차 레벨 할당 (목표 노드 제외)
                let maxLevel = 0;
                nodesMap.forEach((node, nodeId) => {
                    if (nodeId === targetId) {
                        // 목표 노드는 건너뛰기
                        return;
                    }
                    const positions = nodePathPositions.get(nodeId);
                    if (positions && positions.length > 0) {
                        const avgLevel = positions.reduce((sum, pos) => sum + pos, 0) / positions.length;
                        const roundedLevel = Math.round(avgLevel);
                        node.level = levelMapping.get(roundedLevel);
                        if (node.level > maxLevel) maxLevel = node.level;
                        console.log(`📊 Node ${node.label}: positions=${positions.join(',')}, avgLevel=${avgLevel.toFixed(2)}, roundedLevel=${roundedLevel}, finalLevel=${node.level}`);
                    } else {
                        node.level = 1;  // 기본값 1
                    }
                    delete node.tempLevel;  // 임시 레벨 제거
                });

                // 목표 노드를 최고 레벨로 강제 설정
                if (targetId) {
                    const targetNode = nodesMap.get(targetId);
                    if (targetNode) {
                        targetNode.level = maxLevel + 1;
                        delete targetNode.tempLevel;  // 임시 레벨 제거
                        console.log(`🎯 Target node ${targetNode.label} forced to highest level: ${targetNode.level}`);
                    }
                }

                const newAttack = {
                    nodes: Array.from(nodesMap.values()),
                    edges: allEdges,
                    pathsMap: new Map([[startId, new Set(allEdges.map(e => e.id))]]),
                    targetNodeId: targetId,
                    allStartNodes: new Set([startId]),
                    nodeConnections: new Map(),
                    pathCount: recs.length
                };

                setAttackGraphData(newAttack);
                if (loadingAttackRef.current) setLoadingAttack(false);
            })
            .catch((e) => {
                console.error(e);
                setLoadingAttack(false);
            });

        return () => { canceled = true; };
    }, [effectiveElementId, selectedStartNode]);

    // 3) 좌측 Device topology 렌더링
    useEffect(() => {
        if (!topologyRef.current) return;

        // 최초 1회 생성
        if (!topologyNetRef.current) {
            const baseTopology = initialTopologyRef.current ?? topologyData;

            topologyNodesRef.current = new DataSet((baseTopology.nodes || []).map(n => {
                const copy = { ...n };
                copy.shape = 'image';
                copy.image = getNodeImage(copy);
                copy.borderWidth = 2;
                copy.size = copy.size ?? 20;
                copy.color = { border: "#205AAA" };
                copy.font = { color: "#7c3aed" };
                return copy;
            }));
            topologyEdgesRef.current = new DataSet((baseTopology.edges || []).map(e => ({ ...e })));

            const data = { nodes: topologyNodesRef.current, edges: topologyEdgesRef.current };
            const options = {
                interaction: { hover: true, multiselect: false },
                nodes: { 
                    shape: "image",
                    brokenImage: getNodeImage({}),
                    size: 30,
                    borderWidth: 2,
                    color: { border: "#b39ddb" },
                    font: { size: 10, color: "#7c3aed" }
                },
                edges: { smooth: { enabled: false } },
                physics: { stabilization: true }
            };

            topologyNetRef.current = new Network(topologyRef.current, data, options);

            // 위치 복원/저장
            if (nodePositionsRef.current) {
                topologyNetRef.current.setOptions({ physics: false, edges: { smooth: { enabled: false } } });
                Object.keys(nodePositionsRef.current).forEach(nodeId => {
                    try {
                        topologyNetRef.current.moveNode(nodeId, nodePositionsRef.current[nodeId].x, nodePositionsRef.current[nodeId].y);
                    } catch (err) {
                        console.debug(err);
                    }
                });
            } else {
                topologyNetRef.current.once("stabilizationIterationsDone", () => {
                    if (topologyNetRef.current) {
                        nodePositionsRef.current = topologyNetRef.current.getPositions();
                        topologyNetRef.current.setOptions({ physics: false, edges: { smooth: { enabled: false } } });
                    }
                });
            }

            // 클릭: 목표가 있으면 시작 노드 선택으로 처리(Physical id로 매핑)
            topologyNetRef.current.on("selectNode", async (params) => {
                const nid = params.nodes && params.nodes[0];
                if (!nid) return;
                const node = topologyNodesRef.current.get(nid);

                if (effectiveElementId) {
                    const physId = await resolvePhysicalIdByElementId(node?.elementId);
                    if (physId != null) {
                        setSelectedStartNode(physId);
                    } else {
                        console.warn("No Physical id found for Device:", node?.elementId);
                    }
                }
            });

            if (topologyMinimized) return;
        }

        // 데이터셋 업데이트
        try {
            const baseTopology = initialTopologyRef.current ?? topologyData;

            // 경로에 포함된 모든 노드 elementId 세트 생성 (주황색 표시용)
            const pathNodeElementIds = new Set();
            if (attackGraphData.nodes) {
                attackGraphData.nodes.forEach(n => {
                    // 시작/목표 노드 제외, 경로에 포함된 모든 중간 노드
                    if (n.group !== "StartPhysical" && n.group !== "TargetPhysical" && n.properties && n.properties.id) {
                        const elemId = n.properties.id.startsWith("ml:")
                            ? n.properties.id.slice(3)
                            : n.properties.id;
                        pathNodeElementIds.add(elemId);
                    }
                });
            }

            // originalId를 기준으로 시작 노드 찾기 (시퀀스 모드 지원)
            const startNodeOriginalId = attackGraphData.nodes?.find(p =>
                p.id === selectedStartNode || p.originalId === selectedStartNode
            )?.originalId || selectedStartNode;

            const nodesToShow = (baseTopology.nodes || []).map(n => {
                const copy = { ...n };

                let isStartSelected = false;
                if (selectedStartNode != null && startNodeOriginalId != null) {
                    const phys = attackGraphData.nodes?.find(p =>
                        p.originalId === startNodeOriginalId || p.id === startNodeOriginalId
                    );
                    if (phys && phys.properties && typeof phys.properties.id === "string") {
                        const physElementId = phys.properties.id.startsWith("ml:") ? phys.properties.id.slice(3) : phys.properties.id;
                        if (physElementId === copy.elementId) isStartSelected = true;
                    }
                    if (!isStartSelected && copy.id === startNodeOriginalId) isStartSelected = true;
                }

                const isTarget = effectiveElementId && copy.elementId === effectiveElementId;
                const isInPath = copy.elementId && pathNodeElementIds.has(copy.elementId);

                // 이미지와 라벨 색상 적용
                copy.shape = 'image';
                copy.image = getNodeImage(copy);
                copy.font = { color: "#7c3aed" };
                copy.borderWidth = 2;
                
                copy.color = { border: "#205AAA" };
                copy.size = copy.size ?? 12;
                if (isTarget) { copy.color = { border: "#CC0000" }; copy.size = 25; }
                else if (isStartSelected) { copy.color = { border: "#00FF00" }; copy.size = 20; }
                else if (isInPath) { copy.color = { border: "#FF8C00" }; copy.size = 18; }
                return copy;
            });

            const edgesToShow = (baseTopology.edges || []).map(e => ({ ...e }));

            topologyNodesRef.current.clear();
            topologyEdgesRef.current.clear();
            topologyNodesRef.current.add(nodesToShow);
            topologyEdgesRef.current.add(edgesToShow);
        } catch (err) {
            console.error("Failed to update topology datasets:", err);
        }

        // 위치 복원
        if (nodePositionsRef.current && topologyNetRef.current) {
            topologyNetRef.current.setOptions({ physics: false });
            Object.keys(nodePositionsRef.current).forEach(nodeId => {
                try {
                    topologyNetRef.current.moveNode(nodeId, nodePositionsRef.current[nodeId].x, nodePositionsRef.current[nodeId].y);
                } catch (err) {
                    console.debug(err);
                }
            });
        }

        // 언마운트 시 파괴
        return () => {
            if (topologyNetRef.current) {
                topologyNetRef.current.destroy();
                topologyNetRef.current = null;
                topologyNodesRef.current = null;
                topologyEdgesRef.current = null;
            }
        };
    }, [topologyData, selectedStartNode, attackGraphData, attackGraphData?.nodes, effectiveElementId, topologyMinimized]);

    // 4) 메인(공격/토폴로지) 렌더링
    useEffect(() => {
        if (!attackRef.current) return;

        if (attackNetRef.current) {
            attackNetRef.current.destroy();
            attackNetRef.current = null;
        }

        const baseTopology = initialTopologyRef.current ?? topologyData;

        let nodesToShow;
        let edgesToShow;
        let isFiltered = false;
        let options = {
            interaction: { hover: true, multiselect: false },
            nodes: { 
                shape: "image",
                brokenImage: getNodeImage({}),
                size: 30,
                borderWidth: 2,
                color: { border: "#b39ddb" },
                font: { size: 18, color: "#7c3aed" }
            },
            edges: { smooth: selectedStartNode ? {
                    enabled: true,
                    type: 'dynamic',
                    roundness: 0.5
                } : {
                    enabled: false
                } },
            physics: {
                stabilization: true,
                barnesHut: {
                    gravitationalConstant: -8000,
                    springConstant: 0.04,
                    springLength: 95
                }
            }
        };

        if (!selectedStartNode) {
            nodesToShow = (effectiveElementId ? (baseTopology.nodes || []).map(n => {
                const copy = { ...n };
                if (copy.elementId && copy.elementId === effectiveElementId) {
                    copy.color = { border: "#9f1515" };
                    copy.size = 25;
                }
                copy.shape = 'image';
                copy.image = getNodeImage(copy);
                copy.font = { color: "#7c3aed" };
                return copy;
            }) : (baseTopology.nodes || []).map(n => {
                const copy = { ...n };
                copy.shape = 'image';
                copy.image = getNodeImage(copy);
                copy.font = { color: "#7c3aed" };
                return copy;
            }));
            edgesToShow = (baseTopology.edges || []).map(e => ({ ...e }));
            options.physics.enabled = true;
        } else {
            nodesToShow = attackGraphData.nodes ? attackGraphData.nodes.map(n => {
                const copy = { ...n };
                copy.shape = 'image';
                copy.image = getNodeImage(copy);
                copy.borderWidth = 2;
                copy.size = copy.size ?? 20;
                copy.color = copy.color || { border: "#2B7CE9" };
                copy.font = { color: "#7c3aed" };
                return copy;
            }) : [];
            edgesToShow = attackGraphData.edges ? attackGraphData.edges.map(e => ({ ...e })) : [];

            if (attackGraphData.pathsMap) {
                const pathEdges = attackGraphData.pathsMap.get(selectedStartNode);
                if (pathEdges && pathEdges.size > 0) {
                    isFiltered = true;
                    const filteredEdges = edgesToShow.filter(edge => pathEdges.has(edge.id));
                    const nodeIds = new Set([selectedStartNode, attackGraphData.targetNodeId]);
                    filteredEdges.forEach(e => { nodeIds.add(e.from); nodeIds.add(e.to); });

                    edgesToShow = filteredEdges;

                    nodesToShow = nodesToShow
                        .filter(n => nodeIds.has(n.id))
                        .map(n => {
                            // 이미 계산된 level 사용 (경로별 순서의 평균값)
                            // level은 nodesMap에서 이미 설정되어 있음

                            if (n.id === selectedStartNode) {
                                return { ...n, color: { border: "#00CC00" }, size: 20 };
                            } else if (n.id === attackGraphData.targetNodeId) {
                                return { ...n, color: { border: "#CC0000" }, size: 25 };
                            } else if (n.group === "ViaPhysical") {
                                // 경유 노드는 주황색 유지
                                return { ...n, color: { border: "#FF8C00" }, size: 18 };
                            } else {
                                // 기타 중간 노드도 주황색으로 표시
                                return { ...n, color: { border: "#FF8C00" }, size: 16 };
                            }
                        });
                }
            }

            options.layout = isFiltered ? {
                hierarchical: {
                    enabled: true,
                    direction: "DU",  // Down(시작) -> Up(목표) 방향
                    sortMethod: "directed",
                    levelSeparation: 100,  // 수직 간격 줄임 (더 촘촘하게)
                    nodeSpacing: 300,  // 수평 간격 대폭 증가 (같은 레벨)
                    treeSpacing: 350,  // 트리 브랜치 간격 증가 (다른 경로)
                    blockShifting: true,
                    edgeMinimization: false,  // 엣지 최소화 비활성화로 더 퍼지게
                    parentCentralization: false  // 부모 중앙 정렬 비활성화로 더 자유롭게 배치
                }
            } : {};
            options.physics.enabled = !isFiltered;
        }

        const nodes = new DataSet(nodesToShow);
        const edges = new DataSet(edgesToShow);
        const data = { nodes, edges };

        attackNetRef.current = new Network(attackRef.current, data, options);

        if (!selectedStartNode) {
            if (nodePositionsRef.current) {
                attackNetRef.current.setOptions({ physics: false });
                Object.keys(nodePositionsRef.current).forEach(nodeId => {
                    try {
                        attackNetRef.current.moveNode(nodeId, nodePositionsRef.current[nodeId].x, nodePositionsRef.current[nodeId].y);
                    } catch (err) {
                        console.debug(err);
                    }
                });
            } else {
                attackNetRef.current.once("stabilizationIterationsDone", () => {
                    if (attackNetRef.current) {
                        nodePositionsRef.current = attackNetRef.current.getPositions();
                        attackNetRef.current.setOptions({ physics: false });
                    }
                });
            }
        }

        attackNetRef.current.on("selectNode", async (params) => {
            const nid = params.nodes && params.nodes[0];
            if (!nid) return;
            const node = nodes.get(nid);

            if (effectiveElementId) {
                // Device 노드를 클릭한 경우 Physical id 로 변환
                if (node?.elementId) {
                    const physId = await resolvePhysicalIdByElementId(node.elementId);
                    if (physId != null) {
                        setSelectedStartNode(physId);
                        return;
                    }
                }
                // 이미 Physical 노드가 보이는 상태라면 그대로 설정
                if (node && (node.group === "StartPhysical" || attackGraphData.allStartNodes?.has(nid))) {
                    setSelectedStartNode(nid);
                }
            } else {
                const elementIdFull = node && node.elementId;
                if (onSelectDeviceRef.current) {
                    onSelectDeviceRef.current(elementIdFull);
                } else {
                    setInternalSelected(elementIdFull);
                }
            }
        });

        return () => {
            if (attackNetRef.current && selectedStartNode) {
                attackNetRef.current.destroy();
                attackNetRef.current = null;
            }
        };
    }, [attackGraphData, selectedStartNode, effectiveElementId, topologyData, onSelectDevice]);

    // styles
    const containerStyle = {
        width: '100%',
        height: 'calc(100vh - 120px)',
        margin: 0,
        padding: 0
    };

    return (
        <Card 
            component="main"
            role="main"
            aria-label="공격 경로 시각화"
            className="offensive-strategy-container"
            sx={{
                width: '100%',
                height: 'calc(100vh - 120px)',
                bgcolor: 'background.paper',
                boxShadow: 3,
                m: 0
            }}
        >
            <CardContent sx={{
                p: 1,
                height: '100%',
                '&:last-child': { pb: 1 },
                display: 'flex',
                flexDirection: { xs: 'column', lg: 'row' },
                gap: 1,
                overflow: 'hidden'
            }}>
                {/* 메인 공격 그래프 영역 */}
                <Card 
                    component="section"
                    aria-label="공격 그래프 영역"
                    className="attack-graph-section"
                    sx={{
                        flex: 1,
                        position: 'relative',
                        overflow: 'hidden',
                        height: '100%'
                    }}
                >
                    <CardContent sx={{ p: 0, height: '100%', '&:last-child': { pb: 0 }, position: 'relative' }}>
                        {/* 상단 상태 바 */}
                        <Box className="status-bar">
                            <Typography variant="caption" color="inherit">
                                {loadingAttack
                                    ? "공격 그래프 로딩 중..."
                                    : effectiveElementId
                                        ? `공격 목표: ${effectiveElementId}${selectedStartNode ? " (시작 노드 선택됨)" : ""}`
                                        : "공격 목표 미선택"}
                            </Typography>
                            {selectedStartNode && (
                                <Button
                                    size="small"
                                    variant="contained"
                                    onClick={() => setSelectedStartNode(null)}
                                    sx={{
                                        bgcolor: '#4CAF50',
                                        color: 'white',
                                        '&:hover': {
                                            bgcolor: '#45a049'
                                        },
                                        fontSize: 11,
                                        py: 0.5,
                                        px: 1.5
                                    }}
                                >
                                    모든 시작 노드 표시
                                </Button>
                            )}
                        </Box>

                        <div
                            ref={attackRef}
                            role="img"
                            aria-label="공격 경로를 표시하는 네트워크 그래프"
                            className="attack-graph-canvas"
                        />

                        {/* 하단 범례 */}
                        <Box className="legend-box">
                            <ul className="legend-list" role="list">
                                <li className="legend-item">
                                    <Box className="legend-dot start" aria-hidden="true" />
                                    <Typography variant="caption" sx={{ color: '#fff' }}>시작 노드</Typography>
                                </li>
                                <li className="legend-item">
                                    <Box className="legend-dot target" aria-hidden="true" />
                                    <Typography variant="caption" sx={{ color: '#fff' }}>목표 노드</Typography>
                                </li>
                                <li className="legend-item">
                                    <Box className="legend-dot via" aria-hidden="true" />
                                    <Typography variant="caption" sx={{ color: '#fff' }}>경유 노드</Typography>
                                </li>
                                <li className="legend-item">
                                    <Box className="legend-line" aria-hidden="true" />
                                    <Typography variant="caption" sx={{ color: '#fff' }}>공격 경로</Typography>
                                </li>
                            </ul>
                        </Box>
                    </CardContent>
                </Card>

                {/* 우측 패널 - 시작 노드 선택 시에만 표시 */}
                {selectedStartNode && (
                    <Box 
                        component="aside"
                        aria-label="경로 정보 패널"
                        className="right-panel"
                        sx={{
                            width: { xs: '100%', lg: 400 },
                            maxWidth: { xs: '100%', lg: 400 }
                        }}
                    >
                        {/* 카드 1: 시작 및 목표 노드 정보 */}
                        <Card 
                            component="section"
                            aria-label="시작 및 목표 노드 정보"
                            className="info-card"
                        >
                            <CardContent>
                                <Typography variant="body2" component="h3" className="card-title">
                                    📍 시작 및 목표 노드
                                </Typography>
                                <Box sx={{ fontSize: 12, color: '#555' }}>
                                    {selectedStartNode && attackGraphData.targetNodeId ? (
                                        <>
                                            <Box sx={{ mb: 1 }}>
                                                <strong>시작:</strong> {attackGraphData.nodes?.find(n => n.id === selectedStartNode)?.label || selectedStartNode}
                                            </Box>
                                            <Box>
                                                <strong>목표:</strong> {attackGraphData.nodes?.find(n => n.id === attackGraphData.targetNodeId)?.label || attackGraphData.targetNodeId}
                                            </Box>
                                        </>
                                    ) : (
                                        <Typography variant="caption" className="empty-message">시작 노드를 선택하세요</Typography>
                                    )}
                                </Box>
                            </CardContent>
                        </Card>

                        {/* 카드 2: 경로 리스트 */}
                        <Card 
                            component="section"
                            aria-label="경로 리스트"
                            className="info-card scrollable"
                            sx={{
                                flex: 1,
                                minHeight: 0
                            }}
                        >
                            <CardContent sx={{
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                flex: 1,
                                '&:last-child': { pb: 2 }
                            }}>
                                <Typography variant="body2" component="h3" className="card-title">
                                    🛤️ 경로 리스트
                                </Typography>
                                <Box className="card-content-scroll">
                                    {pathList.length > 0 ? (
                                        pathList.map((path, idx) => (
                                            <Box
                                                key={idx}
                                                onClick={() => setSelectedPath(idx)}
                                                className={`path-item ${selectedPath === idx ? 'selected' : ''}`}
                                            >
                                                경로 {idx + 1} ({path.length || 0} 노드)
                                            </Box>
                                        ))
                                    ) : (
                                        <Typography variant="caption" className="empty-message">경로가 없습니다</Typography>
                                    )}
                                </Box>
                            </CardContent>
                        </Card>

                        {/* 카드 3: 선택한 경로의 노드 정보 */}
                        <Card 
                            component="section"
                            aria-label="경로 노드 정보"
                            className="info-card scrollable"
                            sx={{
                                flex: 1,
                                minHeight: 0
                            }}
                        >
                            <CardContent sx={{
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                flex: 1,
                                '&:last-child': { pb: 2 }
                            }}>
                                <Typography variant="body2" component="h3" className="card-title">
                                    🔗 경로 노드 정보
                                </Typography>
                                <Box className="card-content-scroll">
                                    {selectedPath !== null && pathList[selectedPath] ? (
                                        pathList[selectedPath].map((node, idx) => (
                                            <Box key={idx} className="node-item">
                                                {idx + 1}. {node.label || node.id}
                                            </Box>
                                        ))
                                    ) : (
                                        <Typography variant="caption" className="empty-message">경로를 선택하세요</Typography>
                                    )}
                                </Box>
                            </CardContent>
                        </Card>

                        {/* 카드 4: 계산 로그 */}
                        <Card 
                            component="section"
                            aria-label="계산 로그"
                            className="info-card scrollable"
                            sx={{
                                flex: 1,
                                minHeight: 0
                            }}
                        >
                            <CardContent sx={{
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                flex: 1,
                                '&:last-child': { pb: 2 }
                            }}>
                                <Typography variant="body2" component="h3" className="card-title">
                                    📋 계산 로그
                                </Typography>
                                <Box className="card-content-scroll">
                                    {calculationLogs.length > 0 ? (
                                        calculationLogs.map((log, idx) => (
                                            <Box key={idx} className="log-item">
                                                {log}
                                            </Box>
                                        ))
                                    ) : (
                                        <Typography variant="caption" className="empty-message">로그가 없습니다</Typography>
                                    )}
                                </Box>
                            </CardContent>
                        </Card>
                    </Box>
                )}
            </CardContent>

            {/* Device Topology 미니 뷰 */}
            {effectiveElementId && selectedStartNode && !topologyMinimized && (
                <Card className="topology-mini-view">
                    <Box className="topology-header">
                        <Typography variant="caption" className="topology-title">
                            Device Topology
                        </Typography>
                        <IconButton
                            size="small"
                            onClick={() => setTopologyMinimized(true)}
                            sx={{
                                bgcolor: '#f0f0f0',
                                border: '1px solid #ccc',
                                borderRadius: 0.5,
                                width: 24,
                                height: 24,
                                '&:hover': {
                                    bgcolor: '#e0e0e0'
                                }
                            }}
                        >
                            <MinusOutlined style={{ fontSize: 12 }} />
                        </IconButton>
                    </Box>
                    <div ref={topologyRef} className="topology-canvas" />
                </Card>
            )}

            {/* Topology 복원 버튼 */}
            {effectiveElementId && selectedStartNode && topologyMinimized && (
                <Box className="topology-restore-button">
                    <Button
                        variant="contained"
                        startIcon={<PlusOutlined />}
                        onClick={() => setTopologyMinimized(false)}
                        sx={{
                            bgcolor: '#4CAF50',
                            color: 'white',
                            '&:hover': {
                                bgcolor: '#45a049'
                            },
                            fontSize: 14,
                            fontWeight: 'bold',
                            py: 1,
                            px: 2
                        }}
                    >
                        Topology
                    </Button>
                </Box>
            )}
        </Card>
    );
}

export default OffensiveStrategy;
