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
  
  // 팝업 상태 관리 - 통합 Context 사용
  const { popups, openPopup, closePopup } = usePopup();
  const treatAnalysisOpen = popups.treatAnalysis;

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
    const options = { // Vis-network (왼쪽 하단의 topology) 노드 설정
      interaction: { hover: true, multiselect: false },
      nodes: { font: { color: "#39306b", size: 20 } },
      physics: { stabilization: true },
      autoResize: true,
      height: '100%',
      width: '100%'
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

    const options = { // 여기가 중앙 Vis-network 노드 설정
      interaction: { hover: true, multiselect: false },
      nodes: { font: { color: "#39306b" } },
      autoResize: true,
      height: '100%',
      width: '100%',
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
  }, [attackGraphData, selectedStartNode]);

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
  }, [topologyMinimized, topologyData]);

  // styles


  return (
    <Card sx={{ width: '100%', height: 'calc(100vh - 120px)' }}>
      <CardContent sx={{ p: 0, height: '100%', '&:last-child': { pb: 0 }, position: 'relative' }}>
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
        </div>

        {/* 오른쪽 하단 팝업 버튼 */}
        <IconButton
          size="small"
          aria-label="위험 노출도 및 공격 가능도 측정"
          title="위험 노출도 및 공격 가능도 측정"
          onClick={() => openPopup('treatAnalysis')}
          sx={{
            position: 'absolute',
            bottom: 40,
            right: 40,
            zIndex: 1000,
            bgcolor: 'rgba(124,58,237,0.8)',
            color: '#fff',
            borderRadius: '50%',
            width: 48,
            height: 48,
            boxShadow: '0 4px 12px rgba(124,58,237,0.5)',
            '&:hover': {
              bgcolor: '#9333ea',
              color: '#fff',
              transform: 'scale(1.1)',
            },
            transition: 'all 0.3s ease'
          }}
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
            sx={{
              position: 'absolute',
              right: 23,
              top: 8.5,
              color: '#000000ff',
              zIndex: 1,
              bgcolor: '#cac7d4ff',
              '&:hover': {
                bgcolor: '#39306b',
                color: '#ffffffff'
              }
            }}
          >
            ✕
          </IconButton>
          <DialogContent sx={{ p: 0, height: '100%', overflow: 'hidden' }}>
            <TreatAnalysis open={treatAnalysisOpen} isPopup={true} />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export default OffensiveStrategy;
