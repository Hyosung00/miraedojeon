// material-ui
import { alpha, useTheme } from '@mui/material/styles';
import { useState } from 'react';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid2';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { Card, CardContent } from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';

// project imports
import MainCard from 'components/MainCard';
import AnalyticEcommerce from 'components/cards/statistics/AnalyticEcommerce';
import ReportAreaChart from 'sections/dashboard/default/ReportAreaChart';


// Chart data for cyber operation statistics
const monthlyLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const weeklyLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const monthlyData1 = [76, 85, 101, 98, 87, 105, 91, 114, 94, 86, 115, 35];
const weeklyData1 = [31, 40, 28, 51, 42, 109, 100];

const monthlyData2 = [110, 60, 150, 35, 60, 36, 26, 45, 65, 52, 53, 41];
const weeklyData2 = [11, 32, 45, 32, 34, 52, 41];

function Legend({ items, onToggle }) {
  return (
    <Stack direction="row" sx={{ gap: 2, alignItems: 'center', justifyContent: 'center', mt: 2.5, mb: 1.5 }}>
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
    'Page views': true,
    Sessions: true
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
      label: 'Page views',
      showMark: false,
      area: true,
      id: 'Germany',
      color: theme.palette.primary.main || '',
      visible: visibility['Page views']
    },
    {
      data: data2,
      label: 'Sessions',
      showMark: false,
      area: true,
      id: 'UK',
      color: theme.palette.primary[700] || '',
      visible: visibility['Sessions']
    }
  ];

  const axisFonstyle = { fontSize: 10, fill: theme.palette.text.secondary };

  return (
    <>
      <LineChart
        grid={{ horizontal: true }}
        xAxis={[{ scaleType: 'point', data: labels, disableLine: true, tickLabelStyle: axisFonstyle }]}
        yAxis={[{ disableLine: true, disableTicks: true, tickLabelStyle: axisFonstyle }]}
        height={450}
        margin={{ top: 40, bottom: 20, right: 20 }}
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

  return (
    <Grid container rowSpacing={2} columnSpacing={2.75}>
      {/* row 1 - Statistics Cards */}
      <Grid size={12}>
        <Card sx={{
          bgcolor: 'background.paper',
          boxShadow: 2,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider'
        }}>
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', fontWeight: 'bold', mb: 1.5 }}>
              📊 실시간 네트워크 통계
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <AnalyticEcommerce title="일일 총 네트워크 공격" count="2,236" percentage={59.3} extra="35,000" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <AnalyticEcommerce title="일일 북한 네트워크 공격" count="20" percentage={70.5} extra="8,900" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <AnalyticEcommerce title="일일 외부 네트워크 정보" count="800" percentage={27.4} isLoss color="warning" extra="1,943" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <AnalyticEcommerce title="일일 내부 네트워크 정보" count="1278" percentage={27.4} isLoss color="warning" extra="20,395" />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
      {/* row 2 - Visitor Stats */}
      <Grid size={{ xs: 12, md: 6}} >
        <Card sx={{
          bgcolor: 'background.paper',
          boxShadow: 2,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          height: '100%'
        }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', fontWeight: 'bold', mb: 1 }}>
              📈 사이버 작전 통계
            </Typography>
            <Grid container alignItems="center" justifyContent="space-between">
              <Grid>
                <Stack direction="row" sx={{ alignItems: 'center' }}>
                  <Button
                    size="small"
                    onClick={() => setView('monthly')}
                    color={view === 'monthly' ? 'primary' : 'secondary'}
                    variant={view === 'monthly' ? 'outlined' : 'text'}
                  >
                    Month
                  </Button>
                  <Button
                    size="small"
                    onClick={() => setView('weekly')}
                    color={view === 'weekly' ? 'primary' : 'secondary'}
                    variant={view === 'weekly' ? 'outlined' : 'text'}
                  >
                    Week
                  </Button>
                </Stack>
              </Grid>
            </Grid>
            <MainCard content={false} sx={{ mt: 1, flex: 1, overflow: 'hidden' }}>
              <Box sx={{ pt: 1, pr: 2, height: '100%' }}>
                <CyberOperationChart view={view} />
              </Box>
            </MainCard>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }} >
        <Card sx={{
          bgcolor: 'background.paper',
          boxShadow: 2,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          height: '100%'
        }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', fontWeight: 'bold', mb: 1 }}>
              📋 보안 분석 리포트
            </Typography>
            <MainCard sx={{ flex: 1, overflow: 'auto' }}>
              <List sx={{ p: 0, '& .MuiListItemButton-root': { py: 1 } }}>
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
            </MainCard>
          </CardContent>
        </Card>
      </Grid>


    </Grid>
  );
}