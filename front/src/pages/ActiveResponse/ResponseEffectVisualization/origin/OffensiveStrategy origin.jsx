// src/OffensiveStrategy.jsx
import { useState, useEffect, useRef } from "react";
import { DataSet } from "vis-data";
import { Network } from "vis-network/standalone";

import "vis-network/styles/vis-network.css";
import "./OS.css";
import { Card, CardContent, IconButton, Dialog, DialogContent } from '@mui/material';
import { AreaChartOutlined } from '@ant-design/icons';
import TreatAnalysis from '../ThreatAnalysis/TreatAnalysis';
import { usePopup } from '../../../context/PopupContext';

// 노드 타입에 따른 이미지 경로 반환 함수
const getNodeImage = (node) => {
  const type = node?.type || node?.properties?.type;
  // 안전하게 문자열로 변환
  const label = String(node?.label ?? '').toLowerCase();
  const id = String(node?.id ?? '').toLowerCase();

  // type이 있으면 type으로 판단
  if (typeof type === 'string') {
    switch(type.toLowerCase()) {
      case 'switch':
        return '/image/switch.png';
      case 'workstation':
        return '/image/workstation.png';
      case 'server':
        return '/image/server.png';
      case 'router':
        return '/image/router.png';
      case 'firewall':
        return '/image/firewall.png';
      case 'laptop':
        return '/image/laptop.png';
      case 'printer':
        return '/image/printer.png';
      case 'sensor':
        return '/image/sensor.png';
      case 'plc':
        return '/image/plc.png';
    }
  }

  // type이 없으면 label이나 id에서 추론
  if (label.includes('switch') || id.includes('switch')) {
    return '/image/switch.png';
  } else if (label.includes('workstation') || id.includes('workstation') || label.includes('-ws')) {
    return '/image/workstation.png';
  } else if (label.includes('server') || id.includes('server')) {
    return '/image/server.png';
  } else if (label.includes('router') || id.includes('router')) {
    return '/image/router.png';
  } else if (label.includes('firewall') || id.includes('firewall')) {
    return '/image/firewall.png';
  } else if (label.includes('laptop') || id.includes('laptop')) {
    return '/image/laptop.png';
  } else if (label.includes('printer') || id.includes('printer')) {
    return '/image/printer.png';
  } else if (label.includes('sensor') || id.includes('sensor') || label.includes('ids')) {
    return '/image/sensor.png';
  } else if (label.includes('plc') || id.includes('plc')) {
    return '/image/plc.png';
  } else if (label.includes('idf') || label.includes('idc')) {
    return '/image/switch.png';
  }

  return '/logo192.png';
};

function OffensiveStrategy({ deviceElementId, onSelectDevice }) {
  // topology: Device 노드들을 표시 (좌측하단)
  const topologyRef = useRef(null);
  const topologyNetRef = useRef(null);
  const [topologyData, setTopologyData] = useState({ nodes: [], edges: [] });
  const [topologyMinimized, setTopologyMinimized] = useState(false);

  // 초기 토폴로지 스냅샷
  const initialTopologyRef = useRef(null);

  // 노드 위치 저장
  const nodePositionsRef = useRef(null);

  // attack graph: 공격 그래프 표시 (메인 영역)
  const attackRef = useRef(null);
  const attackNetRef = useRef(null);
  const [attackGraphData, setAttackGraphData] = useState({ nodes: [], edges: [] });
  const [loadingAttack, setLoadingAttack] = useState(false);

  // 선택된 시작 노드 (Physical 내부 id)
  const [selectedStartNode, setSelectedStartNode] = useState(null);
  
  // 팝업 상태 관리 - 통합 Context 사용
  const { popups, openPopup, closePopup } = usePopup();
  const treatAnalysisOpen = popups.treatAnalysis;

  // 우측 패널 상태
  const [pathList] = useState([]);
  const [selectedPath, setSelectedPath] = useState(null);
  const [calculationLogs] = useState([]);

  // internal fallback when parent does not control deviceElementId
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

  // 1) initial fetch: Device 토폴로지 (연결 포함)
  useEffect(() => {
    fetch("http://localhost:8000/neo4j/topology")
      .then(res => res.json())
      .then(data => {
        setTopologyData({
          nodes: data.nodes || [],
          edges: data.edges || []
        });

        if (!initialTopologyRef.current) {
          initialTopologyRef.current = {
            nodes: data.nodes || [],
            edges: data.edges || []
          };
        }
      })
      .catch(console.error);
  }, []);

  // topology 최소화 시 기존 네트워크가 남아있으면 파괴
  useEffect(() => {
    if (topologyMinimized) {
      if (topologyNetRef.current) {
        topologyNetRef.current.destroy();
        topologyNetRef.current = null;
      }
    }
  }, [topologyMinimized]);

  // 2) fetch attack graph when effectiveElementId changes
  useEffect(() => {
    let canceled = false;

    if (!effectiveElementId) {
      const prevAG = attackGraphDataRef.current || { nodes: [], edges: [] };
      if ((prevAG.nodes && prevAG.nodes.length) || (prevAG.edges && prevAG.edges.length)) {
        setAttackGraphData({ nodes: [], edges: [] });
      }
      if (loadingAttackRef.current) setLoadingAttack(false);
      if (selectedStartNode !== null) setSelectedStartNode(null);
      return;
    }

    if (!loadingAttackRef.current) setLoadingAttack(true);
    const startId = selectedStartNode;

    fetch(`http://localhost:8000/neo4j/attack-graph?deviceElementId=${encodeURIComponent(effectiveElementId)}${startId != null ? `&startId=${startId}` : ''}`)
      .then(res => res.json())
      .then(data => {
        if (canceled) return;

        console.log("=== API returned attack graph data ===");

        if (!data || !data.nodes || data.nodes.length === 0) {
          console.log("⚠️ No paths found");
          const fallbackNodes = [];
          if (startId != null) {
            fallbackNodes.push({
              id: startId,
              label: "Start",
              group: "StartPhysical",
              color: { background: "#00FF00", border: "#00CC00" },
              size: 20,
              originalId: startId,
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

        // API에서 받은 데이터를 그대로 사용하되, 추가 처리
        const nodesMap = new Map();
        const allEdges = data.edges || [];
        let targetId = data.targetNodeId || null;

        // 노드 맵 생성
        (data.nodes || []).forEach(node => {
          nodesMap.set(node.id, { ...node });
        });

        // 각 노드의 경로별 순서 추적 (nodeId -> [순서들])
        const nodePathPositions = new Map();

        // pathsData가 있다면 처리
        if (data.pathsData && Array.isArray(data.pathsData)) {
          data.pathsData.forEach((pathData, pathIdx) => {
            if (pathData.nodeSequence && Array.isArray(pathData.nodeSequence)) {
              pathData.nodeSequence.forEach((nodeId, position) => {
                if (!nodePathPositions.has(nodeId)) {
                  nodePathPositions.set(nodeId, []);
                }
                nodePathPositions.get(nodeId).push(position);
              });
            }
          });
        }

        // 각 노드의 평균 level 계산 및 반올림 (목표 노드 제외)
        nodesMap.forEach((node, nodeId) => {
          if (nodeId === targetId) {
            node.level = 999999;
            return;
          }
          const positions = nodePathPositions.get(nodeId);
          if (positions && positions.length > 0) {
            const avgLevel = positions.reduce((a, b) => a + b, 0) / positions.length;
            node.tempLevel = Math.round(avgLevel);
          } else {
            node.tempLevel = 0;
          }
        });

        // 모든 고유한 tempLevel 값을 수집하고 정렬 (목표 노드의 999999 제외)
        const uniqueLevels = [...new Set(Array.from(nodesMap.values())
          .filter(n => n.tempLevel !== 999999 && n.tempLevel !== undefined)
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
            return;
          }
          const positions = nodePathPositions.get(nodeId);
          if (positions && positions.length > 0) {
            const avgLevel = positions.reduce((a, b) => a + b, 0) / positions.length;
            const roundedLevel = Math.round(avgLevel);
            node.level = levelMapping.get(roundedLevel) || 1;
            maxLevel = Math.max(maxLevel, node.level);
            console.log(`📊 Node ${node.label}: positions=${positions.join(',')}, avgLevel=${avgLevel.toFixed(2)}, roundedLevel=${roundedLevel}, finalLevel=${node.level}`);
          } else {
            node.level = 1;
          }
          delete node.tempLevel;
        });

        // 목표 노드를 최고 레벨로 강제 설정
        if (targetId) {
          const targetNode = nodesMap.get(targetId);
          if (targetNode) {
            targetNode.level = maxLevel + 1;
            console.log(`🎯 Target node level set to ${targetNode.level}`);
          }
        }

        const newAttack = {
          nodes: Array.from(nodesMap.values()),
          edges: allEdges,
          pathsMap: data.pathsMap ? new Map(Object.entries(data.pathsMap).map(([k, v]) => [parseInt(k), new Set(v)])) : new Map(),
          targetNodeId: targetId,
          allStartNodes: new Set(data.allStartNodes || [startId]),
          nodeConnections: new Map(),
          pathCount: data.pathCount || 0
        };

        setAttackGraphData(newAttack);
        if (loadingAttackRef.current) setLoadingAttack(false);
      })
      .catch(e => {
        console.error('[OffensiveStrategy] Error fetching attack graph:', e);
        setLoadingAttack(false);
      });

    return () => { canceled = true; };
  }, [effectiveElementId, selectedStartNode]);

  // 3) render Device topology (좌측하단)
  useEffect(() => {
    if (!topologyRef.current) return;

    // 최초 1회 생성
    if (!topologyNetRef.current) {
      const baseTopology = initialTopologyRef.current ?? topologyData;

      // 노드에 이미지 설정 추가
      const nodesWithImages = (baseTopology.nodes || []).map(n => {
        const copy = { ...n };
        copy.shape = 'image';
        copy.image = getNodeImage(copy);
        copy.borderWidth = 2;
        copy.size = copy.size ?? 20;
        copy.color = { border: "#2B7CE9" };
        return copy;
      });

      topologyNodesRef.current = new DataSet(nodesWithImages);
      topologyEdgesRef.current = new DataSet((baseTopology.edges || []).map(e => ({ ...e })));

      const data = { nodes: topologyNodesRef.current, edges: topologyEdgesRef.current };
      const options = {
        interaction: { hover: true, multiselect: false },
        nodes: { 
          font: { color: "#39306b", size: 14 },
          shape: 'image',
          brokenImage: getNodeImage({}),
          size: 20,
          borderWidth: 2
        },
        edges: { smooth: { enabled: false } },
        physics: { stabilization: true },
        autoResize: true,
        height: '100%',
        width: '100%'
      };

      topologyNetRef.current = new Network(topologyRef.current, data, options);

      // 위치 복원/저장
      if (nodePositionsRef.current) {
        topologyNetRef.current.setOptions({ physics: false, edges: { smooth: { enabled: false } } });
        Object.keys(nodePositionsRef.current).forEach(nodeId => {
          try {
            topologyNetRef.current.moveNode(nodeId, nodePositionsRef.current[nodeId].x, nodePositionsRef.current[nodeId].y);
          } catch (err) {
            console.error("Error moving node:", err);
          }
        });
      } else {
        topologyNetRef.current.once("stabilizationIterationsDone", () => {
          const positions = topologyNetRef.current.getPositions();
          nodePositionsRef.current = positions;
        });
      }

      // 클릭: 목표가 있으면 시작 노드 선택으로 처리
      topologyNetRef.current.on("selectNode", async (params) => {
        const nid = params.nodes && params.nodes[0];
        if (!nid) return;
        const node = topologyNodesRef.current.get(nid);

        if (effectiveElementId) {
          // Device 노드를 클릭한 경우 -> 시작 노드로 설정
          if (node?.id) {
            setSelectedStartNode(node.id);
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

      if (topologyMinimized) return;
    }

    // 데이터셋 업데이트
    try {
      const baseTopology = initialTopologyRef.current ?? topologyData;

      // 경로에 포함된 모든 노드 elementId 세트 생성 (주황색 표시용)
      const pathNodeElementIds = new Set();
      if (attackGraphData.nodes) {
        attackGraphData.nodes.forEach(n => {
          if (n.elementId) {
            pathNodeElementIds.add(n.elementId);
          }
        });
      }

      // originalId를 기준으로 시작 노드 찾기
      const startNodeOriginalId = attackGraphData.nodes?.find(p =>
        p.id === selectedStartNode || p.originalId === selectedStartNode
      )?.originalId || selectedStartNode;

      const nodesToShow = (baseTopology.nodes || []).map(n => {
        const copy = { ...n };

        let isStartSelected = false;
        if (selectedStartNode != null && startNodeOriginalId != null) {
          // elementId나 id로 매칭
          if (copy.elementId === startNodeOriginalId || copy.id === startNodeOriginalId) {
            isStartSelected = true;
          }
          // 또는 attackGraphData의 노드와 매칭
          const matchingNode = attackGraphData.nodes?.find(an => 
            (an.originalId === copy.id || an.id === copy.id || an.elementId === copy.elementId)
          );
          if (matchingNode && (matchingNode.id === selectedStartNode || matchingNode.originalId === selectedStartNode)) {
            isStartSelected = true;
          }
        }

        const isTarget = effectiveElementId && copy.elementId === effectiveElementId;
        const isInPath = copy.elementId && pathNodeElementIds.has(copy.elementId);

        // 이미지 설정
        copy.shape = 'image';
        copy.image = getNodeImage(copy);
        
        // 이미지 모드에서는 borderWidth와 color.border만 사용
        copy.borderWidth = 3;
        copy.size = copy.size ?? 20;
        
        if (isTarget) { 
          copy.color = { border: "#FF0000" }; 
          copy.borderWidth = 5;
          copy.size = 30; 
        }
        else if (isStartSelected) { 
          copy.color = { border: "#00FF00" }; 
          copy.borderWidth = 5;
          copy.size = 25; 
        }
        else if (isInPath) { 
          copy.color = { border: "#FFA500" }; 
          copy.borderWidth = 4;
          copy.size = 22; 
        } else {
          copy.color = { border: "#2B7CE9" };
        }
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
          console.error("Error moving node:", err);
        }
      });
    }

    // 언마운트 시 파괴 - 최소화 될 때만
  }, [topologyData, selectedStartNode, attackGraphData, effectiveElementId, topologyMinimized]);

  // 4) render attack graph (메인 영역)
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
        font: { color: "#39306b", size: 14 },
        shape: 'image',
        brokenImage: getNodeImage({}),
        size: 20,
        borderWidth: 2
      },
      edges: { 
        smooth: selectedStartNode ? {
          enabled: true,
          type: 'dynamic',
          roundness: 0.5
        } : {
          enabled: false
        } 
      },
      physics: {
        stabilization: true,
        barnesHut: {
          gravitationalConstant: -8000,
          springConstant: 0.04,
          springLength: 95
        }
      },
      autoResize: true,
      height: '100%',
      width: '100%'
    };

    if (!selectedStartNode) {
      nodesToShow = (effectiveElementId ? (baseTopology.nodes || []).map(n => {
        const copy = { ...n };
        // 이미지 설정
        copy.shape = 'image';
        copy.image = getNodeImage(copy);
        copy.borderWidth = 2;
        copy.size = copy.size ?? 20;
        
        if (copy.elementId && copy.elementId === effectiveElementId) {
          copy.color = { border: "#FF0000" };
          copy.borderWidth = 5;
          copy.size = 30;
        } else {
          copy.color = { border: "#2B7CE9" };
        }
        return copy;
      }) : (baseTopology.nodes || []).map(n => {
        const copy = { ...n };
        // 이미지 설정
        copy.shape = 'image';
        copy.image = getNodeImage(copy);
        copy.borderWidth = 2;
        copy.size = copy.size ?? 20;
        copy.color = { border: "#2B7CE9" };
        return copy;
      }));
      edgesToShow = (baseTopology.edges || []).map(e => ({ ...e }));
      options.physics.enabled = true;
    } else {
      nodesToShow = attackGraphData.nodes ? attackGraphData.nodes.map(n => {
        const copy = { ...n };
        // 이미지 설정
        copy.shape = 'image';
        copy.image = getNodeImage(copy);
        copy.borderWidth = 2;
        copy.size = copy.size ?? 20;
        copy.color = copy.color || { border: "#2B7CE9" };
        return copy;
      }) : [];
      edgesToShow = attackGraphData.edges ? attackGraphData.edges.map(e => ({ ...e })) : [];

      if (attackGraphData.pathsMap) {
        const pathEdges = attackGraphData.pathsMap.get(selectedStartNode);
        if (pathEdges && pathEdges.size > 0) {
          isFiltered = true;

          // 해당 경로에 포함된 노드 ID 수집
          const nodeIds = new Set();
          nodeIds.add(selectedStartNode);
          nodeIds.add(attackGraphData.targetNodeId);

          // 경로상의 모든 엣지 필터링
          const filteredEdges = [];
          for (const edge of (attackGraphData.edges || [])) {
            if (pathEdges.has(edge.id)) {
              nodeIds.add(edge.from);
              nodeIds.add(edge.to);
              filteredEdges.push(edge);
            }
          }

          // BFS로 각 노드의 목표까지의 거리 계산
          const distanceToTarget = new Map();
          const queue = [[attackGraphData.targetNodeId, 0]];
          const visited = new Set();

          while (queue.length > 0) {
            const [nodeId, dist] = queue.shift();
            if (visited.has(nodeId)) continue;
            visited.add(nodeId);
            distanceToTarget.set(nodeId, dist);

            // 인접 노드 찾기
            for (const edge of filteredEdges) {
              if (edge.from === nodeId && !visited.has(edge.to)) {
                queue.push([edge.to, dist + 1]);
              } else if (edge.to === nodeId && !visited.has(edge.from)) {
                queue.push([edge.from, dist + 1]);
              }
            }
          }

          // 엣지 방향 설정 (시작 노드에서 목표 노드로)
          edgesToShow = filteredEdges.map(e => {
            const fromDist = distanceToTarget.get(e.from) ?? Infinity;
            const toDist = distanceToTarget.get(e.to) ?? Infinity;

            // 목표 노드에 더 가까운 쪽으로 화살표 방향 설정
            let from = e.from;
            let to = e.to;

            if (fromDist < toDist) {
              // from이 목표에 더 가까움 -> 반대 방향
              from = e.to;
              to = e.from;
            }

            return {
              id: e.id,
              from: from,
              to: to,
              arrows: "to",
              color: { color: "#FFD700" },
              width: 3,
              title: e.title
            };
          });

          // 노드 필터링 및 선택된 시작 노드 색상 변경
          nodesToShow = nodesToShow
            .filter(n => nodeIds.has(n.id))
            .map(n => {
              const copy = { ...n };
              // 이미지 유지
              copy.shape = 'image';
              copy.image = getNodeImage(copy);
              copy.borderWidth = 2;
              
              if (n.id === selectedStartNode) {
                copy.color = { border: "#FFA500" };
                copy.borderWidth = 5;
                copy.size = 30;
              } else {
                copy.color = copy.color || { border: "#2B7CE9" };
              }
              return copy;
            });
        }
      }

      options.layout = isFiltered ? {
        hierarchical: {
          enabled: true,
          direction: "DU",
          sortMethod: "directed",
          levelSeparation: 150,
          nodeSpacing: 100
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
            console.error("Error moving node:", err);
          }
        });
      } else {
        attackNetRef.current.once("stabilizationIterationsDone", () => {
          const positions = attackNetRef.current.getPositions();
          nodePositionsRef.current = positions;
        });
      }
    }

    attackNetRef.current.on("selectNode", async (params) => {
      const nid = params.nodes && params.nodes[0];
      if (!nid) return;
      const node = nodes.get(nid);

      if (effectiveElementId) {
        // Device 노드를 클릭한 경우
        if (node?.elementId) {
          setSelectedStartNode(node.id);
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
      if (attackNetRef.current) {
        attackNetRef.current.destroy();
        attackNetRef.current = null;
      }
    };
  }, [attackGraphData, selectedStartNode, effectiveElementId, topologyData]);

  // Resize observer to keep vis-network canvas in sync with container size
  useEffect(() => {
    if (!attackRef.current) return;
    const el = attackRef.current;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (!cr) return;
      if (attackNetRef.current) {
        const w = Math.max(1, Math.floor(cr.width));
        const h = Math.max(1, Math.floor(cr.height));
        try {
          attackNetRef.current.setSize(`${w}px`, `${h}px`);
          attackNetRef.current.redraw();
        } catch {}
      }
    });
    ro.observe(el);
    return () => {
      try { ro.disconnect(); } catch {}
    };
  }, []); // 한 번만 등록

  // Resize observer for topology panel when visible
  useEffect(() => {
    if (topologyMinimized || !topologyRef.current) return;
    const el = topologyRef.current;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (!cr) return;
      if (topologyNetRef.current) {
        const w = Math.max(1, Math.floor(cr.width));
        const h = Math.max(1, Math.floor(cr.height));
        try {
          topologyNetRef.current.setSize(`${w}px`, `${h}px`);
          topologyNetRef.current.redraw();
        } catch {}
      }
    });
    ro.observe(el);
    return () => {
      try { ro.disconnect(); } catch {}
    };
  }, [topologyMinimized]); // topologyData 제거

  // styles


  return (
    <Card className="offensive-card-wrapper">
      <CardContent className="offensive-card-content">
        <div className="offensive-root">
          <div className="offensive-main">
            <div className="offensive-attack">
              <div className="offensive-attack-header">
                <div>
                  {loadingAttack
                    ? "Loading attack graph..."
                    : effectiveElementId
                      ? `Attack target: ${effectiveElementId}${selectedStartNode ? ' (Start node selected)' : ''}`
                      : "No attack target selected"}
                </div>
                {selectedStartNode && (
                  <button
                    onClick={() => setSelectedStartNode(null)}
                    className="offensive-btn offensive-btn-small"
                  >
                    Show All Start Nodes
                  </button>
                )}
              </div>
              <div ref={attackRef} className="offensive-attack-canvas" />
            </div>

            {!topologyMinimized ? (
                <div className="offensive-topology">
                  <div className="offensive-topology-header">
                    <span className="offensive-topology-title">
                      {selectedStartNode ? "Attack Path" : "Device Topology"}
                    </span>
                    <button
                      onClick={() => setTopologyMinimized(true)}
                      className="offensive-btn-topology"
                    >
                      -
                    </button>
                  </div>
                  <div ref={topologyRef} className="offensive-topology-canvas" />
                </div>
            ) : (
                <div className="offensive-topology-minimized">
                  <button
                    onClick={() => setTopologyMinimized(false)}
                    className="offensive-btn"
                  >
                    + {selectedStartNode ? "Attack Path" : "Topology"}
                  </button>
                </div>
            )}
          </div>

          {/* 우측 패널 - 시작 노드 선택 시에만 표시 */}
          {selectedStartNode && (
            <div className="offensive-right-panel">
              {/* 카드 1: 시작 노드 정보 */}
              <div className="offensive-panel-card">
                <div className="offensive-panel-card-title">Start Node Info</div>
                <div className="offensive-panel-card-content">
                  Selected Start Node ID: {selectedStartNode}
                  <br />
                  Paths Found: {attackGraphData.pathCount || 0}
                </div>
              </div>

              {/* 카드 2: 경로 리스트 */}
              <div className="offensive-panel-card">
                <div className="offensive-panel-card-title">Path List</div>
                {pathList.length === 0 ? (
                  <div className="offensive-panel-card-empty">No paths available</div>
                ) : (
                  pathList.map((path, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedPath(path)}
                      className={`offensive-path-item${selectedPath === path ? ' selected' : ''}`}
                    >
                      Path {idx + 1}
                    </div>
                  ))
                )}
              </div>

              {/* 카드 3: 선택한 경로의 노드 정보 */}
              <div className="offensive-panel-card">
                <div className="offensive-panel-card-title">Selected Path Nodes</div>
                {!selectedPath ? (
                  <div className="offensive-panel-card-empty">No path selected</div>
                ) : (
                  <div className="offensive-panel-card-content">Path details here...</div>
                )}
              </div>

              {/* 카드 4: 계산 로그 */}
              <div className="offensive-panel-card">
                <div className="offensive-panel-card-title">Calculation Logs</div>
                {calculationLogs.length === 0 ? (
                  <div className="offensive-panel-card-empty">No logs available</div>
                ) : (
                  calculationLogs.map((log, idx) => (
                    <div key={idx} className="offensive-log-item">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* 오른쪽 하단 팝업 버튼 */}
        <IconButton
          size="small"
          aria-label="위험 노출도 및 공격 가능도 측정"
          title="위험 노출도 및 공격 가능도 측정"
          onClick={() => openPopup('treatAnalysis')}
          className="offensive-popup-button"
        >
          <AreaChartOutlined style={{ fontSize: 24 }} />
        </IconButton>

        {/* 위험 노출도 및 공격 가능도 측정 팝업 */}
        <Dialog
          open={treatAnalysisOpen}
          onClose={() => closePopup('treatAnalysis')}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              height: '70vh',
              maxHeight: '70vh',
              m: 0,
              position: 'relative',
              overflow: 'hidden'
            }
          }}
        >
          <IconButton
            onClick={() => closePopup('treatAnalysis')}
            className="offensive-dialog-close"
          >
            ✕
          </IconButton>
          <DialogContent className="offensive-dialog-content">
            <TreatAnalysis open={treatAnalysisOpen} isPopup={true} />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export default OffensiveStrategy;
