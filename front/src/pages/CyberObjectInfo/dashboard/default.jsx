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
      title: '🌍 BGP 트래픽 수집 및 글로벌 위협 가시화',
      component: <GeoIPMini />,
      action: handleTimeSeries,
      mainTitle: 'OSINT 및 수집 데이터 융합기',
      description: [
        'BGP 아카이브(RouteViews, RIPE RIS) 데이터를 주기적으로 수집·파싱하며, 날짜 범위 슬라이더로 특정 기간의 트래픽을 필터링하고 전체 수집 건수와 현재 표시 건수를 별도 집계·표시함.',
        '수집된 트래픽은 세계 지도 위에 출발지(노란 마커)·목적지(청색 마커) 좌표로 표시되고, 두 지점을 연결하는 붉은 아크 라인으로 경로를 시각화하며 국가별 트래픽 통계를 한국어로 제공함.',
        '각 트래픽 레코드는 출발지→목적지(건수) / 출발지 IP / 목적지 IP / CIDR 기반 서브넷 / 게이트웨이 / DNS 서버 / KST 기준 발생 시각 순으로 실시간 로그에 기록됨.',
        '수집 완료된 데이터는 1차 저장소인 MongoDB에 적재되고, 이후 Neo4j 그래프 DB로 자동 변환되어 위협 노드(IP → 국가 → ASN) 간 연결 관계망을 구성하고 경로 분석에 활용됨.',
        'Start·Stop·Restart 버튼으로 수집·융합 프로세스를 실시간 제어하며, 처리 결과를 콘솔 로그로 즉시 확인 가능함.'
      ],
      flowSteps: ['BGP 아카이브 수집·파싱', '글로벌 트래픽 경로 가시화', 'IP·서브넷 로그 기록', 'MongoDB 1차 저장', 'Neo4j 위협 관계망 구축']
    },
    {
      id: 'cyberObject',
      title: '🏗️ 사이버 객체 정보 가시화',
      component: <PDRMini/>,
      action: handlePDR,
      mainTitle: '사이버 객체 정보 가시화',
      description: [
        '북한 6개 핵심 군사·전략 시설(영변 핵시설, 신포 조선소, 국방과학원 미사일 연구소, 풍계리 핵실험장, 서해위성발사장, 조선노동당 본부)의 위경도 좌표를 위성 지도 위에 마커로 표시하고 시설 간 거리 및 관계를 분석함.',
        '각 시설 선택 시 건물 내부 구조를 SVG 블루프린트 스타일로 가시화하며, 정상 구역(초록 테두리)과 이상 감지 구역(빨간 테두리)으로 색상 구분하여 구조적 취약 지점을 즉시 파악 가능함.',
        '물리 자산·논리 자산·행위자·취약점·위협 지표를 5개 계층으로 분류하고, 객체 간 의존성과 영향 관계를 네트워크 그래프로 연결하여 사이버-물리 연계 구조를 입체적으로 파악함.',
        '객체별 속성(ID·유형·소유 조직·신뢰도·갱신 시각)과 상태 변화 이력을 통합 관리하며, 비정상 관계 발생 또는 급격한 상태 변동 시 즉시 알림을 제공함.',
        '분석 결과 기반으로 정비·보강 작업 계획을 수립하고 담당자 할당·마감일 관리·처리 상태 추적을 통해 고위험 객체의 우선 조치를 지원함.'
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
        '수집된 네트워크 데이터를 기반으로 내부망의 실제 물리적/논리적 연결 상태를 토폴로지로 구성함.',
        '자산 간의 연결 관계, 통신 흐름, 중요 거점 노드를 시각적으로 파악 가능함.',
        '구축된 기본맵을 바탕으로 향후 발생 가능한 내부 확산 이동(Lateral Movement) 경로를 예측함.'
      ],
      flowSteps: ['네트워크 트래픽 스니핑', '물리/논리 자산 맵 구성', '침해 확산(Lateral.M) 경로 분석']
    },
    {
      id: 'target',
      title: '🎯 후보 표적 개발 & 핵심 표적 분석 가시화',
      component: <TargetGraph2DMini dbNodes={dbNodes} />,
      action: handleTargetDashboard,
      mainTitle: '핵심 타겟(표적) 분석',
      description: [
        '위협 데이터를 분석하여 공격자가 노릴 가능성이 높은 잠재적 후보 표적들을 식별함.',
        '각 노드의 취약성, 파급력, 접근성을 종합적으로 평가하여 핵심 표적의 우선순위를 결정함.',
        '시각화 그래프를 통해 타겟을 중심으로 한 의존성 관계와 잠재적 공격 벡터를 심층 분석함.'
      ],
      flowSteps: ['잠재 위협 노드 스캐닝', '다차원 가치 및 취약성 평가', '핵심 후보 표적 우선순위화']
    },
    {
      id: 'activeResponse',
      title: '⚔️ 노드 분석 & 능동대응책 생성 가시화',
      component: <OffensiveStrategyMini />,
      action: handleActiveResponse,
      mainTitle: '능동대응 및 방어 전략',
      description: [
        '침해 및 위협 노드에 대한 상세 분석을 수행하고, 격리·방어를 위한 실행 가능한 전략을 도출함.',
        '선제적 대응(Active Response)을 위한 다양한 시나리오와 조치 방안을 실시간으로 산출함.',
        '자동화된 능동대응책을 가시화하여 의사결정자가 신속·정확한 방어 조치를 취할 수 있도록 지원함.'
      ],
      flowSteps: ['침투 시나리오 시뮬레이션', '방어/우회 네트워크 차단 테스트', '최적 능동대응 정책 수립']
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
                {/* 좌측: 설명 영역 */}
                <Box sx={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', pr: 2, py: 1, overflow: 'hidden' }}>
                  <Typography fontWeight="bold" color="#000" sx={{ mb: 1, fontSize: responsiveFont.heroTitle, lineHeight: 1.3, flexShrink: 0 }}>
                    {visualizations[currentView].mainTitle}
                  </Typography>

                  <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0.8, mb: 1 }}>
                    {visualizations[currentView].description.map((desc, index) => (
                      <Typography key={index} color="#000" sx={{ lineHeight: 1.6, fontSize: responsiveFont.heroDescription }}>
                        • {desc}
                      </Typography>
                    ))}
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
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    <Typography variant="subtitle1" color="#000" fontWeight="bold" sx={{ fontSize: responsiveFont.viewerTitle }}>
                      {visualizations[currentView].title}
                    </Typography>
                    <Button
                      size="medium"
                      variant="text"
                      onClick={(e) => {
                        e.stopPropagation();
                        visualizations[currentView].action();
                      }}
                      sx={{ ml: 1, minWidth: '40px', p: 0, fontSize: responsiveFont.actionButton }}
                    >
                      이동
                    </Button>
                  </Box>
                </Card>
              </Card>
            </Grid>
            
            {displayedBottomCards.map((card) => {
              const ChartComponent = CHART_MAP[card.logCard];
              return (
                <Grid size={6} key={card.logCard}>
                  <Card
                    onClick={() => interactionTracker.log('DashboardDefault', 'Card Interaction', { card: card.logCard })}
                    sx={{
                      bgcolor: '#F0EDFD',
                      boxShadow: 1,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      height: '20vh',
                      display: 'flex',
                      flexDirection: 'row',
                      overflow: 'hidden',
                      cursor: 'pointer'
                    }}
                  >
                    {/* 좌측: 텍스트 */}
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 1.5, overflow: 'hidden', height: '100%', minWidth: 0 }}>
                      {/* 헤더 */}
                      <Box sx={{ mb: 0.5, flexShrink: 0 }}>
                        <Typography noWrap fontWeight="bold" color="#000" sx={{ fontSize: responsiveFont.cardTitle, lineHeight: 1.3 }}>
                          {card.title}
                        </Typography>
                        <Typography noWrap color="#000" sx={{ fontSize: responsiveFont.cardSubtitle, lineHeight: 1.3, mt: 0.2 }}>
                          {card.subtitle}
                        </Typography>
                      </Box>
                      {/* 내용 */}
                      <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0.25 }}>
                        {card.modules.map((module) => (
                          <Typography
                            key={`${card.logCard}-${module.label}`}
                            color="#000"
                            sx={{
                              fontSize: responsiveFont.cardBody,
                              lineHeight: 1.4,
                              overflow: 'hidden',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            <strong>{module.label}:</strong> {module.content}
                          </Typography>
                        ))}
                      </Box>
                      {/* 태그 */}
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'nowrap', mt: 0.4, flexShrink: 0, overflow: 'hidden' }}>
                        {card.tags.map((tag) => (
                          <Typography key={tag} noWrap sx={{ bgcolor: 'rgba(0,0,0,0.06)', px: 0.7, py: 0.2, borderRadius: 1, fontSize: responsiveFont.chipText, flexShrink: 0 }}>
                            {tag}
                          </Typography>
                        ))}
                      </Box>
                    </Box>

                    {/* 우측: 미니 차트 */}
                    {ChartComponent && (
                      <Box sx={{
                        width: '38%',
                        flexShrink: 0,
                        alignSelf: 'stretch',
                        position: 'relative',
                        bgcolor: 'rgba(255,255,255,0.55)',
                        borderLeft: '1px solid',
                        borderColor: '#E4DFFA',
                        overflow: 'hidden',
                      }}>
                        <Box sx={{ position: 'absolute', top: 6, left: 6, right: 6, bottom: 6 }}>
                          <ChartComponent />
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