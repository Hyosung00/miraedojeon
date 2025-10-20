import React, { useState, useCallback, useMemo, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";

// Lazy load components for better code splitting
const TargetGraphComp = lazy(() => import("./TargetGraphComp"));
const TargetCondition = lazy(() => import("./TargetCondition"));
const DataTable = lazy(() => import("./DataTable.jsx"));
const TrendChart = lazy(() => import("./TrendChart.jsx"));
const EventLog = lazy(() => import("./dashboard/EventLog"));

// Regular imports for critical components
import StatisticsCard from "./StatisticsCard.jsx";
import { extractUniqueTypes } from "./TargetCondition/filterUtils";
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
    <div className="target-dashboard-root">
      {/* 대시보드 본문 */}
      <div className="dashboard-main-content">
        {/* 상단 통계카드와 트렌드차트를 한 행에 배치 */}
        <div className="top-stats-wrapper">
          <div className="top-stats-inner">
            <div className="statistics-card-row">
              <StatisticsCard
                dbTitle="전체 노드 개수"
                dbValue={originalNodes.length}
                dbSubtext="네트워크 내 모든 노드"
                className="statistics-card"
              />
              <StatisticsCard
                dbTitle="필터링된 노드 개수"
                dbValue={filteredNodes.length}
                dbSubtext={filterConditions.isActive ? `필터링된 노드 수 (전체: ${originalNodes.length})` : "총 노드 수"}
                className="statistics-card"
              />
              <StatisticsCard
                dbTitle="고유 타입 개수"
                dbValue={statistics.uniqueTypes}
                dbSubtext="네트워크 내 고유 타입 수"
                className="statistics-card"
              />
              <StatisticsCard
                dbTitle="degree_score (평균/최고)"
                dbValue={`${statistics.degreeScoreAvg} / ${statistics.degreeScoreMax}`}
                dbSubtext="degree_score의 평균 / 최고값"
                className="statistics-card"
              />
              <StatisticsCard
                dbTitle="con_score (평균/최고)"
                dbValue={`${statistics.conScoreAvg} / ${statistics.conScoreMax}`}
                dbSubtext="con_score의 평균 / 최고값"
                className="statistics-card"
              />
            </div>
            <div className="trendchart-row">
              <div className="trendchart-wrapper">
                <Suspense fallback={<LoadingFallback />}>
                  <TrendChart data={trendData} />
                </Suspense>
              </div>
            </div>
          </div>
        </div>
        {/* 하단 3분할 레이아웃 - flex row로 명확하게 지정 */}
        <div className="dashboard-layout">
          <div className="dashboard-left">
            <Suspense fallback={<LoadingFallback />}>
              <TargetCondition 
                onConditionChange={handleConditionChange}
                data={originalNodes}
              />
            </Suspense>
          </div>
          <div className="dashboard-center">
            {/* 상단 통계/트렌드는 center 내부에서 렌더링되도록 함 */}
            <div className="center-top">
              {/* top-stats-wrapper가 이미 렌더링되도록 유지 (it is outside of dashboard-layout in previous structure) */}
            </div>
            <Suspense fallback={<LoadingFallback />}>
              <TargetGraphComp dbNodes={filteredNodes} onNodeClick={handleNodeClick} />
            </Suspense>
          </div>
          <div className="dashboard-right">
            <Suspense fallback={<LoadingFallback />}>
              <DataTable dbData={dbData} />
            </Suspense>
          </div>
        </div>
      </div>
      {/* 우측 EventLog */}
      <aside className="dashboard-aside">
        <Suspense fallback={<LoadingFallback />}>
          <EventLog logs={currentLogs} activeView={activeView} />
        </Suspense>
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button 
            onClick={handleNavigateToResponse}
            style={{
              padding: '12px 24px',
              backgroundColor: selectedNode ? '#39306b' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: selectedNode ? 'pointer' : 'not-allowed',
              width: '100%',
              transition: 'all 0.3s ease'
            }}
            disabled={!selectedNode}
          >
            대응 효과 분석
          </button>
        </div>
      </aside>
    </div>
  );
}

