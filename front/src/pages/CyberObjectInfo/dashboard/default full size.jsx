// material-ui
import { alpha, useTheme } from '@mui/material/styles';
import interactionTracker from '../../../utils/interactionTracker';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid2';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { Card, CardContent, IconButton } from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';

// project imports
import ReportAreaChart from 'sections/dashboard/default/ReportAreaChart';
import { GlobeMini, Zone7Mini, OffensiveStrategyMini, TargetGraph2DMini } from './CardDisplay';
import BGPConsole from 'components/BGPConsole';


// Chart data for cyber operation statistics
const monthlyLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const weeklyLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const monthlyData1 = [76, 85, 101, 98, 87, 105, 91, 114, 94, 86, 115, 35];
const weeklyData1 = [31, 40, 28, 51, 42, 109, 100];

const monthlyData2 = [110, 60, 150, 35, 60, 36, 26, 45, 65, 52, 53, 41];
const weeklyData2 = [11, 32, 45, 32, 34, 52, 41];

function Legend({ items, onToggle }) {
  return (
    <Stack direction="row" sx={{ gap: 2, alignItems: 'center', justifyContent: 'center', mt: 0.5, mb: 0 }}>
      {items.map((item) => (
        <Stack
          key={item.label}
          direction="row"
          sx={{ gap: 1.25, alignItems: 'center', cursor: 'pointer' }}
          onClick={() => onToggle(item.label)}
        >
          <Box sx={{ width: 12, height: 12, bgcolor: item.visible ? item.color : 'grey.500', borderRadius: '50%' }} />
          <Typography variant="body2" color="text.primary">
            {item.label}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}

function CyberOperationChart({ view }) {
  const theme = useTheme();

  const [visibility, setVisibility] = useState({
    '속성 정보 변경': true,
    '취약점 점수 변경': true
  });

  const labels = view === 'monthly' ? monthlyLabels : weeklyLabels;
  const data1 = view === 'monthly' ? monthlyData1 : weeklyData1;
  const data2 = view === 'monthly' ? monthlyData2 : weeklyData2;

  const line = theme.palette.divider;

  const toggleVisibility = (label) => {
    interactionTracker.log('CyberOperationChart', 'Toggle Visibility', { label, currentState: visibility[label] });
    setVisibility((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const visibleSeries = [
    {
      data: data1,
      label: '속성 정보 변경',
      showMark: false,
      area: true,
      id: 'Germany',
      color: theme.palette.primary.main || '',
      visible: visibility['속성 정보 변경']
    },
    {
      data: data2,
      label: '취약점 점수 변경',
      showMark: false,
      area: true,
      id: 'UK',
      color: theme.palette.primary[700] || '',
      visible: visibility['취약점 점수 변경']
    }
  ];

  const axisFonstyle = { fontSize: 10, fill: theme.palette.text.secondary };

  return (
    <>
      <LineChart
        grid={{ horizontal: true }}
        xAxis={[{ scaleType: 'point', data: labels, disableLine: true, tickLabelStyle: axisFonstyle }]}
        yAxis={[{ disableLine: true, disableTicks: true, tickLabelStyle: axisFonstyle }]}
        height={140}
        margin={{ top: 5, bottom: 15, right: 15 }}
        series={visibleSeries
          .filter((series) => series.visible)
          .map((series) => ({
            type: 'line',
            data: series.data,
            label: series.label,
            showMark: series.showMark,
            area: series.area,
            id: series.id,
            color: series.color,
            stroke: series.color,
            strokeWidth: 2
          }))}
        slotProps={{ legend: { hidden: true } }}
        sx={{
          '& .MuiAreaElement-series-Germany': { fill: "url('#myGradient1')", strokeWidth: 2, opacity: 0.8 },
          '& .MuiAreaElement-series-UK': { fill: "url('#myGradient2')", strokeWidth: 2, opacity: 0.8 },
          '& .MuiChartsAxis-directionX .MuiChartsAxis-tick': { stroke: line }
        }}
      >
        <defs>
          <linearGradient id="myGradient1" gradientTransform="rotate(90)">
            <stop offset="10%" stopColor={alpha(theme.palette.primary.main, 0.4)} />
            <stop offset="90%" stopColor={alpha(theme.palette.background.default, 0.4)} />
          </linearGradient>
          <linearGradient id="myGradient2" gradientTransform="rotate(90)">
            <stop offset="10%" stopColor={alpha(theme.palette.primary[700], 0.4)} />
            <stop offset="90%" stopColor={alpha(theme.palette.background.default, 0.4)} />
          </linearGradient>
        </defs>
      </LineChart>
      <Legend items={visibleSeries} onToggle={toggleVisibility} />
    </>
  );
}

// ==============================|| DASHBOARD - DEFAULT ||============================== //

export default function DashboardDefault() {
  const [view, setView] = useState('monthly');
  const [dbNodes, setDbNodes] = useState([]);
  const [selectedView, setSelectedView] = useState('all'); // 'all', 'osint', 'internal', 'target', 'response'
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

  const handleCardClick = (cardName) => {
    interactionTracker.log('DashboardDefault', 'Card Click', { cardName });
    navigate('/ExtInt/TimeSeriesVisualization');
  };

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
            {/* 1행 - BGP Archive (전체 폭) */}
            <Grid size={12}>
              <Card
                onClick={() => interactionTracker.log('DashboardDefault', 'Card Interaction', { card: 'BGP Archive' })}
                sx={{
                  bgcolor: 'background.default',
                  boxShadow: 1,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  height: '22.9vh',
                  display: 'flex',
                  overflow: 'hidden',
                  cursor: 'pointer'
                }}
              >
                <Box sx={{ flex: 1, position: 'relative' }}>
                  <Box sx={{ position: 'absolute', top: 4, left: 8, zIndex: 10, bgcolor: 'rgba(255,255,255,0.85)', px: 0.5, borderRadius: 1 }}>
                    <Typography variant="h4" color="text.secondary" fontWeight="bold">
                      💾 BGP Archive Data 수집 및 DB 저장
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleTimeSeries}
                    sx={{ position: 'absolute', top: 4, right: 8, zIndex: 10, bgcolor: 'rgba(255,255,255,0.85)' }}
                  >
                    이동하기
                  </Button>
                  <Box sx={{ width: '100%', height: '100%' }}>
                    <BGPConsole />
                  </Box>
                </Box>
              </Card>
            </Grid>
          </Grid>

          {/* 뷰 전환 버튼 */}
          <Stack direction="row" spacing={1.5} sx={{ py: 2 }}>
            <Button
              variant={selectedView === 'all' ? 'contained' : 'outlined'}
              onClick={() => {
                setSelectedView('all');
                interactionTracker.log('DashboardDefault', 'View Changed', { view: 'all' });
              }}
              sx={{ flex: 1, fontWeight: 'bold' }}
            >
              전체
            </Button>
            <Button
              variant={selectedView === 'osint' ? 'contained' : 'outlined'}
              onClick={() => {
                setSelectedView('osint');
                interactionTracker.log('DashboardDefault', 'View Changed', { view: 'osint' });
              }}
              sx={{ flex: 1, fontWeight: 'bold' }}
            >
              Osint
            </Button>
            <Button
              variant={selectedView === 'internal' ? 'contained' : 'outlined'}
              onClick={() => {
                setSelectedView('internal');
                interactionTracker.log('DashboardDefault', 'View Changed', { view: 'internal' });
              }}
              sx={{ flex: 1, fontWeight: 'bold' }}
            >
              내부망
            </Button>
            <Button
              variant={selectedView === 'target' ? 'contained' : 'outlined'}
              onClick={() => {
                setSelectedView('target');
                interactionTracker.log('DashboardDefault', 'View Changed', { view: 'target' });
              }}
              sx={{ flex: 1, fontWeight: 'bold' }}
            >
              표적
            </Button>
            <Button
              variant={selectedView === 'response' ? 'contained' : 'outlined'}
              onClick={() => {
                setSelectedView('response');
                interactionTracker.log('DashboardDefault', 'View Changed', { view: 'response' });
              }}
              sx={{ flex: 1, fontWeight: 'bold' }}
            >
              능동대응
            </Button>
          </Stack>

          <Grid container spacing={2}>
            {/* 2행 좌측 - OSINT 시계열 */}
            {(selectedView === 'all' || selectedView === 'osint') && (
              <Grid size={selectedView === 'osint' ? 12 : 6}>
                <Card
                  onClick={() => interactionTracker.log('DashboardDefault', 'Card Interaction', { card: 'OSINT 시계열' })}
                  sx={{
                    bgcolor: 'background.default',
                    boxShadow: 1,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    height: selectedView === 'osint' ? '60vh' : '29vh',
                    display: 'flex',
                    overflow: 'hidden',
                    cursor: 'pointer'
                  }}
              >
                <Box sx={{ flex: 1, position: 'relative' }}>
                  <Box sx={{ position: 'absolute', top: 4, left: 8, zIndex: 10 }}>
                    <Typography variant="h4" color="text.secondary" fontWeight="bold">
                      🌍 Osint & 시계열 기반 이상 탐지 가시화
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleTimeSeries}
                    sx={{ position: 'absolute', top: 4, right: 8, zIndex: 10 }}
                  >
                    이동하기
                  </Button>
                  <Box sx={{ width: '100%', height: '100%' }}>
                    <GlobeMini />
                  </Box>
                </Box>
              </Card>
            </Grid>
            )}

            {/* 2행 우측 - 내부망 분석 */}
            {(selectedView === 'all' || selectedView === 'internal') && (
              <Grid size={selectedView === 'internal' ? 12 : 6}>
              <Card
                onClick={() => interactionTracker.log('DashboardDefault', 'Card Interaction', { card: '내부망 분석' })}
                sx={{
                  bgcolor: 'background.default',
                  boxShadow: 1,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  height: selectedView === 'internal' ? '60vh' : '29vh',
                  display: 'flex',
                  overflow: 'hidden',
                  cursor: 'pointer'
                }}
              >
                <Box sx={{ flex: 1, position: 'relative' }}>
                  <Box sx={{ position: 'absolute', top: 4, left: 8, zIndex: 10, bgcolor: 'rgba(255,255,255,0.85)', px: 0.5, borderRadius: 1 }}>
                    <Typography variant="h4" color="text.secondary" fontWeight="bold">
                      � 내부망 분석 & 기본맵 토폴로지 생성 가시화
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleInternalTopology}
                    sx={{ position: 'absolute', top: 4, right: 8, zIndex: 10, bgcolor: 'rgba(255,255,255,0.85)' }}
                  >
                    이동하기
                  </Button>
                  <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
                    <Zone7Mini />
                  </Box>
                </Box>
              </Card>
            </Grid>
            )}

            {/* 3행 좌측 - 후보 표적 개발 */}
            {(selectedView === 'all' || selectedView === 'target') && (
              <Grid size={selectedView === 'target' ? 12 : 6}>
              <Card
                onClick={() => interactionTracker.log('DashboardDefault', 'Card Interaction', { card: '후보 표적 개발' })}
                sx={{
                  bgcolor: 'background.default',
                  boxShadow: 1,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  height: selectedView === 'target' ? '60vh' : '30vh',
                  display: 'flex',
                  overflow: 'hidden',
                  cursor: 'pointer'
                }}
              >
                <Box sx={{ flex: 1, position: 'relative' }}>
                  <Box sx={{ position: 'absolute', top: 4, left: 8, zIndex: 10, bgcolor: 'rgba(255,255,255,0.85)', px: 0.5, borderRadius: 1 }}>
                    <Typography variant="h4" color="text.secondary" fontWeight="bold">
                      � 후보 표적 개발 & 핵심 표적 분석 가시화
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleTargetDashboard}
                    sx={{ position: 'absolute', top: 4, right: 8, zIndex: 10, bgcolor: 'rgba(255,255,255,0.85)' }}
                  >
                    이동하기
                  </Button>
                  <Box sx={{ width: '100%', height: '100%' }}>
                    <TargetGraph2DMini dbNodes={dbNodes} />
                  </Box>
                </Box>
              </Card>
            </Grid>
            )}

            {/* 3행 우측 - 노드 분석 & 능동대응책 */}
            {(selectedView === 'all' || selectedView === 'response') && (
              <Grid size={selectedView === 'response' ? 12 : 6}>
              <Card
                onClick={() => interactionTracker.log('DashboardDefault', 'Card Interaction', { card: '능동대응책' })}
                sx={{
                  bgcolor: 'background.default',
                  boxShadow: 1,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  height: selectedView === 'response' ? '60vh' : '30vh',
                  display: 'flex',
                  overflow: 'hidden',
                  cursor: 'pointer'
                }}
              >
                <Box sx={{ flex: 1, position: 'relative' }}>
                  <Box sx={{ position: 'absolute', top: 4, left: 8, zIndex: 10, bgcolor: 'rgba(255,255,255,0.85)', px: 0.5, borderRadius: 1 }}>
                    <Typography variant="h4" color="text.secondary" fontWeight="bold">
                      ⚔️ 노드 분석 & 능동대응책 생성 가시화
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleActiveResponse}
                    sx={{ position: 'absolute', top: 4, right: 8, zIndex: 10, bgcolor: 'rgba(255,255,255,0.85)' }}
                  >
                    이동하기
                  </Button>
                  <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
                    <OffensiveStrategyMini />
                  </Box>
                </Box>
              </Card>
            </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}