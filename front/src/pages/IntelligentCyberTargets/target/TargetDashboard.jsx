import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
// Card, CardContent 제거
import TargetGraphComp from "./TargetGraphComp";
import TargetCondition from "./TargetCondition";
import DataTable from "./DataTable.jsx";
import TrendChart from "./TrendChart.jsx";
import StatisticsCard from "./StatisticsCard.jsx";
import Header from "./Header.jsx";
import EventLog from "./dashboard/EventLog";
import { extractUniqueTypes } from "./TargetCondition/filterUtils";
import "./Target.css";


// logs와 activeView prop 추가
export default function TargetDashboard({ onNodeClick, data, logs = [], activeView = "target" }) {
  const navigate = useNavigate();
  const [nodes, setNodes] = useState(data || []);
  const [filteredNodes, setFilteredNodes] = useState([]);
  const [filterConditions, setFilterConditions] = useState({});
  const [currentLogs, setCurrentLogs] = useState(logs);
  const [selectedNode, setSelectedNode] = useState(null);

  // 항상 함수 최상단에서 선언
  const originalNodes = Array.isArray(nodes) ? nodes : (nodes?.nodes || nodes?.network || []);

  // 임시로 TrendChart를 최상단에 렌더링
  const dummyData = [
    { degree_score: 0.2, con_score: 0.3 },
    { degree_score: 0.5, con_score: 0.7 },
    { degree_score: 0.8, con_score: 0.1 },
    { degree_score: 0.9, con_score: 0.6 }
  ];

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
  }, [nodes]);


  const handleConditionChange = (newConditions, filteredData) => {
    setFilterConditions(newConditions);
    setFilteredNodes(filteredData);
  };

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

  const dbData = [
    { category: 'direct', current: directCurrent, total: directCurrent },
    { category: 'indirect', current: indirectCurrent, total: indirectCurrent },
    ...Object.entries(typeCountMap).map(([type, count]) => ({ category: type, current: count, total: count }))
  ];

  const handleNodeClick = (node) => {
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
  };

  const handleNavigateToResponse = () => {
    if (!selectedNode) {
      alert('먼저 노드를 선택해주세요.');
      return;
    }
    // 선택된 노드 정보를 state로 전달하면서 페이지 이동
  navigate('/ActiveResponse/responseeffectvisualization', { state: { selectedNode } });
  };

  return (
    <div className="target-dashboard-root">
      {/* 대시보드 본문 */}
      <div className="dashboard-main-content">
        <Header />
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
                dbValue={extractUniqueTypes(originalNodes).length}
                dbSubtext="네트워크 내 고유 타입 수"
                className="statistics-card"
              />
              <StatisticsCard
                dbTitle="degree_score (평균/최고)"
                dbValue={(() => {
                  const scores = [
                    ...originalNodes.map(n => n.src_IP?.degree_score),
                    ...originalNodes.map(n => n.dst_IP?.degree_score)
                  ].filter(v => typeof v === 'number');
                  const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(3) : '-';
                  const max = scores.length ? Math.max(...scores).toFixed(3) : '-';
                  return `${avg} / ${max}`;
                })()}
                dbSubtext="degree_score의 평균 / 최고값"
                className="statistics-card"
              />
              <StatisticsCard
                dbTitle="con_score (평균/최고)"
                dbValue={(() => {
                  const scores = [
                    ...originalNodes.map(n => n.src_IP?.con_score),
                    ...originalNodes.map(n => n.dst_IP?.con_score)
                  ].filter(v => typeof v === 'number');
                  const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(3) : '-';
                  const max = scores.length ? Math.max(...scores).toFixed(3) : '-';
                  return `${avg} / ${max}`;
                })()}
                dbSubtext="con_score의 평균 / 최고값"
                className="statistics-card"
              />
            </div>
            <div className="trendchart-row">
              <div className="trendchart-wrapper">
                <TrendChart data={originalNodes.map(n => ({
                  degree_score: n.src_IP?.degree_score || n.dst_IP?.degree_score || 0,
                  con_score: n.src_IP?.con_score || n.dst_IP?.con_score || 0
                }))} />
              </div>
            </div>
          </div>
        </div>
        {/* 하단 3분할 레이아웃 - flex row로 명확하게 지정 */}
        <div className="dashboard-layout">
          <div className="dashboard-left">
            <TargetCondition 
              onConditionChange={handleConditionChange}
              data={originalNodes}
            />
          </div>
          <div className="dashboard-center">
            {/* 상단 통계/트렌드는 center 내부에서 렌더링되도록 함 */}
            <div className="center-top">
              {/* top-stats-wrapper가 이미 렌더링되도록 유지 (it is outside of dashboard-layout in previous structure) */}
            </div>
            <TargetGraphComp dbNodes={filteredNodes} onNodeClick={handleNodeClick} />
          </div>
          <div className="dashboard-right">
            <DataTable dbData={dbData} />
          </div>
        </div>
      </div>
      {/* 우측 EventLog */}
      <aside className="dashboard-aside">
        <EventLog logs={currentLogs} activeView={activeView} />
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

