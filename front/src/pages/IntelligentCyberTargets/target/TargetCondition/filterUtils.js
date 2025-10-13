// ad_score를 1~100점으로 정규화하는 함수
export function normalizeAdScore(score, minAd, maxAd) {
  if (typeof score !== 'number' || isNaN(score) || minAd === maxAd) return 1;
  return Math.round(1 + 99 * (score - minAd) / (maxAd - minAd));
}
/**
 * 노드 배열에서 고유한 type들을 추출하는 함수
 * @param {Array} nodes - 노드 배열
 * @returns {Array} 고유한 type 배열
 */
export const extractUniqueTypes = (nodes) => {
  if (!nodes) return [];
  const typeSet = new Set();
  nodes.forEach(nodeItem => {
    [nodeItem.src_IP, nodeItem.dst_IP].forEach(node => {
      if (node && node.type) {
        typeSet.add(node.type);
      }
    });
  });
  return Array.from(typeSet).sort();
};
// 노드 필터링을 위한 유틸리티 함수들

/**
 * 노드의 연결 개수를 계산하는 함수
 * @param {Object} node - 노드 객체
 * @param {Array} allNodes - 전체 노드 배열 (src_IP, dst_IP 형태의 연결 데이터)
 * @returns {number} 연결된 노드의 개수
 */
export const getNodeConnectionCount = (node, allNodes) => {
  if (!node || !allNodes) return 0;
  const nodeId = String(node.__id ?? node.id ?? node.ip ?? node.index ?? JSON.stringify(node));
  // 그래프 생성 (nodeId: 연결된 nodeId 배열)
  const graph = {};
  allNodes.forEach(item => {
    if (item.src_IP && item.dst_IP) {
      const srcId = String(item.src_IP.__id ?? item.src_IP.id ?? item.src_IP.ip ?? item.src_IP.index ?? JSON.stringify(item.src_IP));
      const dstId = String(item.dst_IP.__id ?? item.dst_IP.id ?? item.dst_IP.ip ?? item.dst_IP.index ?? JSON.stringify(item.dst_IP));
      if (!graph[srcId]) graph[srcId] = [];
      if (!graph[dstId]) graph[dstId] = [];
      graph[srcId].push(dstId);
      graph[dstId].push(srcId);
    }
  });
  // BFS로 연결된 모든 노드 탐색
  const visited = new Set();
  const queue = [nodeId];
  visited.add(nodeId);
  while (queue.length > 0) {
    const current = queue.shift();
    const neighbors = graph[current] || [];
    neighbors.forEach(neighbor => {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    });
  }
  // 자기 자신 제외한 연결된 노드 개수 반환
  return visited.size - 1;
};

/**
 * 노드의 target_score를 가져오는 함수
 * @param {Object} node - 노드 객체
 * @returns {number} target_score 값
 */
export const getNodeTargetScore = (node) => {
  if (!node) return 0;
  
  // 다양한 형태의 score 속성을 확인
  return parseFloat(node.target_score ?? node.targetScore ?? node.score ?? node.risk_score ?? node.priority ?? 0);
};


/**
 * 노드의 타입을 가져오는 함수
 * @param {Object} node - 노드 객체
 * @returns {string} 노드의 타입
 */
export const getNodeType = (node) => {
  if (!node) return '';
  return node.type ?? '';
};

/**
 * 필터 조건에 따라 노드를 필터링하는 메인 함수
 * @param {Array} nodes - 필터링할 노드 배열
 * @param {Object} filters - 필터 조건
 * @returns {Array} 필터링된 노드 배열
 */
export const filterNodes = (nodes, filters) => {
  if (!nodes || !filters || !filters.isActive) return nodes;

  return nodes.filter(nodeItem => {
    // 연결 유형 조건 검사 (edge 단위)
    if (filters.connectionType === 'direct') {
      const isDirect = (nodeItem.src_IP && nodeItem.src_IP.degree_score > 0.5) ||
                      (nodeItem.dst_IP && nodeItem.dst_IP.degree_score > 0.5);
      if (!isDirect) return false;
    } else if (filters.connectionType === 'indirect') {
      const isIndirect = (nodeItem.src_IP && nodeItem.src_IP.degree_score > 0 && nodeItem.src_IP.degree_score <= 0.5) ||
                        (nodeItem.dst_IP && nodeItem.dst_IP.degree_score > 0 && nodeItem.dst_IP.degree_score <= 0.5);
      if (!isIndirect) return false;
    }

    // src_IP와 dst_IP 모두 체크
    const nodesToCheck = [];
    if (nodeItem.src_IP) nodesToCheck.push(nodeItem.src_IP);
    if (nodeItem.dst_IP) nodesToCheck.push(nodeItem.dst_IP);

    // 모든 조건을 만족하는지 검사
    return nodesToCheck.some(node => {
      // BFS 기반 연결 개수 필터
      const connectionCount = getNodeConnectionCount(node, nodes);
      if (filters.minConnections && connectionCount < parseInt(filters.minConnections)) {
        return false;
      }
      if (filters.maxConnections && connectionCount > parseInt(filters.maxConnections)) {
        return false;
      }

      // Target Score 필터
      const targetScore = getNodeTargetScore(node);
      if (filters.minTargetScore && targetScore < parseFloat(filters.minTargetScore)) {
        return false;
      }
      if (filters.maxTargetScore && targetScore > parseFloat(filters.maxTargetScore)) {
        return false;
      }

      // 노드 타입 필터
      if (filters.nodeTypes && filters.nodeTypes.length > 0) {
        const nodeType = getNodeType(node);
        if (!filters.nodeTypes.includes(nodeType)) {
          return false;
        }
      }

      return true;
    });
  });
};

/**
 * 필터링 통계를 생성하는 함수
 * @param {Array} originalNodes - 원본 노드 배열
 * @param {Array} filteredNodes - 필터링된 노드 배열
 * @returns {Object} 필터링 통계
 */
export const getFilterStats = (originalNodes, filteredNodes) => {
  return {
    total: originalNodes?.length ?? 0,
    filtered: filteredNodes?.length ?? 0,
    percentage: originalNodes?.length ? 
      Math.round((filteredNodes?.length ?? 0) / originalNodes.length * 100) : 0
  };
};

/**
 * 노드 배열에서 고유한 레이블들을 추출하는 함수
 * @param {Array} nodes - 노드 배열
 * @returns {Array} 고유한 레이블 배열
 */
