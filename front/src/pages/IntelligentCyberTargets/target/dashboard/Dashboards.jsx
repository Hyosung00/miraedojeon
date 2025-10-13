import React, { useState, useEffect } from "react";
import TargetDashboard from "../Target/TargetDashboard";
import EventLog from "./EventLog";
import "./Dashboard.css";


function Dashboards() {
  const [activeView, setActiveView] = useState("externalInternal");
  const [dbNodes, setDbNodes] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    fetch(`http://localhost:8000/neo4j/nodes?activeView=${activeView}`)
      .then((res) => res.json())
      .then((data) => setDbNodes(data))
      .catch(() => console.warn("Failed to fetch nodes"));
    // activeView가 바뀌면 노드 상세정보 초기화
    setSelectedNode(null);
  }, [activeView]);

  // 노드 클릭 시 node 객체를 직접 받아서 저장 (연결 개수 포함)
  const handleNodeClick = (node) => {
    setSelectedNode(node || null);
  };

  return (
    <div className="dashboard-layout" style={{ display: 'flex', width: '100%', height: '100%' }}>
      {/* Center: Main dashboard content */}
      <main className="dashboard-main-container" style={{ flex: 1, minWidth: 0 }}>
        {activeView === "target" && dbNodes && (
          <div className="dashboard-content" style={{ height: '100%' }}>
            <TargetDashboard
              onNodeClick={handleNodeClick}
              data={dbNodes}
              logs={selectedNode ? [{
                type: "info",
                timestamp: new Date().toLocaleString(),
                ...selectedNode
              }] : []}
              activeView={activeView}
            />
          </div>
        )}
      </main>

      {/* Right: Event Log */}
      <aside className="dashboard-log" style={{ minWidth: 250, maxWidth: 320, borderLeft: '1px solid #eee', background: '#fafafa', padding: 16 }}>
        <EventLog
          logs={selectedNode
            ? [{
                type: "info",
                timestamp: new Date().toLocaleString(),
                ...selectedNode
              }]
            : [] // 초기 화면에서는 아무것도 전달하지 않음
          }
          activeView={activeView}
        />
      </aside>
    </div>
  );
}

// Ensure the Dashboards component is exported properly
export default Dashboards;
