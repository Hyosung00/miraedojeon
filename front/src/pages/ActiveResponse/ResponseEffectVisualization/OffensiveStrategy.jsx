// src/OffensiveStrategy.jsx
import { useState, useEffect, useRef } from "react";

import { DataSet } from "vis-data";
import { Network } from "vis-network/standalone";
import "vis-network/styles/vis-network.css";
import "./OffensiveStrategy.css";



function OffensiveStrategy({ deviceElementId, onSelectDevice }) {
  // topology: Device 노드들을 표시 (좌측하단)
  const topologyRef = useRef(null);
  const topologyNetRef = useRef(null);
  const [topologyData, setTopologyData] = useState({ nodes: [], edges: [] });
  const [topologyMinimized, setTopologyMinimized] = useState(false);

  // attack graph: 공격 그래프 표시 (메인 영역)
  const attackRef = useRef(null);
  const attackNetRef = useRef(null);
  const [attackGraphData, setAttackGraphData] = useState({ nodes: [], edges: [] });
  const [loadingAttack, setLoadingAttack] = useState(false);

  // 선택된 시작 노드
  const [selectedStartNode, setSelectedStartNode] = useState(null);

  // internal fallback when parent does not control deviceElementId
  const [internalSelected, setInternalSelected] = useState(null);
  const effectiveElementId = deviceElementId ?? internalSelected;

  // 1) initial fetch: Device 토폴로지 (연결 포함)
  useEffect(() => {
    fetch("/neo4j/topology")
      .then(res => res.json())
      .then(data => {
        setTopologyData({
          nodes: data.nodes || [],
          edges: data.edges || []
        });
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
    if (!effectiveElementId) {
      setAttackGraphData({ nodes: [], edges: [] });
      setLoadingAttack(false);
      setSelectedStartNode(null);
      return;
    }

    setLoadingAttack(true);
    setSelectedStartNode(null);

    fetch(`/neo4j/attack-graph?deviceElementId=${encodeURIComponent(effectiveElementId)}`)
      .then(res => res.json())
      .then(data => {
        setAttackGraphData({
          nodes: data.nodes || [],
          edges: data.edges || [],
          allStartNodes: new Set(data.allStartNodes || []),
          targetNodeId: data.targetNodeId || null
        });
        setLoadingAttack(false);
      })
      .catch(e => {
        console.error('[OffensiveStrategy] Error fetching attack graph:', e);
        setLoadingAttack(false);
      });
  }, [effectiveElementId]);

  // 3) render Device topology (좌측하단) - 시작노드 선택 시 전체 공격 그래프 표시
  useEffect(() => {
    if (!topologyRef.current || topologyMinimized) return;

    if (topologyNetRef.current) {
      topologyNetRef.current.destroy();
      topologyNetRef.current = null;
    }

    let nodesToShow;
    let edgesToShow;

    // 원래: 시작 노드가 선택되면 좌측하단에 전체 공격 그래프를 표시했음.
    // 요청대로 해당 동작을 주석 처리하여 항상 Device 토폴로지를 표시합니다.
    /*
    if (selectedStartNode != null && attackGraphData.nodes && attackGraphData.nodes.length > 0) {
      // 시작 노드가 선택되었으면 전체 공격 그래프를 좌측하단에 표시
      nodesToShow = attackGraphData.nodes;
      edgesToShow = attackGraphData.edges;
    } else {
    */
      // 기본 토폴로지 표시
      nodesToShow = topologyData.nodes.map(n => {
        const isSelected = effectiveElementId && n.elementId === effectiveElementId;
        return {
          ...n,
          size: isSelected ? 20 : 12,
          color: isSelected
            ? { background: "#FFCC00", border: "#CC9900" }
            : { background: "#2B7CE9", border: "#205AAA" }
        };
      });
      edgesToShow = topologyData.edges;
    /*
    }
    */

    const nodes = new DataSet(nodesToShow);
    const edges = new DataSet(edgesToShow);
    const data = { nodes, edges };
    const options = {
      interaction: { hover: true, multiselect: false },
      nodes: { font: { color: "#ffffff", size: 10 } },
      physics: { stabilization: true }
    };

    topologyNetRef.current = new Network(topologyRef.current, data, options);

    // 시작 노드 선택 이벤트 활성화 (좌측하단)
    topologyNetRef.current.on("selectNode", (params) => {
      const nid = params.nodes && params.nodes[0];
      if (!nid) return;
      const node = nodes.get(nid);

      // 공격 그래프가 표시된 경우, 시작 노드 클릭 시 선택
      if (selectedStartNode != null && attackGraphData.allStartNodes?.has(nid)) {
        setSelectedStartNode(nid);
      } else if (!selectedStartNode) {
        // Device 토폴로지에서 선택
        const elementIdFull = node && node.elementId;
        if (onSelectDevice && typeof onSelectDevice === "function") {
          onSelectDevice(elementIdFull);
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
  }, [topologyData, effectiveElementId, onSelectDevice, topologyMinimized, selectedStartNode, attackGraphData]);

  // 4) render attack graph (메인 영역) - 시작노드 선택 시 해당 경로만 표시
  useEffect(() => {
    if (!attackRef.current) return;

    if (attackNetRef.current) {
      attackNetRef.current.destroy();
      attackNetRef.current = null;
    }

    let nodesToShow = attackGraphData.nodes || [];
    let edgesToShow = attackGraphData.edges || [];
    let isFiltered = false;

    // 시작 노드가 선택된 경우 해당 경로만 표시
    if (selectedStartNode != null && attackGraphData.pathsMap) {
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
            if (n.id === selectedStartNode) {
              return {
                ...n,
                color: { background: "#FFA500", border: "#FF8C00" }, // 주황색으로 변경
                size: 25
              };
            }
            return n;
          });
      }
    }

    const nodes = new DataSet(nodesToShow);
    const edges = new DataSet(edgesToShow);
    const data = { nodes, edges };

    const options = {
      interaction: { hover: true, multiselect: false },
      nodes: { font: { color: "#ffffff" } },
      ...(isFiltered ? {
        layout: {
          hierarchical: {
            enabled: true,
            direction: "DU", // Down-Up: 시작 노드가 위, 목표 노드가 아래
            sortMethod: "directed",
            levelSeparation: 150,
            nodeSpacing: 100
          }
        }
      } : {}),
      physics: {
        enabled: !isFiltered,
        stabilization: { iterations: 200 },
        barnesHut: {
          gravitationalConstant: -8000,
          springConstant: 0.04,
          springLength: 95
        }
      }
    };
    attackNetRef.current = new Network(attackRef.current, data, options);

    // 시작 노드 클릭 이벤트만 활성화
    attackNetRef.current.on("selectNode", (params) => {
      const nid = params.nodes && params.nodes[0];
      if (!nid) return;
      const node = nodes.get(nid);

      if (node && (node.group === "StartPhysical" || attackGraphData.allStartNodes?.has(nid))) {
        setSelectedStartNode(nid);
      }
    });

    return () => {
      if (attackNetRef.current) {
        attackNetRef.current.destroy();
        attackNetRef.current = null;
      }
    };
  }, [attackGraphData, selectedStartNode]);

  return (
      <>
        <div className="attackContainer">
          <div className="header">
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
                className="showAllButton"
              >
                Show All Start Nodes
              </button>
            )}
          </div>
          <div ref={attackRef} className="attackGraph" />
        </div>

        {!topologyMinimized ? (
            <div className="topologyPanel">
              <div className="topologyHeader">
                <span className="topologyTitle">
                  {selectedStartNode ? "Attack Path" : "Device Topology"}
                </span>
                <button
                  onClick={() => setTopologyMinimized(true)}
                  className="minimizeButton"
                >
                  -
                </button>
              </div>
              <div ref={topologyRef} className="topologyGraph" />
            </div>
        ) : (
            <div className="minimizedWrapper">
              <button
                onClick={() => setTopologyMinimized(false)}
                className="expandButton"
              >
                + {selectedStartNode ? "Attack Path" : "Topology"}
              </button>
            </div>
        )}
      </>
  );
}

export default OffensiveStrategy;
