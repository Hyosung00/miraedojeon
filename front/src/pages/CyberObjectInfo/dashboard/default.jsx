// material-ui
import { alpha, useTheme } from '@mui/material/styles';
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
  const navigate = useNavigate();

  // Neo4j에서 차단된 공격 데이터 가져오기
  useEffect(() => {
    fetch('http://localhost:8000/neo4j/nodes?activeView=target')
      .then((res) => res.json())
      .then((data) => setDbNodes(data))
      .catch(() => console.warn('Failed to fetch nodes'));
  }, []);

  const handleCardClick = () => {
    navigate('/ExtInt/TimeSeriesVisualization');
  };

  // 각 카드별 네비게이션 함수
  const handleTimeSeries = () => navigate('/ExtInt/TimeSeriesVisualization');
  const handleTargetDashboard = () => navigate('/target/targetDashboard');
  const handleInternalTopology = () => navigate('/ExtInt/internaltopology');
  const handleActiveResponse = () => navigate('/ActiveResponse/responseeffectvisualization');

  return (
    <Box sx={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>
      {/* 통합 대시보드 카드 - 상단 고정 */}
      <Card 
        sx={{
          bgcolor: 'background.paper',
          boxShadow: 2,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          flexShrink: 0
        }}
      >
        <CardContent sx={{ p: 1.5 }}>
          <Grid container spacing={1.5} sx={{ height: 250 }}>
              {/* 사이버 작전 통계 */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Box
                  onClick={handleCardClick}
                  sx={{
                    bgcolor: '#F0EDFD',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    p: 1.5,
                    height: '260px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    overflow: 'hidden',
                    '&:hover': {
                      boxShadow: 3,
                      transform: 'translateY(-2px)',
                      borderColor: 'primary.main'
                    }
                  }}
                >
                  <Typography variant="h4" gutterBottom sx={{ color: 'text.primary', fontWeight: 'bold', mb: 0.5 }}>
                    📈 사이버 작전 통계
                  </Typography>
                  <Stack direction="row" sx={{ alignItems: 'center', mb: 0.5 }} onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setView('monthly');
                      }}
                      color={view === 'monthly' ? 'primary' : 'secondary'}
                      variant={view === 'monthly' ? 'outlined' : 'text'}
                    >
                      Month
                    </Button>
                    <Button
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setView('weekly');
                      }}
                      color={view === 'weekly' ? 'primary' : 'secondary'}
                      variant={view === 'weekly' ? 'outlined' : 'text'}
                    >
                      Week
                    </Button>
                  </Stack>
                  <Box sx={{ height: '100%' }} onClick={(e) => e.stopPropagation()}>
                    <CyberOperationChart view={view} />
                  </Box>
                </Box>
              </Grid>

              {/* 보안 분석 리포트 */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Box
                  onClick={handleCardClick}
                  sx={{
                    bgcolor: '#F0EDFD',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    p: 1,
                    height: '100%',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    overflow: 'hidden',
                    '&:hover': {
                      boxShadow: 3,
                      transform: 'translateY(-2px)',
                      borderColor: 'primary.main'
                    }
                  }}
                >
                  <Typography variant="h4" gutterBottom sx={{ color: 'text.primary', fontWeight: 'bold', mb: 0.5 }}>
                    📋 보안 분석 리포트
                  </Typography>
                  <Box onClick={(e) => e.stopPropagation()}>
                    <List sx={{ p: 0, '& .MuiListItemButton-root': { py: 0, minHeight: 24 } }}>
                      <ListItemButton divider>
                        <ListItemText primary="시스템 보안 강화율" />
                        <Typography variant="h6" color="success.main">+45.14%</Typography>
                      </ListItemButton>
                      <ListItemButton divider>
                        <ListItemText primary="취약점 발견율" />
                        <Typography variant="h6" color="warning.main">0.58%</Typography>
                      </ListItemButton>
                      <ListItemButton>
                        <ListItemText primary="전체 보안 위험도" />
                        <Typography variant="h6" color="success.main">Low</Typography>
                      </ListItemButton>
                    </List>
                    <ReportAreaChart />
                  </Box>
                </Box>
              </Grid>
              {/* 실시간 네트워크 통계 */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Box
                  onClick={handleCardClick}
                  sx={{
                    bgcolor: '#F0EDFD',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    p: 1,
                    height: '100%',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    overflow: 'hidden',
                    '&:hover': {
                      boxShadow: 3,
                      transform: 'translateY(-2px)',
                      borderColor: 'primary.main'
                    }
                  }}
                >
                  <Typography variant="h4" gutterBottom sx={{ color: 'text.primary', fontWeight: 'bold', mb: 0.5 }}>
                    📊 실시간 네트워크 통계
                  </Typography>
                  <Grid container spacing={0.5} onClick={(e) => e.stopPropagation()}>
                    {/* 왼쪽 - 푸른색 (primary) */}
                    <Grid size={6}>
                      <Box sx={{ bgcolor: 'primary.lighter', borderRadius: 1, p: 1.5, height: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', boxShadow: 1 }}>
                        <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>일일 총 네트워크 공격</Typography>
                        <Typography variant="h4" color="primary.main" fontWeight="bold">2,236</Typography>
                      </Box>
                    </Grid>
                    {/* 오른쪽 - 노란색 (warning) */}
                    <Grid size={6}>
                      <Box sx={{ bgcolor: 'warning.lighter', borderRadius: 1, p: 1.5, height: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', boxShadow: 1 }}>
                        <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>일일 외부 네트워크 정보</Typography>
                        <Typography variant="h4" color="warning.main" fontWeight="bold">800</Typography>
                      </Box>
                    </Grid>
                    {/* 왼쪽 - 푸른색 (primary) */}
                    <Grid size={6}>
                      <Box sx={{ bgcolor: 'primary.lighter', borderRadius: 1, p: 1.5, height: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', boxShadow: 1 }}>
                        <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>일일 북한 네트워크 공격</Typography>
                        <Typography variant="h4" color="primary.main" fontWeight="bold">20</Typography>
                      </Box>
                    </Grid>
                    {/* 오른쪽 - 노란색 (warning) */}
                    <Grid size={6}>
                      <Box sx={{ bgcolor: 'warning.lighter', borderRadius: 1, p: 1.5, height: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', boxShadow: 1 }}>
                        <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>일일 내부 네트워크 정보</Typography>
                        <Typography variant="h4" color="warning.main" fontWeight="bold">1,278</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>



      {/* 하단 가변 카드 - 2x2 그리드 포함 */}
      <Card 
        sx={{
          bgcolor: 'background.paper',
          boxShadow: 2,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden'
        }}
      >
        <CardContent sx={{ p: 1.5, height: '100%', '&:last-child': { pb: 1.5 }, boxSizing: 'border-box' }}>
          <Grid container spacing={1.5} sx={{ height: '100%' }}>
            {/* 카드 1 - 왼쪽 상단: 위협 탐지 */}
            <Grid size={6} sx={{ height: 'calc(50% - 6px)' }}>
              <Card
                sx={{
                  bgcolor: 'background.default',
                  boxShadow: 1,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}
              >
                <CardContent sx={{ flex: 1, p: 0, '&:last-child': { pb: 0 }, position: 'relative' }}>
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
                </CardContent>
              </Card>
            </Grid>

            {/* 카드 2 - 오른쪽 상단: 차단된 공격 */}
            <Grid size={6} sx={{ height: 'calc(50% - 6px)' }}>
              <Card
                sx={{
                  bgcolor: 'background.default',
                  boxShadow: 1,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}
              >
                <CardContent sx={{ flex: 1, p: 0, '&:last-child': { pb: 0 }, position: 'relative' }}>
                  <Box sx={{ position: 'absolute', top: 4, left: 8, zIndex: 10, bgcolor: 'rgba(255,255,255,0.85)', px: 0.5, borderRadius: 1 }}>
                    <Typography variant="h4" color="text.secondary" fontWeight="bold">
                      🎯 후보 표적 개발 & 핵심 표적 분석 가시화
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
                </CardContent>
              </Card>
            </Grid>

            {/* 카드 3 - 왼쪽 하단: 경고 알림 */}
            <Grid size={6} sx={{ height: 'calc(50% - 6px)' }}>
              <Card
                sx={{
                  bgcolor: 'background.default',
                  boxShadow: 1,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}
              >
                <CardContent sx={{ flex: 1, p: 0, '&:last-child': { pb: 0 }, position: 'relative', height: '100%' }}>
                  <Box sx={{ position: 'absolute', top: 4, left: 8, zIndex: 10, bgcolor: 'rgba(255,255,255,0.85)', px: 0.5, borderRadius: 1 }}>
                    <Typography variant="h4" color="text.secondary" fontWeight="bold">
                      🌐 내부망 분석 & 기본맵 토폴로지 생성 가시화
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
                </CardContent>
              </Card>
            </Grid>

            {/* 카드 4 - 오른쪽 하단: 활성 세션 */}
            <Grid size={6} sx={{ height: 'calc(50% - 6px)' }}>
              <Card
                sx={{
                  bgcolor: 'background.default',
                  boxShadow: 1,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}
              >
                <CardContent sx={{ flex: 1, p: 0, '&:last-child': { pb: 0 }, position: 'relative', height: '100%' }}>
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
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}