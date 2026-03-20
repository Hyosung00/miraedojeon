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
import { GeoIPMini, PDRMini, Zone7Mini, OffensiveStrategyMini, TargetGraph2DMini } from './CardDisplay';
import bottomCardsByView from './inputData';
import { dashboardSettings } from './dashboardSettings';
import { CHART_MAP } from './MiniCharts';

// ==============================|| DASHBOARD - DEFAULT ||============================== //

export default function DashboardDefault() {
  const [dbNodes, setDbNodes] = useState([]);
  const [currentView, setCurrentView] = useState(0);
  const [isAutoPaused, setIsAutoPaused] = useState(false);
  const navigate = useNavigate();

  const responsiveFont = {
    heroTitle: { xs: '1.2rem', sm: '1.45rem', md: '1.8rem', lg: '2.1rem', xl: '2.3rem' },
    heroDescription: { xs: '0.78rem', sm: '0.9rem', md: '1.02rem', lg: '1.12rem', xl: '1.2rem' },
    flowLabel: { xs: '0.72rem', sm: '0.82rem', md: '0.92rem', lg: '1rem' },
    flowArrow: { xs: '0.78rem', sm: '0.9rem', md: '1rem', lg: '1.08rem' },
    viewerTitle: { xs: '0.72rem', sm: '0.82rem', md: '0.9rem', lg: '1rem' },
    cardTitle: { xs: '0.95rem', sm: '1.05rem', md: '1.2rem', lg: '1.35rem', xl: '1.5rem' },
    cardSubtitle: { xs: '0.66rem', sm: '0.75rem', md: '0.84rem', lg: '0.92rem', xl: '1rem' },
    cardBody: { xs: '0.66rem', sm: '0.74rem', md: '0.84rem', lg: '0.95rem', xl: '1.04rem' },
    chipText: { xs: '0.62rem', sm: '0.68rem', md: '0.74rem', lg: '0.8rem', xl: '0.86rem' },
    actionButton: { xs: '0.72rem', sm: '0.8rem', md: '0.88rem', lg: '0.95rem' },
    navArrowButton: { xs: '0.95rem', sm: '1.05rem', md: '1.15rem', lg: '1.2rem' }
  };

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
      'Navigate to GeoIP',
      () => navigate('/OsintDataFusion/GeoIP'),
      { destination: '/OsintDataFusion/GeoIP' }
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
  const handlePDR = () => {
    interactionTracker.measureResponseSync(
      'DashboardDefault',
      'Navigate to PDR',
      () => navigate('/CyberObjectInfo/PDR'),
      { destination: '/CyberObjectInfo/PDR' }
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
    setCurrentView((prev) => {
      const nextView = (prev - 1 + visualizations.length) % visualizations.length;
      interactionTracker.log('DashboardDefault', 'Previous View', { currentView: nextView });
      return nextView;
    });
  };

  const handleNextView = () => {
    setCurrentView((prev) => {
      const nextView = (prev + 1) % visualizations.length;
      interactionTracker.log('DashboardDefault', 'Next View', { currentView: nextView });
      return nextView;
    });
  };

  const handleToggleAutoPlay = (event) => {
    event.stopPropagation();
    setIsAutoPaused((prev) => {
      const nextPaused = !prev;
      interactionTracker.log('DashboardDefault', nextPaused ? 'Auto Play Paused' : 'Auto Play Resumed', {
        currentView
      });
      return nextPaused;
    });
  };

  // 시각화 컨텐츠 및 정보 배열
  const visualizations = [
    {
      id: 'osint',
      title: '🌍 OSINT, 수집 데이터 융합 및 가시화',
      component: <GeoIPMini />,
      action: handleTimeSeries,
      mainTitle: 'OSINT 및 수집 데이터 융합기',
      description: [
        { subTitle: 'BGP 데이터 수집 및 분석', lines: [
          'RouteViews·RIPE RIS BGP 아카이브를 파싱하여 2025년도 월별 슬라이더로 월간 트래픽을 필터링함.',
          '출발지(노란 마커)·목적지(청색 마커)를 Cesium 2D 지도에 표시하고 아크 라인으로 공격 경로를 가시화함.',
        ]},
        { subTitle: '융합 데이터베이스 구축', lines: [
          '수집된 BGP 데이터를 MongoDB에 1차 저장 후 Neo4j 그래프 DB로 자동 변환함.',
          'IP → 국가 → ASN 위협 관계망을 구성하고 콘솔 로그로 처리 상태를 실시간 모니터링함.',
        ]},
      ],
      flowSteps: ['BGP 아카이브 수집·파싱', '글로벌 트래픽 경로 가시화', 'IP·서브넷 로그 기록', 'MongoDB 1차 저장', 'Neo4j 위협 관계망 구축']
    },
    {
      id: 'cyberObject',
      title: '🏗️ 사이버 객체 정보 가시화기',
      component: <PDRMini/>,
      action: handlePDR,
      mainTitle: '사이버 객체 정보 가시화기',
      description: [
        { subTitle: '사이버 물리 환경 구조 가시화', lines: [
          '북한 6개 핵심 군사시설의 위경도 좌표를 위성 지도에 마커로 표시함.',
          '각 시설의 건물 내부 구조를 SVG 블루프린트로 렌더링하여 정상(초록)·이상(빨간) 구역을 구분함.',
          '물리 환경 이상 여부를 시각적으로 즉시 파악함.',
        ]},
        { subTitle: '사이버 3계층 멀티레이어 가시화', lines: [
          '물리(Physical)·논리(Logical)·페르소나(Persona) 3개 계층으로 노드를 분류하여 3D Force Graph로 시각화함.',
          '계층 간 연결 관계(CONNECTS_TO·HOSTS·USES 등)를 링크로 표시하고 사이버-물리 연계 구조를 분석함.',
          '노드별 up/down/unknown 상태 및 CVE 취약점 정보를 함께 표시함.',
        ]},
      ],
      flowSteps: ['시설 위치 좌표 매핑', '건물 구조 블루프린트 가시화', '사이버 객체 계층 분류', '의존성·관계망 구성', '이상 감지 및 정비 관리']
    },
    {
      id: 'network',
      title: '🗺️ 내부망 분석 & 기본맵 토폴로지 생성 가시화',
      component: <Zone7Mini />,
      action: handleInternalTopology,
      mainTitle: '내외부 네트워크 가시화기',
      description: [
        '네트워크 데이터 융합은 콘솔 기반 수집·융합 파이프라인을 제공하며 Start/Stop/Restart 제어로 처리 상태와 데이터 흐름을 실시간 모니터링함.',
        '외부망 기본맵 가시화는 외부 연계 토폴로지를 3D로 구성하고 영역 필터·링크 유형 전환(물리/논리)·노드 선택 이벤트 로그를 통해 연결 구조를 분석함.',
        '내부망 네트워크 토폴로지 가시화는 장비 유형별 필터(방화벽·라우터·스위치·서버·호스트/워크스테이션·허브)와 상세 오버레이를 통해 내부 자산 관계를 정밀 추적함.',
        '노드 시각화는 코어(흰색), 방화벽(적색), 라우터·레이어3(주황), 스위치(녹색), 서버·호스트/워크스테이션(파랑), 허브(청록)로 구분되고, 링크는 실선(물리)·점선(논리)으로 표시됨.',
        '세 하위메뉴를 연계해 수집 데이터 검증 → 외부망 경로 파악 → 내부 확산(Lateral Movement) 예측까지 이어지는 분석 체계를 구성하고 대응 우선순위를 도출함.'
      ],
      flowSteps: ['네트워크 데이터 융합', '외부망 기본맵 가시화', '내부망 네트워크 토폴로지 가시화']
    },
    {
      id: 'target',
      title: '🎯 후보 표적 개발 & 핵심 표적 분석 가시화기',
      component: <TargetGraph2DMini dbNodes={dbNodes} />,
      action: handleTargetDashboard,
      mainTitle: '지능형 사이버 표적 식별기',
      description: [
        '네트워크 구조 분석 모듈은 DB(Neo4j)에 저장된 노드·엣지 데이터를 기반으로 자산 간 연결성, 영향도, 의존 관계를 분석해 구조적 위험을 도출하도록 설계됨.',
        '노드의 연결 수(degree), 도달성/연결성 지표(con), 엣지 관계를 함께 해석해 네트워크 내부 파급 경로와 핵심 허브를 식별하고, 전략적 차단 우선순위 표적을 산출함.',
        '후보/핵심 표적 상세 가시화는 노드 연결 수와 고위험 군집(고연결·고도달)을 함께 추적해 표적 우선순위 근거를 정량화함.',
        '표적 데이터를 기반으로 필터 조건, 그래프 상호작용, 통계 지표, 이벤트 로그가 동기화되어 지휘관이 단일 화면에서 탐지·해석·우선조치 결정을 연속 수행할 수 있음.',
        '선정된 핵심 표적은 후속 대응 파이프라인과 연계되어 검증→재평가→차단 의사결정 근거를 축적하며, 반복 분석 시 동일 기준으로 비교·추적 가능함.'
      ],
      flowSteps: ['네트워크 구조 분석(의존성·파급)', '후보/핵심 표적 상세 가시화', '핵심 표적 선정', '후속 대응 대상 전달']
    },
    {
      id: 'activeResponse',
      title: '⚔️ 노드 분석 & 능동대응책 생성 가시화기',
      component: <OffensiveStrategyMini />,
      action: handleActiveResponse,
      mainTitle: '사이버 능동 대응 방책 분석기',
      description: [
        '위험 노출도 및 공격 가능도 측정 모듈은 내부망 토폴로지와 위협 지표를 기반으로 노드·경로 단위 위험도를 정량화하고, 공격 확산 가능 구간과 병목 지점을 식별하도록 설계됨.',
        '능동 대응책 대응 효과/경로 가시화 모듈은 공격 경로(빨간 점선)와 정상 연결(보라 실선)을 분리 표시하고, 정책 적용 전·후 변화 경로를 비교해 통제 효과를 직관적으로 검증하도록 구성됨.',
        'RS( 연결 정도 * 0.6 + 도달 정도 * 0.4 ) 기반 고·중·저 위험군 분포를 추적해 정책별 완화 효과와 잔존 위험 편차를 정량적으로 평가함.',
        '장치 유형 분포와 RS 구간(10% 단위) 분포를 함께 분석해 시나리오 우선순위, 정책 적용 순서, 재조치 필요 대상을 도출함.',      
      ],
      flowSteps: ['공격경로·정상연결 분리 분석', '고위험 노드·우회 지점 식별', 'RS 기반 차단 전후 효과 비교', '시나리오 우선순위 정책 적용']
    }
  ];

  const currentViewConfig = visualizations[currentView];
  const displayedBottomCards = bottomCardsByView[currentViewConfig.id] || [];

  useEffect(() => {
    if (isAutoPaused) return undefined;

    const autoTransition = setInterval(() => {
      setCurrentView((prev) => {
        const nextView = (prev + 1) % visualizations.length;
        interactionTracker.log('DashboardDefault', 'Auto Next View', { currentView: nextView });
        return nextView;
      });
    }, dashboardSettings.autoPlayIntervalMs);

    return () => clearInterval(autoTransition);
  }, [isAutoPaused, visualizations.length]);

  return (
    <Box sx={{ height: 'calc(96vh - 80px)', display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>

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
                {/* 좌측: 설명 영역 */}
                <Box sx={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', pr: 2, py: 1, overflow: 'hidden' }}>
                  <Typography fontWeight="bold" color="#000" sx={{ mb: 1, fontSize: responsiveFont.heroTitle, lineHeight: 1.3, flexShrink: 0 }}>
                    {visualizations[currentView].mainTitle}
                  </Typography>

                  <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1, mb: 1 }}>
                    {visualizations[currentView].description.map((desc, index) =>
                      typeof desc === 'object' ? (
                        <Box key={index} sx={{ mb: index < visualizations[currentView].description.length - 1 ? 1.2 : 0 }}>
                          <Typography fontWeight="bold" color="#4c1d95" sx={{ fontSize: responsiveFont.heroDescription, lineHeight: 1.4, mb: 0.4 }}>
                            {desc.subTitle}
                          </Typography>
                          {desc.lines.map((line, ci) => (
                            <Typography key={ci} color="#000" sx={{ fontSize: responsiveFont.heroDescription, lineHeight: 1.55, pl: 0.5 }}>
                              - {line}
                            </Typography>
                          ))}
                        </Box>
                      ) : (
                        <Typography key={index} color="#000" sx={{ lineHeight: 1.6, fontSize: responsiveFont.heroDescription }}>
                          • {desc}
                        </Typography>
                      )
                    )}
                  </Box>

                  {/* 흐름도 */}
                  <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 1,
                    p: 1.5,
                    bgcolor: '#E4DFFA',
                    borderRadius: 2,
                    flexShrink: 0
                  }}>
                    <Typography fontWeight="bold" color="#000" sx={{ mr: 0.5, fontSize: responsiveFont.flowLabel, whiteSpace: 'nowrap' }}>
                      진행 흐름:
                    </Typography>
                    {visualizations[currentView].flowSteps.map((step, index) => (
                      <React.Fragment key={index}>
                        <Box sx={{
                          bgcolor: '#fff',
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 1.5,
                          border: '1px solid',
                          borderColor: '#C9C2F0',
                          fontSize: responsiveFont.flowLabel,
                          fontWeight: 'bold',
                          color: '#000',
                          whiteSpace: 'nowrap'
                        }}>
                          {index + 1}. {step}
                        </Box>
                        {index < visualizations[currentView].flowSteps.length - 1 && (
                          <Typography color="#7c3aed" sx={{ fontWeight: 'bold', fontSize: responsiveFont.flowArrow }}>➔</Typography>
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
                        fontSize: responsiveFont.navArrowButton,
                        fontWeight: 'bold',
                        boxShadow: 1,
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
                      }}
                    >
                      &lt;
                    </Button>
                    <Button
                      onClick={handleToggleAutoPlay}
                      sx={{
                        minWidth: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        bgcolor: 'rgba(255,255,255,0.7)',
                        color: '#000',
                        fontSize: responsiveFont.navArrowButton,
                        fontWeight: 'bold',
                        boxShadow: 1,
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
                      }}
                      aria-label={isAutoPaused ? '자동 전환 재생' : '자동 전환 일시정지'}
                      title={isAutoPaused ? '자동 전환 재생' : '자동 전환 일시정지'}
                    >
                      {isAutoPaused ? '▶' : '⏸'}
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
                        fontSize: responsiveFont.navArrowButton,
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
                    gap: 1,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    <Box sx={{ minWidth: 0, pr: 1, flex: 1 }}>
                      <Typography
                        variant="subtitle1"
                        color="#000"
                        fontWeight="bold"
                        sx={{
                          fontSize: responsiveFont.viewerTitle,
                          lineHeight: 1.2,
                          whiteSpace: 'normal',
                          wordBreak: 'keep-all',
                          overflowWrap: 'anywhere'
                        }}
                      >
                        {visualizations[currentView].title}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: responsiveFont.cardSubtitle,
                          lineHeight: 1.25,
                          mt: 0.3,
                          color: 'rgba(0, 0, 0, 0.68)',
                          whiteSpace: 'pre-line'
                        }}
                      >
                        {visualizations[currentView].viewerDescription}
                      </Typography>
                    </Box>
                    <Button
                      size="medium"
                      variant="text"
                      onClick={(e) => {
                        e.stopPropagation();
                        visualizations[currentView].action();
                      }}
                      sx={{ ml: 1, minWidth: '40px', p: 0, fontSize: responsiveFont.actionButton, flexShrink: 0 }}
                    >
                      이동
                    </Button>
                  </Box>
                </Card>
              </Card>
            </Grid>
            
            {displayedBottomCards.map((card) => {
              const ChartComponent = CHART_MAP[card.logCard];
              const isActiveResponseView = currentViewConfig.id === 'activeResponse';
              const mdSize = isActiveResponseView ? (card.logCard === '대응 방책' ? 6 : 3) : 3;
              const cardHeight = '38vh';

              return (
                <Grid size={{ xs: 12, md: mdSize }} key={card.logCard}>
                  <Card
                    onClick={() => interactionTracker.log('DashboardDefault', 'Card Interaction', { card: card.logCard })}
                    sx={{
                      bgcolor: '#F0EDFD',
                      boxShadow: 1,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      height: cardHeight,
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                      cursor: 'pointer'
                    }}
                  >
                    {/* 카드 제목 영역 */}
                    <Box sx={{
                      px: 1.5,
                      py: 1,
                      bgcolor: 'rgba(255,255,255,0.9)',
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      flexShrink: 0
                    }}>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 'bold',
                          fontSize: responsiveFont.cardTitle,
                          color: '#000',
                          mb: 0.3,
                          whiteSpace: 'normal',
                          lineHeight: 1.25,
                          wordBreak: 'keep-all',
                          overflowWrap: 'anywhere'
                        }}
                      >
                        {card.title}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: responsiveFont.cardSubtitle,
                          color: '#666',
                          display: 'block',
                          whiteSpace: 'normal',
                          lineHeight: 1.3,
                          wordBreak: 'keep-all',
                          overflowWrap: 'anywhere'
                        }}
                      >
                        {card.subtitle}
                      </Typography>
                    </Box>

                    {/* MiniCharts 영역 */}
                    {ChartComponent && (
                      <Box sx={{
                        position: 'relative',
                        flex: 1,
                        width: '100%',
                        height: '100%',
                        bgcolor: 'rgba(255,255,255,0.55)',
                        overflow: 'hidden',
                        minHeight: 0
                      }}>
                        <Box sx={{ position: 'absolute', top: 6, left: 6, right: 6, bottom: 2, height: 'calc(100% - 12px)' }}>
                          <ChartComponent nodes={dbNodes} />
                        </Box>
                      </Box>
                    )}
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}