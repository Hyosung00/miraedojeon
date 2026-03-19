import React, { useState, useCallback, useMemo, lazy, Suspense, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, Box, Typography, IconButton, Dialog, DialogContent } from "@mui/material";
import { PushpinOutlined, AreaChartOutlined } from '@ant-design/icons';
import interactionTracker from '../../../utils/interactionTracker';

// Lazy load components for better code splitting
const TargetGraphComp = lazy(() => import("./TargetGraphComp"));
const TargetCondition = lazy(() => import("./TargetCondition"));
const DataTable = lazy(() => import("./DataTable.jsx"));
const TrendChart = lazy(() => import("./TrendChart.jsx"));
const EventLog = lazy(() => import("./dashboard/EventLog"));

// Regular imports for critical components
import StatisticsCard from "./StatisticsCard.jsx";
import { extractUniqueTypes } from "./TargetCondition/filterUtils";
import TargetIdentification from "../TargetIdentification/index";
import TargetPriority from "../TargetPriority/index";
import { usePopup } from '../../../context/PopupContext';
import "./Target.css";

// Loading fallback component
const LoadingFallback = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100%',
    color: '#666'
  }}>
    Loading...
  </div>
);

// logs와 activeView prop 추가
export default function TargetDashboard({ onNodeClick, data, logs = [], activeView = "target" }) {
  const navigate = useNavigate();
  const [nodes, setNodes] = useState(data || []);
  const [filteredNodes, setFilteredNodes] = useState([]);
  const [filterConditions, setFilterConditions] = useState({});
  const [currentLogs, setCurrentLogs] = useState(logs);
  const [selectedNode, setSelectedNode] = useState(null);
  
  // 통합 PopupContext 사용
  const { popups, openPopup, closePopup } = usePopup();
  const targetIdentificationOpen = popups.targetIdentification;
  const targetPriorityOpen = popups.targetPriority;

  // 메뉴에서 팝업 오픈 요청 시 자동으로 열리도록
  useEffect(() => {
    if (popups.targetIdentification || popups.targetPriority) {
      // 팝업이 이미 열려있으면 아무것도 하지 않음
    }
  }, [popups.targetIdentification, popups.targetPriority]);

  // Memoize original nodes to prevent recalculation
  const originalNodes = useMemo(() => 
    Array.isArray(nodes) ? nodes : (nodes?.nodes || nodes?.network || []),
    [nodes]
  );

  // Memoize trend data to prevent recalculation
  const trendData = useMemo(() => 
    originalNodes.map(n => ({
      degree_score: n.src_IP?.degree_score || n.dst_IP?.degree_score || 0,
      con_score: n.src_IP?.con_score || n.dst_IP?.con_score || 0
    })),
    [originalNodes]
  );

  // Memoize statistics calculations
  const statistics = useMemo(() => {
    const srcIpSet = new Set();
    filteredNodes.forEach(item => {
      if (item.src_IP && item.src_IP.ip) srcIpSet.add(item.src_IP.ip);
    });
    
    let directCurrent = 0, indirectCurrent = 0;
    srcIpSet.forEach(ip => {
      const node = filteredNodes.find(item => item.src_IP && item.src_IP.ip === ip)?.src_IP;
      if (!node || typeof node.degree_score !== 'number') return;
      if (node.degree_score > 0.5) {
        directCurrent += 1;
      } else if (node.degree_score > 0 && node.degree_score <= 0.5) {
        indirectCurrent += 1;
      }
    });

    const typeCountMap = {};
    filteredNodes.forEach(item => {
      [item.src_IP, item.dst_IP].forEach(node => {
        if (node && node.type) {
          typeCountMap[node.type] = (typeCountMap[node.type] || 0) + 1;
        }
      });
    });

    const degreeScores = [
      ...originalNodes.map(n => n.src_IP?.degree_score),
      ...originalNodes.map(n => n.dst_IP?.degree_score)
    ].filter(v => typeof v === 'number');
    
    const conScores = [
      ...originalNodes.map(n => n.src_IP?.con_score),
      ...originalNodes.map(n => n.dst_IP?.con_score)
    ].filter(v => typeof v === 'number');

    return {
      directCurrent,
      indirectCurrent,
      typeCountMap,
      degreeScoreAvg: degreeScores.length ? (degreeScores.reduce((a, b) => a + b, 0) / degreeScores.length).toFixed(3) : '-',
      degreeScoreMax: degreeScores.length ? Math.max(...degreeScores).toFixed(3) : '-',
      conScoreAvg: conScores.length ? (conScores.reduce((a, b) => a + b, 0) / conScores.length).toFixed(3) : '-',
      conScoreMax: conScores.length ? Math.max(...conScores).toFixed(3) : '-',
      uniqueTypes: extractUniqueTypes(originalNodes).length
    };
  }, [filteredNodes, originalNodes]);

  // Memoize table data
  const dbData = useMemo(() => [
    { category: 'direct', current: statistics.directCurrent, total: statistics.directCurrent },
    { category: 'indirect', current: statistics.indirectCurrent, total: statistics.indirectCurrent },
    ...Object.entries(statistics.typeCountMap).map(([type, count]) => ({ 
      category: type, 
      current: count, 
      total: count 
    }))
  ], [statistics]);

  React.useEffect(() => {
    if (!data) {
      interactionTracker.measureResponse(
        'TargetDashboard',
        'Fetch Network Data',
        async () => {
          const res = await fetch("http://localhost:8000/neo4j/nodes?activeView=target");
          const json = await res.json();
          return json;
        },
        { activeView: 'target' }
      ).then(({ result }) => setNodes(result)).catch(() => setNodes([]));
    } else {
      setNodes(data);
    }
  }, [data]);

  React.useEffect(() => {
    setFilteredNodes(originalNodes);
  }, [nodes, originalNodes]);

  // 컴포넌트 생애주기 추적
  useEffect(() => {
    interactionTracker.log('TargetDashboard', 'Component Mounted', { activeView });
    return () => {
      interactionTracker.log('TargetDashboard', 'Component Unmounted', { activeView });
    };
  }, [activeView]);

  // Memoize condition change handler
  const handleConditionChange = useCallback((newConditions, filteredData) => {
    interactionTracker.measureResponseSync(
      'TargetDashboard',
      'Filter Condition Change',
      () => {
        setFilterConditions(newConditions);
        setFilteredNodes(filteredData);
      },
      { 
        conditionCount: Object.keys(newConditions).length,
        filteredNodeCount: filteredData.length,
        originalNodeCount: originalNodes.length
      }
    );
  }, [originalNodes.length]);

  // Memoize node click handler
  const handleNodeClick = useCallback((node) => {
    interactionTracker.measureResponseSync(
      'TargetDashboard',
      'Node Click on Graph',
      () => {
        // 선택된 노드 저장
        setSelectedNode(node);
        // 새로운 로그 항목 생성
        const newLogEntry = {
          type: 'node-click',
          message: `노드 클릭: ${node.label || node.id}`,
          connectedCount: node.connectedCount,
          connectedIps: node.connectedIps,
          dbInfo: node.dbInfo,
          timestamp: new Date().toLocaleTimeString()
        };
        // 로그를 누적하지 않고 새 로그로 덮어쓰기
        setCurrentLogs([newLogEntry]);
        // 부모 컴포넌트에도 전달
        if (onNodeClick) onNodeClick(node);
      },
      {
        nodeId: node.id,
        label: node.label,
        connectedCount: node.connectedCount
      }
    );
  }, [onNodeClick]);

  // Memoize navigate handler
  const handleNavigateToResponse = useCallback(() => {
    interactionTracker.measureResponseSync(
      'TargetDashboard',
      'Navigate to Response Page',
      () => {
        if (!selectedNode) {
          alert('먼저 노드를 선택해주세요.');
          return;
        }
        
        // 선택된 노드 정보를 state로 전달하면서 페이지 이동
        navigate('/ActiveResponse/responseeffectvisualization', { state: { selectedNode } });
      },
      {
        destination: '/ActiveResponse/responseeffectvisualization',
        selectedNodeId: selectedNode?.id,
        hasSelectedNode: !!selectedNode
      }
    );
  }, [navigate, selectedNode]);

  return (
    <Card 
      component="main"
      role="main"
      aria-label="타겟 대시보드"
      sx={{
        width: '100%',
        height: 'calc(100vh - 132px)',
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
        {/* 좌측: 노드 필터링 조건 사이드바 */}
        <Box 
          component="aside"
          aria-label="필터 조건 패널"
          sx={{
            width: { xs: '100%', lg: 300 },
            maxWidth: { xs: '100%', lg: 300 },
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            flexShrink: 0,
            overflow: 'hidden'
          }}
        >
          <Card 
            component="section"
            aria-label="필터 조건"
            sx={{
              flex: 1,
              bgcolor: '#f0edfd',
              overflow: 'auto',
              minHeight: 0,
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(57, 48, 107, 0.07)'
            }}
          >
            <CardContent sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              p: 1.5,
              '&:last-child': { pb: 1.5 }
            }}>
              <Suspense fallback={<LoadingFallback />}>
                <TargetCondition 
                  onConditionChange={handleConditionChange}
                  data={originalNodes}
                  trendData={trendData}
                />
              </Suspense>
            </CardContent>
          </Card>
        </Box>

        {/* 메인 콘텐츠 영역 */}
        <Box 
          component="section"
          aria-label="대시보드 메인 콘텐츠"
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            minWidth: 0,
            overflow: 'hidden'
          }}
        >
          {/* 그래프 (전체 영역) */}
          <Card 
            component="section"
            aria-label="네트워크 그래프 영역"
            sx={{
              flex: 1,
              bgcolor: '#f0edfd',
              overflow: 'hidden',
              minWidth: 0,
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(57, 48, 107, 0.07)'
            }}
          >
            <CardContent sx={{ p: 0, height: '100%', '&:last-child': { pb: 0 } }}>
              <Suspense fallback={<LoadingFallback />}>
                <TargetGraphComp dbNodes={filteredNodes} onNodeClick={handleNodeClick} />
              </Suspense>
            </CardContent>
          </Card>
        </Box>

        {/* 우측: 이벤트 로그 사이드바 */}
        <Box 
          component="aside"
          aria-label="이벤트 로그 패널"
          sx={{
            width: { xs: '100%', lg: 300 },
            maxWidth: { xs: '100%', lg: 320 },
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            flexShrink: 0,
            overflow: 'hidden'
          }}
        >
          {/* 이벤트 로그 */}
          <Card 
            component="section"
            aria-label="이벤트 로그"
            sx={{
              flex: 1,
              bgcolor: '#f0edfd',
              overflow: 'auto',
              minHeight: 0,
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(57, 48, 107, 0.07)'
            }}
          >
            <CardContent sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              '&:last-child': { pb: 2 }
            }}>
              <Suspense fallback={<LoadingFallback />}>
                <EventLog logs={currentLogs} activeView={activeView} selectedNode={selectedNode} />
              </Suspense>
            </CardContent>
          </Card>
        </Box>
      </CardContent>

      {/* 오른쪽 하단 팝업 버튼들 */}
      <IconButton
        size="small"
        aria-label="네트워크 구조 분석 및 표적 식별"
        title="네트워크 구조 분석 및 표적 식별"
        onClick={() => {
          interactionTracker.measureResponseSync(
            'TargetDashboard',
            'Open Target Priority Popup',
            () => openPopup('targetPriority'),
            { popupName: 'targetPriority' }
          );
        }}
        sx={{
          position: 'absolute',
          bottom: 40,
          right: 100,
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
        <PushpinOutlined style={{ fontSize: 24 }} />
      </IconButton>

      <IconButton
        size="small"
        aria-label="핵심 표적 점수 분석"
        title="핵심 표적 점수 분석"
        onClick={() => {
          interactionTracker.measureResponseSync(
            'TargetDashboard',
            'Open Target Priority Popup (Score Analysis)',
            () => openPopup('targetPriority'),
            { popupName: 'targetPriority' }
          );
        }}
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

      {/* 네트워크 구조 분석 팝업 */}
      <Dialog
        open={targetIdentificationOpen}
        onClose={() => {
          interactionTracker.measureResponseSync(
            'TargetDashboard',
            'Close Target Identification Popup (Outside Click)',
            () => closePopup('targetIdentification'),
            { popupName: 'targetIdentification' }
          );
        }}
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
          onClick={() => {
            interactionTracker.measureResponseSync(
              'TargetDashboard',
              'Close Target Identification Popup (X Button)',
              () => closePopup('targetIdentification'),
              { popupName: 'targetIdentification' }
            );
          }}
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
          <TargetIdentification open={targetIdentificationOpen} isPopup={true} />
        </DialogContent>
      </Dialog>

      {/* 핵심 표적 점수 분석 팝업 */}
      <Dialog
        open={targetPriorityOpen}
        onClose={() => {
          interactionTracker.measureResponseSync(
            'TargetDashboard',
            'Close Target Priority Popup (Outside Click)',
            () => closePopup('targetPriority'),
            { popupName: 'targetPriority' }
          );
        }}
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
          onClick={() => {
            interactionTracker.measureResponseSync(
              'TargetDashboard',
              'Close Target Priority Popup (X Button)',
              () => closePopup('targetPriority'),
              { popupName: 'targetPriority' }
            );
          }}
          sx={{
            position: 'absolute',
            right: 23,
            top: 8.5,
            color: '#666',
            zIndex: 1,
            bgcolor: '#cac7d4ff',
            '&:hover': {
              bgcolor: 'rgba(255,255,255,1)',
              color: '#000'
            }
          }}
        >
          ✕
        </IconButton>
        <DialogContent sx={{ p: 0, height: '100%', overflow: 'hidden' }}>
          <TargetPriority open={targetPriorityOpen} isPopup={true} />
        </DialogContent>
      </Dialog>
    </Card>
  );
}

