import React, { memo } from 'react';
import { useLocation } from 'react-router-dom';

const ResponseEffectVisualization = memo(() => {
  const location = useLocation();
  const selectedNode = location.state?.selectedNode;
  if (!selectedNode) {
    return (
      <div style={{ padding: '20px' }}>
        <h2>대응 효과 시각화</h2>
        <p>노드를 선택하고 "대응 효과 분석" 버튼을 클릭하세요.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>대응 효과 시각화</h2>
      <div style={{ marginTop: '20px' }}>
        <h3>선택된 노드 정보</h3>
        <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '8px' }}>
          <p><strong>ID:</strong> {selectedNode.id}</p>
          <p><strong>Label:</strong> {selectedNode.label}</p>
          <p><strong>연결된 IP 수:</strong> {selectedNode.connectedCount || 0}</p>
          {selectedNode.dbInfo && (
            <>
              <p><strong>Type:</strong> {selectedNode.dbInfo.type}</p>
              <p><strong>Degree Score:</strong> {selectedNode.dbInfo.degree_score}</p>
              <p><strong>Con Score:</strong> {selectedNode.dbInfo.con_score}</p>
            </>
          )}
        </div>
        
        {selectedNode.connectedIps && selectedNode.connectedIps.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h3>연결된 IP 목록</h3>
            <ul>
              {selectedNode.connectedIps.map((ip, idx) => (
                <li key={idx}>{ip}</li>
              ))}
            </ul>
          </div>
        )}
        {/* 전체 노드 정보 JSON 출력 (테스트용) */}
        <pre style={{ marginTop: '30px', background: '#eee', padding: '16px', borderRadius: '8px' }}>
          {JSON.stringify(selectedNode, null, 2)}
        </pre>
      </div>
    </div>
  );
});

ResponseEffectVisualization.displayName = 'ResponseEffectVisualization';

export default ResponseEffectVisualization;
