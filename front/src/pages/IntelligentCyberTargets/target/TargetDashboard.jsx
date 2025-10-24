import React, { useState, useCallback, useMemo, lazy, Suspense, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, Box, Grid, Typography, IconButton, Dialog, DialogContent } from "@mui/material";
import { PushpinOutlined, AreaChartOutlined } from '@ant-design/icons';

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
  const targetIdentificationOpen = popups.targetDetail && popups.targetDetail;
  const targetPriorityOpen = popups.targetDetail && popups.targetDetail;

  // 메뉴에서 팝업 오픈 요청 시 자동으로 열리도록
  useEffect(() => {
    if (popups.targetDetail) {
      // 팝업이 이미 열려있으면 아무것도 하지 않음
    }
  }, [popups.targetDetail]);

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
      fetch("http://localhost:8000/neo4j/nodes?activeView=target")
        .then(res => res.json())
        .then(setNodes)
        .catch(() => setNodes([]));
    } else {
      setNodes(data);
    }
  }, [data]);

  React.useEffect(() => {
    setFilteredNodes(originalNodes);
  }, [nodes, originalNodes]);

  // Memoize condition change handler
  const handleConditionChange = useCallback((newConditions, filteredData) => {
    setFilterConditions(newConditions);
    setFilteredNodes(filteredData);
  }, []);

  // Memoize node click handler
  const handleNodeClick = useCallback((node) => {
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
  }, [onNodeClick]);

  // Memoize navigate handler
  const handleNavigateToResponse = useCallback(() => {
    if (!selectedNode) {
      alert('먼저 노드를 선택해주세요.');
      return;
    }
    // 선택된 노드 정보를 state로 전달하면서 페이지 이동
    navigate('/ActiveResponse/responseeffectvisualization', { state: { selectedNode } });
  }, [navigate, selectedNode]);

  return (
    <Card 
      component="main"
      role="main"
      aria-label="타겟 대시보드"
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
          {/* 상단 통계 카드 및 트렌드 차트 영역 */}
          <Card 
            component="section"
            aria-label="통계 및 트렌드 영역"
            sx={{
              bgcolor: 'transparent',
              boxShadow: 'none',
              flexShrink: 0
            }}
          >
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'row', 
                gap: 2, // 1.5 → 2로 증가 (하단 gap과 동일)
                alignItems: 'center',
                justifyContent: 'space-between', // center → space-between으로 변경
                flexWrap: 'nowrap',
                height: '240px',
                width: '100%'
              }}>
                {/* 통계 카드 그리드 */}
                <Box sx={{ 
                  flex: '0 0 auto',
                  width: 'calc(50% - 8px)', // 정확한 절반 크기
                  minWidth: 0,
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start' // 좌측 정렬
                }}>
                  <Grid container spacing={1} sx={{ height: '100%', justifyContent: 'flex-start' }}>
                    <Grid item xs={12} sm={6} md={4} lg={2.4} sx={{ height: '100%' }}>
                      <Card sx={{ 
                        bgcolor: '#f0edfd', 
                        boxShadow: '0 2px 8px rgba(57, 48, 107, 0.07)',
                        borderRadius: '12px',
                        height: '100%',
                        maxWidth: '220px'
                      }}>
                        <CardContent sx={{ 
                          p: 2, 
                          '&:last-child': { pb: 2 },
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center'
                        }}>
                          <Box sx={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Typography variant="h3" sx={{ color: '#39306b', fontWeight: 'bold', mb: 1, fontSize: '2.5rem' }}>
                              {originalNodes.length}
                            </Typography>
                            <Typography variant="body2" sx={{ fontSize: '0.9rem', fontWeight: 600, textAlign: 'center', mb: 0.5 }}>
                              전체 노드 개수
                            </Typography>
                            <Typography variant="caption" sx={{ fontSize: '0.8rem', color: '#767686', textAlign: 'center' }}>
                              네트워크 내 모든 노드
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4} lg={2.4} sx={{ height: '100%' }}>
                      <Card sx={{ 
                        bgcolor: '#f0edfd', 
                        boxShadow: '0 2px 8px rgba(57, 48, 107, 0.07)',
                        borderRadius: '12px',
                        height: '100%',
                        maxWidth: '220px'
                      }}>
                        <CardContent sx={{ 
                          p: 2, 
                          '&:last-child': { pb: 2 },
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center'
                        }}>
                          <Box sx={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Typography variant="h3" sx={{ color: '#39306b', fontWeight: 'bold', mb: 1, fontSize: '2.5rem' }}>
                              {filteredNodes.length}
                            </Typography>
                            <Typography variant="body2" sx={{ fontSize: '0.9rem', fontWeight: 600, textAlign: 'center', mb: 0.5 }}>
                              필터링된 노드
                            </Typography>
                            <Typography variant="caption" sx={{ fontSize: '0.8rem', color: '#767686', textAlign: 'center' }}>
                              {filterConditions.isActive ? `(전체: ${originalNodes.length})` : "총 노드 수"}
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4} lg={2.4} sx={{ height: '100%' }}>
                      <Card sx={{ 
                        bgcolor: '#f0edfd', 
                        boxShadow: '0 2px 8px rgba(57, 48, 107, 0.07)',
                        borderRadius: '12px',
                        height: '100%',
                        maxWidth: '220px'
                      }}>
                        <CardContent sx={{ 
                          p: 2, 
                          '&:last-child': { pb: 2 },
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center'
                        }}>
                          <Box sx={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Typography variant="h3" sx={{ color: '#39306b', fontWeight: 'bold', mb: 1, fontSize: '2.5rem' }}>
                              {statistics.uniqueTypes}
                            </Typography>
                            <Typography variant="body2" sx={{ fontSize: '0.9rem', fontWeight: 600, textAlign: 'center', mb: 0.5 }}>
                              고유 타입 개수
                            </Typography>
                            <Typography variant="caption" sx={{ fontSize: '0.8rem', color: '#767686', textAlign: 'center' }}>
                              네트워크 내 타입
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4} lg={2.4} sx={{ height: '100%' }}>
                      <Card sx={{ 
                        bgcolor: '#f0edfd', 
                        boxShadow: '0 2px 8px rgba(57, 48, 107, 0.07)',
                        borderRadius: '12px',
                        height: '100%',
                        maxWidth: '220px'
                      }}>
                        <CardContent sx={{ 
                          p: 2, 
                          '&:last-child': { pb: 2 },
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center'
                        }}>
                          <Box sx={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Typography variant="h5" sx={{ color: '#39306b', fontWeight: 'bold', mb: 1, fontSize: '1.4rem' }}>
                              {statistics.degreeScoreAvg} / {statistics.degreeScoreMax}
                            </Typography>
                            <Typography variant="body2" sx={{ fontSize: '0.9rem', fontWeight: 600, textAlign: 'center', mb: 0.5 }}>
                              degree_score
                            </Typography>
                            <Typography variant="caption" sx={{ fontSize: '0.8rem', color: '#767686', textAlign: 'center' }}>
                              평균 / 최고값
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4} lg={2.4} sx={{ height: '100%' }}>
                      <Card sx={{ 
                        bgcolor: '#f0edfd', 
                        boxShadow: '0 2px 8px rgba(57, 48, 107, 0.07)',
                        borderRadius: '12px',
                        height: '100%',
                        maxWidth: '220px'
                      }}>
                        <CardContent sx={{ 
                          p: 2, 
                          '&:last-child': { pb: 2 },
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center'
                        }}>
                          <Box sx={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Typography variant="h5" sx={{ color: '#39306b', fontWeight: 'bold', mb: 1, fontSize: '1.4rem' }}>
                              {statistics.conScoreAvg} / {statistics.conScoreMax}
                            </Typography>
                            <Typography variant="body2" sx={{ fontSize: '0.9rem', fontWeight: 600, textAlign: 'center', mb: 0.5 }}>
                              con_score
                            </Typography>
                            <Typography variant="caption" sx={{ fontSize: '0.8rem', color: '#767686', textAlign: 'center' }}>
                              평균 / 최고값
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Box>

                {/* 트렌드 차트 */}
                <Box sx={{ 
                  flex: '0 0 auto',
                  width: 'calc(50% - 8px)', // 정확한 절반 크기
                  minWidth: 0,
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end' // 우측 정렬
                }}>
                  <Card sx={{ 
                    width: '100%',
                    height: '100%',
                    bgcolor: '#f0edfd',
                    boxShadow: '0 2px 8px rgba(57, 48, 107, 0.07)',
                    borderRadius: '16px'
                  }}>
                    <CardContent sx={{ 
                      p: 2, 
                      '&:last-child': { pb: 2 }, 
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Box sx={{ width: '100%', height: '100%' }}>
                        <Suspense fallback={<LoadingFallback />}>
                          <TrendChart data={trendData} />
                        </Suspense>
                      </Box>
                    </CardContent>
                  </Card>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* 하단 3분할 레이아웃 (필터/그래프/테이블) */}
          <Box 
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: { xs: 'column', lg: 'row' },
              gap: 2,
              minHeight: 0,
              overflow: 'hidden'
            }}
          >
            {/* 좌측: 필터 조건 */}
            <Card 
              component="section"
              aria-label="필터 조건 영역"
              sx={{
                width: { xs: '100%', lg: 300 }, // 260 → 300으로 증가
                flexShrink: 0,
                bgcolor: '#f0edfd',
                overflow: 'auto'
              }}
            >
              <CardContent>
                <Suspense fallback={<LoadingFallback />}>
                  <TargetCondition 
                    onConditionChange={handleConditionChange}
                    data={originalNodes}
                  />
                </Suspense>
              </CardContent>
            </Card>

            {/* 중앙: 그래프 */}
            <Card 
              component="section"
              aria-label="네트워크 그래프 영역"
              sx={{
                flex: 1,
                bgcolor: '#f0edfd',
                overflow: 'hidden',
                minWidth: 0
              }}
            >
              <CardContent sx={{ p: 0, height: '100%', '&:last-child': { pb: 0 } }}>
                <Suspense fallback={<LoadingFallback />}>
                  <TargetGraphComp dbNodes={filteredNodes} onNodeClick={handleNodeClick} />
                </Suspense>
              </CardContent>
            </Card>

            {/* 우측: 데이터 테이블 */}
            <Card 
              component="section"
              aria-label="데이터 테이블 영역"
              sx={{
                width: { xs: '100%', lg: 300 }, // 260 → 300으로 증가
                flexShrink: 0,
                bgcolor: '#f0edfd',
                overflow: 'auto'
              }}
            >
              <CardContent>
                <Suspense fallback={<LoadingFallback />}>
                  <DataTable dbData={dbData} />
                </Suspense>
              </CardContent>
            </Card>
          </Box>
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
              minHeight: 0
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
        onClick={() => openPopup('targetDetail')}
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
        onClick={() => openPopup('targetDetail')}
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
        onClose={() => closePopup('targetDetail')}
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
          onClick={() => closePopup('targetDetail')}
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
        onClose={() => closePopup('targetDetail')}
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
          onClick={() => closePopup('targetDetail')}
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

