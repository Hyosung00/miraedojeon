
import React, { memo } from 'react';
import { useLocation } from 'react-router-dom';
import OffensiveStrategy from './OffensiveStrategy';

const ResponseEffectVisualization = memo(() => {
  const location = useLocation();
  const selectedNode = location.state?.selectedNode;
  
  console.log('🔍 ResponseEffectVisualization - selectedNode:', selectedNode);
  
  // dbInfo에서 device name 추출 (OffensiveStrategy는 name 기반으로 조회)
  let deviceName = null;
  
  if (selectedNode?.dbInfo && selectedNode.dbInfo.length > 0) {
    // dbInfo[0]에서 src_IP 또는 dst_IP의 name 사용
    const dbInfo = selectedNode.dbInfo[0];
    // dst_IP를 우선으로 사용 (클릭한 노드가 dst_IP일 가능성이 높음)
    deviceName = dbInfo.dst_IP?.name || dbInfo.src_IP?.name;
    console.log('  📌 dbInfo에서 추출한 deviceName:', deviceName);
  }
  
  // fallback: selectedNode 자체에서 name 찾기
  if (!deviceName) {
    deviceName = selectedNode?.name || selectedNode?.label || selectedNode?.id;
    console.log('  📌 selectedNode에서 추출한 deviceName:', deviceName);
  }
  
  console.log('  ✅ 최종 deviceName:', deviceName);
  
  return (
    <OffensiveStrategy deviceElementId={deviceName} />
  );
});

ResponseEffectVisualization.displayName = 'ResponseEffectVisualization';

export default ResponseEffectVisualization;
