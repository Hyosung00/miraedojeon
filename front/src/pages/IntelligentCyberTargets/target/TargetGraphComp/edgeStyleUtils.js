// vis-network edge 스타일 유틸리티
// edge 객체의 속성에 따라 vis-network 스타일을 반환

export function getEdgeStyle(edge) {
  return {
    dashes: edge.edgeType === 'dashed' || edge.isDashed === true,
    color: edge.color || '#333',
    width: edge.width || 2,
    arrows: edge.arrows || 'to',
    // 필요시 추가 스타일 속성
  };
}
