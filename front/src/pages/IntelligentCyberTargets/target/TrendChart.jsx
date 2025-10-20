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
    <div className="TrendChartContainer">
      <div className="trendchart-row">
        <div className="trendchart-card">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={histogram} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <XAxis dataKey="range" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#8884d8" name="점수 별 표적 개수" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="trendchart-card">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={lineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <XAxis dataKey="idx" hide={true} />
              <YAxis domain={[0, 1]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="score" stroke="#82ca9d" dot={false} name="표적 정규화 점수" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
});

TrendChart.displayName = 'TrendChart';

export default TrendChart;
