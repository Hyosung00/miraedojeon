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
                sx={{
                  bgcolor: 'background.default',
                  boxShadow: 1,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  height: '28vh',
                  display: 'flex',
                  overflow: 'hidden'
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
                <Box
                  sx={{
                    width: '50%',
                    bgcolor: '#F0EDFD',
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    borderLeft: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <Typography variant="h3" gutterBottom fontWeight="bold">
                    📝 BGP 데이터 수집 정보
                  </Typography>
                  <Typography variant="h4" color="text.secondary">
                    BGP Archive에서 라우팅 데이터를 수집하여 MongoDB에 저장한다. 
                    IP, 위치, 국가, 서브넷 정보를 포함하며, 네트워크 경로 변화 및 BGP Hijacking 등의 위협을 실시간으로 탐지하기 위한 데이터를 수집하여 가공한다.
                  </Typography>
                </Box>
              </Card>
            </Grid>
            
            {/* 2행 좌측 - OSINT 시계열 */}
            <Grid size={6}>
              <Card
                sx={{
                  bgcolor: 'background.default',
                  boxShadow: 1,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  height: '29vh',
                  display: 'flex',
                  overflow: 'hidden'
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
                <Box
                  sx={{
                    width: '35%',
                    bgcolor: '#F0EDFD',
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    borderLeft: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <Typography variant="h3" gutterBottom fontWeight="bold">
                    🔍 OSINT 분석
                  </Typography>
                  <Typography variant="h4" color="text.secondary">
                    글로벌 네트워크 트래픽을 3D Globe로 시각화하여 국가별 공격 패턴을 분석한다. 특히 적국 표적 공격을 필터링하여 실시간 위협 동향을 모니터링하고 시계열 기반 이상 패턴을 탐지한다.
                  </Typography>
                </Box>
              </Card>
            </Grid>

            {/* 2행 우측 - 내부망 분석 */}
            <Grid size={6}>
              <Card
                sx={{
                  bgcolor: 'background.default',
                  boxShadow: 1,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  height: '29vh',
                  display: 'flex',
                  overflow: 'hidden'
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
                <Box
                  sx={{
                    width: '35%',
                    bgcolor: '#F0EDFD',
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    borderLeft: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <Typography variant="h3" gutterBottom fontWeight="bold">
                    � 내부망 토폴로지
                  </Typography>
                  <Typography variant="h4" color="text.secondary">
                    수집한 BGP Archive Data를 기반으로 내부 네트워크를 3계층(Physical-Logical-Persona) 모델로 3D 시각화한다. Zone 기반 세분화, 고립 노드 탐지, 관계 분석을 통해 내부망 보안 취약점을 식별한다.
                  </Typography>
                </Box>
              </Card>
            </Grid>

            {/* 3행 좌측 - 후보 표적 개발 */}
            <Grid size={6}>
              <Card
                sx={{
                  bgcolor: 'background.default',
                  boxShadow: 1,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  height: '30vh',
                  display: 'flex',
                  overflow: 'hidden'
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
                <Box
                  sx={{
                    width: '35%',
                    bgcolor: '#F0EDFD',
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    borderLeft: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <Typography variant="h3" gutterBottom fontWeight="bold">
                    � 표적 분석
                  </Typography>
                  <Typography variant="h4" color="text.secondary">
                    수집한 노드를 기반으로 하여 표적 노드들의 연결 관계를 2D Force Graph로 시각화한다. 후보 표적 간의 네트워크 관계와 핵심 표적의 중심성을 분석하여 공격 경로를 모델링한다.
                  </Typography>
                </Box>
              </Card>
            </Grid>

            {/* 3행 우측 - 노드 분석 & 능동대응책 */}
            <Grid size={6}>
              <Card
                sx={{
                  bgcolor: 'background.default',
                  boxShadow: 1,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  height: '30vh',
                  display: 'flex',
                  overflow: 'hidden'
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
                <Box
                  sx={{
                    width: '35%',
                    bgcolor: '#F0EDFD',
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    borderLeft: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <Typography variant="h3" gutterBottom fontWeight="bold">
                    ⚔️ 능동 대응
                  </Typography>
                  <Typography variant="h4" color="text.secondary">
                    수집한 노드를 기반으로 하여 공격 경로를 분석한다. 위협 심각도를 평가하고 대응 우선순위를 자동 설정하여 차단, 격리, 감시 전략을 수립하고 효과를 실시간 가시화한다.
                  </Typography>
                </Box>
              </Card>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}