// material-ui
import React, { useState, useEffect } from 'react';
import interactionTracker from '../../../utils/interactionTracker';
import { useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid2';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { Card, CardContent } from '@mui/material';

// project imports
import { GlobeMini, Zone7Mini, OffensiveStrategyMini, TargetGraph2DMini } from './CardDisplay';

// ==============================|| DASHBOARD - DEFAULT ||============================== //

export default function DashboardDefault() {
  const [dbNodes, setDbNodes] = useState([]);
  const [currentView, setCurrentView] = useState(0); // 0, 1, 2, 3 for 4 visualizations
  const navigate = useNavigate();

  // Track component mount
  useEffect(() => {
    interactionTracker.log('DashboardDefault', 'Component Mounted', {});
    return () => {
      interactionTracker.log('DashboardDefault', 'Component Unmounted', {});
    };
  }, []);

  // Neo4j에서 차단된 공격 데이터 가져오기
  useEffect(() => {
    const fetchData = async () => {
      const startTime = performance.now();
      try {
        const res = await fetch('http://localhost:8000/neo4j/nodes?activeView=target');
        const data = await res.json();
        const endTime = performance.now();
        interactionTracker.log('DashboardDefault', 'Fetch Neo4j Nodes', { 
          nodeCount: data.length, 
          responseTime: `${(endTime - startTime).toFixed(2)}ms` 
        });
        setDbNodes(data);
      } catch (error) {
        interactionTracker.log('DashboardDefault', 'Fetch Neo4j Nodes Failed', { error: error.message });
        console.warn('Failed to fetch nodes');
      }
    };
    fetchData();
  }, []);

  // 각 카드별 네비게이션 함수
  const handleTimeSeries = () => {
    interactionTracker.measureResponseSync(
      'DashboardDefault',
      'Navigate to Time Series',
      () => navigate('/ExtInt/TimeSeriesVisualization'),
      { destination: '/ExtInt/TimeSeriesVisualization' }
    );
  };
  const handleTargetDashboard = () => {
    interactionTracker.measureResponseSync(
      'DashboardDefault',
      'Navigate to Target Dashboard',
      () => navigate('/target/targetDashboard'),
      { destination: '/target/targetDashboard' }
    );
  };
  const handleInternalTopology = () => {
    interactionTracker.measureResponseSync(
      'DashboardDefault',
      'Navigate to Internal Topology',
      () => navigate('/ExtInt/internaltopology'),
      { destination: '/ExtInt/internaltopology' }
    );
  };
  const handleActiveResponse = () => {
    interactionTracker.measureResponseSync(
      'DashboardDefault',
      'Navigate to Active Response',
      () => navigate('/ActiveResponse/responseeffectvisualization'),
      { destination: '/ActiveResponse/responseeffectvisualization' }
    );
  };

  // 시각화 뷰 변경 함수
  const handlePrevView = () => {
    setCurrentView((prev) => (prev - 1 + 4) % 4);
    interactionTracker.log('DashboardDefault', 'Previous View', { currentView: (currentView - 1 + 4) % 4 });
  };

  const handleNextView = () => {
    setCurrentView((prev) => (prev + 1) % 4);
    interactionTracker.log('DashboardDefault', 'Next View', { currentView: (currentView + 1) % 4 });
  };

  // 시각화 컨텐츠 및 정보 배열
  const visualizations = [
    {
      title: '🌍 Osint & 시계열 기반 이상 탐지 가시화',
      component: <GlobeMini />,
      action: handleTimeSeries,
      mainTitle: 'BGP란 무엇인가?',
      description: [
        '대규모 인터넷 상에서 자율 시스템(AS) 간 방대한 통신 경로를 설정하는 핵심 정밀 라우팅 프로토콜입니다.',
        '데이터는 공격 경로 우회 또는 위협 트래픽을 선제적으로 차단하고 방어하기 위해 아카이빙 됩니다.',
        '우측 시각화 뷰어를 통하여 이상 징후 및 하이재킹 공격 데이터의 흐름을 한 화면에서 모니터링할 수 있습니다.'
      ],
      flowSteps: ['BGP 라우팅 데이터 수집', '시계열 기반 이상 징후 분석', '글로벌 위협 흐름 가시화']
    },
    {
      title: '🗺️ 내부망 분석 & 기본맵 토폴로지 생성 가시화',
      component: <Zone7Mini />,
      action: handleInternalTopology,
      mainTitle: '내부망 토폴로지 분석',
      description: [
        '수집된 네트워크 데이터를 기반으로 내부망의 실제 물리적/논리적 연결 상태를 토폴로지로 구성합니다.',
        '자산 간의 연결 관계, 통신 흐름, 그리고 중요 거점 노드를 시각적으로 파악할 수 있습니다.',
        '구축된 기본맵을 바탕으로 향후 발생할 수 있는 내부 확산 이동(Lateral Movement) 경로를 예측합니다.'
      ],
      flowSteps: ['네트워크 트래픽 스니핑', '물리/논리 자산 맵 구성', '침해 확산(Lateral.M) 경로 분석']
    },
    {
      title: '🎯 후보 표적 개발 & 핵심 표적 분석 가시화',
      component: <TargetGraph2DMini dbNodes={dbNodes} />,
      action: handleTargetDashboard,
      mainTitle: '핵심 타겟(표적) 분석',
      description: [
        '위협 데이터를 분석하여 공격자가 노릴 가능성이 높은 잠재적 후보 표적들을 식별합니다.',
        '각 노드의 취약성, 파급력, 접근성을 종합적으로 평가하여 핵심 표적의 우선순위를 결정합니다.',
        '시각화 그래프를 통해 타겟을 중심으로 한 의존성 관계와 잠재적 공격 벡터를 심층 분석할 수 있습니다.'
      ],
      flowSteps: ['잠재 위협 노드 스캐닝', '다차원 가치 및 취약성 평가', '핵심 후보 표적 우선순위화']
    },
    {
      title: '⚔️ 노드 분석 & 능동대응책 생성 가시화',
      component: <OffensiveStrategyMini />,
      action: handleActiveResponse,
      mainTitle: '능동대응 및 방어 전략',
      description: [
        '침해 및 위협 노드에 대한 상세 분석을 수행하고, 이를 격리하거나 방어하기 위한 실행 가능한 전략을 생성합니다.',
        '선제적 대응(Active Response)을 위한 다양한 시나리오와 조치 방안을 실시간으로 도출합니다.',
        '자동화된 능동대응책을 가시화하여 의사결정자가 신속하고 정확한 방어 조치를 취할 수 있도록 지원합니다.'
      ],
      flowSteps: ['침투 시나리오 시뮬레이션', '방어/우회 네트워크 차단 테스트', '최적 능동대응 정책 수립']
    }
  ];

  return (
    <Box sx={{ height: 'calc(100vh - 90px)', display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>

      {/* 하단 가변 카드 - 2열 그리드 */}
      <Card 
        sx={{
          bgcolor: 'background.paper',
          boxShadow: 2,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          flex: 1,
          minHeight: 0,
          overflow: 'auto'
        }}
      >
        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 3 } }}> 
          <Grid container spacing={2}>
            {/* 1행 - BGP Archive 메인 부모 카드 (전체 폭) */}
            <Grid size={12}>
              <Card
                onClick={() => interactionTracker.log('DashboardDefault', 'Card Interaction')}
                sx={{
                  bgcolor: '#F0EDFD', // 부모 카드를 연보라색으로 변경
                  boxShadow: 'none',
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  height: '47vh',
                  display: 'flex',
                  alignItems: 'center',
                  py: 2.5, px: 4, // 넉넉한 내부 여백으로 스케치와 같은 감싸는 느낌 부여
                  gap: 3,
                  cursor: 'pointer'
                }}
              >
                {/* 좌측: BGP 설명 영역 (시각화 뷰에 따라 변경됨) */}
                <Box sx={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', pr: 2, py: 1.5 }}>
                  <Typography variant="h2" color="#000" fontWeight="bold" sx={{ mb: 2 }}>
                    {visualizations[currentView].mainTitle}
                  </Typography>

                  {visualizations[currentView].description.map((desc, index) => (
                    <Typography key={index} variant="h6" color="#000" sx={{ mb: 2, lineHeight: 1.8, fontSize: '1.25rem' }}>
                      • {desc}
                    </Typography>
                  ))}

                  {/*  컴포넌트 흐름도  */}
                  <Box sx={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    flexWrap: 'wrap', 
                    gap: 1.2, 
                    mt: 3, 
                    mb: 2, 
                    p: 2, 
                    bgcolor: '#F0EDFD', 
                    borderRadius: 2,
                    alignSelf: 'flex-start',
                    width: 'fit-content'
                  }}>
                    <Typography variant="subtitle1" color="#000" fontWeight="bold" sx={{ mr: 1 }}>
                      진행 흐름:
                    </Typography>
                    {visualizations[currentView].flowSteps.map((step, index) => (
                      <React.Fragment key={index}>
                        <Box sx={{ 
                          bgcolor: '#E4DFFA', 
                          px: 2, 
                          py: 0.8, 
                          borderRadius: 2, 
                          border: '1px solid', 
                          borderColor: '#C9C2F0', 
                          fontSize: '1rem', 
                          fontWeight: 'bold', 
                          color: '#000', 
                        }}>
                          {index + 1} {step}
                        </Box>
                        {index < visualizations[currentView].flowSteps.length - 1 && (
                          <Typography variant="h6" color="#000" sx={{ mx: 0.5, fontWeight: 'bold' }}>
                            ➔
                          </Typography>
                        )}
                      </React.Fragment>
                    ))}
                  </Box>
                </Box>

                {/* 우측: 시각화 뷰어 하위/자식 카드 */}
                <Card 
                  elevation={4} // 그림자를 주어 돌출된 하위 요소임을 강조
                  sx={{ 
                    width: '42vh', // 정방형 비율 유지하면서 사이즈 증가
                    height: '42vh',
                    mr: 6, // 우측 여백을 추가하여 카드를 조금 더 왼쪽으로 이동
                    bgcolor: '#ffffff', // 자식 뷰어는 또렷한 흰색 배경
                    borderRadius: 4,
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    flexShrink: 0,
                    border: '1px solid',
                    borderColor: 'grey.200'
                  }}
                >
                  {/* 시각화 컨텐츠 (전체 영역 차지) */}
                  <Box sx={{ flex: 1, position: 'relative', width: '100%', height: '100%' }}>
                    {visualizations[currentView].component}
                  </Box>

                  {/* 하단 투명 네비게이션 화살표 */}
                  <Box sx={{ 
                    position: 'absolute',
                    bottom: 16,
                    left: 0,
                    right: 0,
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    gap: 4,
                    zIndex: 20
                  }}>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrevView();
                      }}
                      sx={{ 
                        minWidth: '40px', 
                        height: '40px', 
                        borderRadius: '50%',
                        bgcolor: 'rgba(255,255,255,0.7)',
                        color: '#000',
                        fontSize: '1.2rem',
                        fontWeight: 'bold',
                        boxShadow: 1,
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
                      }}
                    >
                      &lt;
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNextView();
                      }}
                      sx={{ 
                        minWidth: '40px', 
                        height: '40px', 
                        borderRadius: '50%',
                        bgcolor: 'rgba(255,255,255,0.7)',
                        color: '#000',
                        fontSize: '1.2rem',
                        fontWeight: 'bold',
                        boxShadow: 1,
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
                      }}
                    >
                      &gt;
                    </Button>
                  </Box>
                  
                  {/* 제목 및 이동 버튼 (상단) */}
                  <Box sx={{ 
                    position: 'absolute', 
                    top: 8, 
                    left: 8, 
                    right: 8, 
                    zIndex: 10, 
                    bgcolor: 'rgba(255,255,255,0.85)', 
                    px: 1.5, 
                    py: 1,
                    borderRadius: 2,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    <Typography variant="subtitle1" color="#000" fontWeight="bold">
                      {visualizations[currentView].title}
                    </Typography>
                    <Button
                      size="medium"
                      variant="text"
                      onClick={(e) => {
                        e.stopPropagation();
                        visualizations[currentView].action();
                      }}
                      sx={{ ml: 1, minWidth: '40px', p: 0, fontSize: '0.95rem' }}
                    >
                      이동
                    </Button>
                  </Box>
                </Card>
              </Card>
            </Grid>
            
            {/* 2행 좌측 - OSINT 시계열 */}
            <Grid size={6}>
              <Card
                onClick={() => interactionTracker.log('DashboardDefault', 'Card Interaction', { card: 'OSINT 시계열' })}
                sx={{
                  bgcolor: '#F0EDFD',
                  boxShadow: 1,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  height: '20vh',
                  display: 'flex',
                  overflow: 'hidden',
                  cursor: 'pointer'
                }}
              >
                <Box sx={{ flex: 1, position: 'relative' }}>
                  <Box sx={{ position: 'absolute', top: 12, left: 16, zIndex: 10 }}>
                    <Typography variant="h3" color="#000" fontWeight="bold">
                      🌍 Osint & 시계열 기반 이상 탐지 가시화
                    </Typography>
                    <Typography variant="subtitle1" color="#000" sx={{ mt: 0.5, fontWeight: 'medium' }}>
                      오픈소스 인텔리전스 및 BGP 라우팅 데이터 기반 외부 위협 탐지 채널
                    </Typography>
                  </Box>
                  <Button
                    size="medium"
                    variant="outlined"
                    onClick={handleTimeSeries}
                    sx={{ position: 'absolute', top: 4, right: 8, zIndex: 10, fontSize: '0.95rem' }}
                  >
                    이동하기
                  </Button>
                  <Box sx={{ p: 3, pt: 8, pb: 6, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <Typography variant="body1" color="#000" sx={{ lineHeight: 1.7, mb: 1, fontSize: '1.05rem' }}>
                      <strong>• 글로벌 침해 흐름 추적:</strong> 위협 IP의 발원지와 공격 트래픽 경로를 입체적으로 매핑하여 직관적으로 파악할 수 있는 시각화 환경을 제공합니다.
                    </Typography>
                    <Typography variant="body1" color="#000" sx={{ lineHeight: 1.7, fontSize: '1.05rem' }}>
                      <strong>• 시계열 기반 모니터링:</strong> 시간에 따른 이상 징후 발생 빈도 분석 및 집중도 변화 트렌드를 살펴볼 수 있습니다.
                    </Typography>
                  </Box>
                  <Box sx={{ position: 'absolute', bottom: 8, left: 16, right: 16, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="body2" sx={{ bgcolor: 'rgba(0,0,0,0.06)', px: 1, py: 0.5, borderRadius: 1 }}>#위협 발원지 추적</Typography>
                    <Typography variant="body2" sx={{ bgcolor: 'rgba(0,0,0,0.06)', px: 1, py: 0.5, borderRadius: 1 }}>#네트워크 트래픽</Typography>
                    <Typography variant="body2" sx={{ bgcolor: 'rgba(0,0,0,0.06)', px: 1, py: 0.5, borderRadius: 1 }}>#시간별 빈도 분석</Typography>
                  </Box>
                </Box>
              </Card>
            </Grid>

            {/* 2행 우측 - 내부망 분석 */}
            <Grid size={6}>
              <Card
                onClick={() => interactionTracker.log('DashboardDefault', 'Card Interaction', { card: '내부망 분석' })}
                sx={{
                  bgcolor: '#F0EDFD',
                  boxShadow: 1,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  height: '20vh',
                  display: 'flex',
                  overflow: 'hidden',
                  cursor: 'pointer'
                }}
              >
                <Box sx={{ flex: 1, position: 'relative' }}>
                  <Box sx={{ position: 'absolute', top: 12, left: 16, zIndex: 10, bgcolor: 'rgba(240,237,253,0.85)', px: 0.5, borderRadius: 1 }}>
                    <Typography variant="h3" color="#000" fontWeight="bold">
                      🗺️ 내부망 분석 & 기본맵 토폴로지 생성 가시화
                    </Typography>
                    <Typography variant="subtitle1" color="#000" sx={{ mt: 0.5, fontWeight: 'medium' }}>
                      물리/논리적 네트워크 구조 매핑 및 자산 연결성 분석 채널
                    </Typography>
                  </Box>
                  <Button
                    size="medium"
                    variant="outlined"
                    onClick={handleInternalTopology}
                    sx={{ position: 'absolute', top: 4, right: 8, zIndex: 10, bgcolor: 'rgba(255,255,255,0.85)', fontSize: '0.95rem' }}
                  >
                    이동하기
                  </Button>
                  <Box sx={{ p: 3, pt: 8, pb: 6, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <Typography variant="body1" color="#000" sx={{ lineHeight: 1.7, mb: 1, fontSize: '1.05rem' }}>
                      <strong>• 토폴로지 자동 생성:</strong> 네트워크 라우팅 데이터를 반영하여 거점 노드 및 내부망 전체 구조를 논리적·물리적 맵으로 렌더링합니다.
                    </Typography>
                    <Typography variant="body1" color="#000" sx={{ lineHeight: 1.7, fontSize: '1.05rem' }}>
                      <strong>• 자산 의존성 파악:</strong> 각 서버, 라우터 간 연결성을 파악해 공격의 내부 확산(Lateral Movement) 예상 경로를 시뮬레이션합니다.
                    </Typography>
                  </Box>
                  <Box sx={{ position: 'absolute', bottom: 8, left: 16, right: 16, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="body2" sx={{ bgcolor: 'rgba(0,0,0,0.06)', px: 1, py: 0.5, borderRadius: 1 }}>#물리/논리 맵 생성</Typography>
                    <Typography variant="body2" sx={{ bgcolor: 'rgba(0,0,0,0.06)', px: 1, py: 0.5, borderRadius: 1 }}>#거점 노드 식별</Typography>
                    <Typography variant="body2" sx={{ bgcolor: 'rgba(0,0,0,0.06)', px: 1, py: 0.5, borderRadius: 1 }}>#내부 확산 경로 시뮬레이션</Typography>
                  </Box>
                </Box>
              </Card>
            </Grid>

            {/* 3행 좌측 - 후보 표적 개발 */}
            <Grid size={6}>
              <Card
                onClick={() => interactionTracker.log('DashboardDefault', 'Card Interaction', { card: '후보 표적 개발' })}
                sx={{
                  bgcolor: '#F0EDFD',
                  boxShadow: 1,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  height: '20vh',
                  display: 'flex',
                  overflow: 'hidden',
                  cursor: 'pointer'
                }}
              >
                <Box sx={{ flex: 1, position: 'relative' }}>
                  <Box sx={{ position: 'absolute', top: 12, left: 16, zIndex: 10, bgcolor: 'rgba(240,237,253,0.85)', px: 0.5, borderRadius: 1 }}>
                    <Typography variant="h3" color="#000" fontWeight="bold">
                      🎯 후보 표적 개발 & 핵심 표적 분석 가시화
                    </Typography>
                    <Typography variant="subtitle1" color="#000" sx={{ mt: 0.5, fontWeight: 'medium' }}>
                      다차원 위협 가치 평가를 통한 핵심 후보 표적 식별 채널
                    </Typography>
                  </Box>
                  <Button
                    size="medium"
                    variant="outlined"
                    onClick={handleTargetDashboard}
                    sx={{ position: 'absolute', top: 4, right: 8, zIndex: 10, bgcolor: 'rgba(255,255,255,0.85)', fontSize: '0.95rem' }}
                  >
                    이동하기
                  </Button>
                  <Box sx={{ p: 3, pt: 8, pb: 6, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <Typography variant="body1" color="#000" sx={{ lineHeight: 1.7, mb: 1, fontSize: '1.05rem' }}>
                      <strong>• 핵심 타겟 식별:</strong> 침투 가능한 자산 노드들의 취약성과 시스템상 파급력, 접근 난이도를 평가해 최적의 후보 표적을 선별합니다.
                    </Typography>
                    <Typography variant="body1" color="#000" sx={{ lineHeight: 1.7, fontSize: '1.05rem' }}>
                      <strong>• 다차원 가치 분석:</strong> 종합적인 조건 필터링과 다차원 그래프 분석으로 위협 모델의 잠재 표적의 우선순위를 심층적으로 목록화합니다.
                    </Typography>
                  </Box>
                  <Box sx={{ position: 'absolute', bottom: 8, left: 16, right: 16, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="body2" sx={{ bgcolor: 'rgba(0,0,0,0.06)', px: 1, py: 0.5, borderRadius: 1 }}>#취약성 및 파급력 평가</Typography>
                    <Typography variant="body2" sx={{ bgcolor: 'rgba(0,0,0,0.06)', px: 1, py: 0.5, borderRadius: 1 }}>#후보 표적 필터링</Typography>
                    <Typography variant="body2" sx={{ bgcolor: 'rgba(0,0,0,0.06)', px: 1, py: 0.5, borderRadius: 1 }}>#우선순위 도출</Typography>
                  </Box>
                </Box>
              </Card>
            </Grid>

            {/* 3행 우측 - 노드 분석 & 능동대응책 */}
            <Grid size={6}>
              <Card
                onClick={() => interactionTracker.log('DashboardDefault', 'Card Interaction', { card: '능동대응책' })}
                sx={{
                  bgcolor: '#F0EDFD',
                  boxShadow: 1,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  height: '20vh',
                  display: 'flex',
                  overflow: 'hidden',
                  cursor: 'pointer'
                }}
              >
                <Box sx={{ flex: 1, position: 'relative' }}>
                  <Box sx={{ position: 'absolute', top: 12, left: 16, zIndex: 10, bgcolor: 'rgba(240,237,253,0.85)', px: 0.5, borderRadius: 1 }}>
                    <Typography variant="h3" color="#000" fontWeight="bold">
                      ⚔️ 노드 분석 & 능동대응책 생성 가시화
                    </Typography>
                    <Typography variant="subtitle1" color="#000" sx={{ mt: 0.5, fontWeight: 'medium' }}>
                      침해 확산 방지를 위한 맞춤형 네트워크 능동 방어 정책 수립 채널
                    </Typography>
                  </Box>
                  <Button
                    size="medium"
                    variant="outlined"
                    onClick={handleActiveResponse}
                    sx={{ position: 'absolute', top: 4, right: 8, zIndex: 10, bgcolor: 'rgba(255,255,255,0.85)', fontSize: '0.95rem' }}
                  >
                    이동하기
                  </Button>
                  <Box sx={{ p: 3, pt: 8, pb: 6, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <Typography variant="body1" color="#000" sx={{ lineHeight: 1.7, mb: 1, fontSize: '1.05rem' }}>
                      <strong>• 가상 대응 시뮬레이션:</strong> 핵심 노드를 무력화하거나 네트워크 흐름을 차단했을 때의 효과를 시각적 그래프로 직접 테스트합니다.
                    </Typography>
                    <Typography variant="body1" color="#000" sx={{ lineHeight: 1.7, fontSize: '1.05rem' }}>
                      <strong>• 능동 방어 전략 도출:</strong> 공격 무력화를 위한 방어 및 우회 시나리오를 구성하여 의사결정을 지원하는 최적의 대응책을 수립합니다.
                    </Typography>
                  </Box>
                  <Box sx={{ position: 'absolute', bottom: 8, left: 16, right: 16, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="body2" sx={{ bgcolor: 'rgba(0,0,0,0.06)', px: 1, py: 0.5, borderRadius: 1 }}>#네트워크 차단 효과</Typography>
                    <Typography variant="body2" sx={{ bgcolor: 'rgba(0,0,0,0.06)', px: 1, py: 0.5, borderRadius: 1 }}>#방어/우회 시나리오</Typography>
                    <Typography variant="body2" sx={{ bgcolor: 'rgba(0,0,0,0.06)', px: 1, py: 0.5, borderRadius: 1 }}>#최적 정책 추천</Typography>
                  </Box>
                </Box>
              </Card>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}