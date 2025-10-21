
import React, { memo } from 'react';
import { useLocation } from 'react-router-dom';
import OffensiveStrategy from './OffensiveStrategy';

const ResponseEffectVisualization = memo(() => {
  const location = useLocation();
  const selectedNode = location.state?.selectedNode;
  
  
  // dbInfo에서 실제 Neo4j element ID 추출
  let deviceElementId = null;
  
  if (selectedNode?.dbInfo && selectedNode.dbInfo.length > 0) {
    // dbInfo[0]에서 src_IP 또는 dst_IP의 __element_id 또는 id 사용
    const dbInfo = selectedNode.dbInfo[0];
    // dst_IP를 우선으로 사용 (클릭한 노드가 dst_IP일 가능성이 높음)
    deviceElementId = dbInfo.dst_IP?.__element_id || dbInfo.dst_IP?.id || 
                      dbInfo.src_IP?.__element_id || dbInfo.src_IP?.id;
  }
  
  // fallback: selectedNode 자체에서 찾기
  if (!deviceElementId) {
    deviceElementId = selectedNode?.elementId || selectedNode?.__element_id || selectedNode?.id;
  }
  
  
  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <OffensiveStrategy deviceElementId={deviceElementId} />
    </div>
  );
});

ResponseEffectVisualization.displayName = 'ResponseEffectVisualization';

export default ResponseEffectVisualization;
