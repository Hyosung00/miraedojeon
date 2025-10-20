import React, { useMemo } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

function normalizeScores(data) {
  // degree_score + con_score 계산
  const scores = data.map(d => d.degree_score + d.con_score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  // 0~1 정규화
  return scores.map(s => (max === min ? 0 : (s - min) / (max - min)));
}

function getHistogram(normalizedScores) {
  // 0.1 단위 구간별 집계
  const bins = Array(10).fill(0);
  normalizedScores.forEach(s => {
    const idx = Math.min(9, Math.floor(s * 10));
    bins[idx]++;
  });
  return bins.map((count, i) => ({ range: `${(i/10).toFixed(1)}-${((i+1)/10).toFixed(1)}`, count }));
}

const TrendChart = React.memo(({ data }) => {
  // Memoize calculations
  const { histogram, lineData } = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) {
      return { histogram: [], lineData: [] };
    }
    
    const normalizedScores = normalizeScores(data);
    const histogram = getHistogram(normalizedScores);
    
    // 분포 곡선용 데이터
    const lineData = normalizedScores
      .map((score, idx) => ({ idx, score }))
      .sort((a, b) => a.score - b.score);

    return { histogram, lineData };
  }, [data]);

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'row',
      alignItems: 'center', 
      justifyContent: 'center',
      gap: '16px',
      padding: '8px'
    }}>
      {/* 바 차트 */}
      <div style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={histogram} margin={{ top: 10, right: 10, left: -5, bottom: 5 }}>
            <XAxis 
              dataKey="range" 
              tick={{ fontSize: 11 }}
              interval={1}
            />
            <YAxis 
              allowDecimals={false}
              tick={{ fontSize: 11 }}
            />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: '11px' }} iconSize={8} />
            <Bar dataKey="count" fill="#8884d8" name="점수 별 표적 개수" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 라인 차트 */}
      <div style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={lineData} margin={{ top: 10, right: 10, left: -5, bottom: 5 }}>
            <XAxis 
              dataKey="idx" 
              hide={true} 
            />
            <YAxis 
              domain={[0, 1]}
              tick={{ fontSize: 11 }}
            />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: '11px' }} iconSize={8} />
            <Line type="monotone" dataKey="score" stroke="#82ca9d" dot={false} name="표적 정규화 점수" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

TrendChart.displayName = 'TrendChart';

export default TrendChart;
