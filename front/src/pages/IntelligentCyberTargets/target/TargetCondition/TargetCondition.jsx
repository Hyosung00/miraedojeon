import React, { useState } from 'react';
import '../Target.css';
import { extractUniqueTypes, normalizeAdScore } from './filterUtils';
import ConnectionTypeField from './TargetConditionFields/ConnectionTypeField';
import ScoreField from './TargetConditionFields/ScoreField';
import NodeLabelField from './TargetConditionFields/NodeLabelField';

const TargetCondition = ({ onConditionChange, data }) => {
  // 최초 마운트 시 초기 데이터 전달 (그래프 자동 렌더링)
  React.useEffect(() => {
    if (onConditionChange) {
      onConditionChange(filters, filterNodes(data, filters));
    }
    // eslint-disable-next-line
  }, []);
  const [filters, setFilters] = useState({
    minConnections: '',
    minTargetScore: '',
    maxConnections: '',
    maxTargetScore: '',
    nodeTypes: [],
    connectionType: '', // 'direct', 'indirect', ''(전체)
    isActive: false
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  // 실제 데이터에서 사용 가능한 노드 레이블 추출
  const availableTypes = React.useMemo(() => {
    if (!data) return ['Internal', 'External', 'Server', 'Client', 'Router', 'Switch'];
    return extractUniqueTypes(data);
  }, [data]);

  // 필터링 함수: 모든 조건을 반영하여 데이터 필터링
  const filterNodes = (nodes, filters) => {
    let filtered = nodes;
    // 연결 유형
    if (filters.connectionType === 'direct') {
      filtered = filtered.filter(item => {
        const score = item.src_IP?.degree_score;
        return typeof score === 'number' && score > 0.5;
      });
    } else if (filters.connectionType === 'indirect') {
      filtered = filtered.filter(item => {
        const score = item.src_IP?.degree_score;
        return typeof score === 'number' && score > 0 && score <= 0.5;
      });
    }
    // 연결된 노드 수(min/max)
    if (filters.minConnections || filters.maxConnections) {
      const min = filters.minConnections ? Number(filters.minConnections) : -Infinity;
      const max = filters.maxConnections ? Number(filters.maxConnections) : Infinity;
      filtered = filtered.filter(item => {
        let count = 0;
        const srcIp = item.src_IP?.ip;
        if (!srcIp) return false;
        nodes.forEach(n => {
          if (n.src_IP?.ip === srcIp || n.dst_IP?.ip === srcIp) {
            count++;
          }
        });
        return count >= min && count <= max;
      });
    }
    // 노드 유형(nodeTypes) 조건
    if (filters.nodeTypes && filters.nodeTypes.length > 0) {
      filtered = filtered.filter(item => {
        const srcType = item.src_IP?.type;
        const dstType = item.dst_IP?.type;
        return (srcType && filters.nodeTypes.includes(srcType)) ||
               (dstType && filters.nodeTypes.includes(dstType));
      });
    }
    // 표적 점수(ad_score) 조건 (정규화)
    const adScores = nodes.map(item => item.src_IP?.ad_score).filter(v => typeof v === 'number');
    const minAd = Math.min(...adScores);
    const maxAd = Math.max(...adScores);
    if (filters.minTargetScore || filters.maxTargetScore) {
      const minScore = filters.minTargetScore ? Number(filters.minTargetScore) : -Infinity;
      const maxScore = filters.maxTargetScore ? Number(filters.maxTargetScore) : Infinity;
      filtered = filtered.filter(item => {
        const score = normalizeAdScore(item.src_IP?.ad_score, minAd, maxAd);
        return score >= minScore && score <= maxScore;
      });
    }
    return filtered;
  };

  const handleInputChange = (field, value) => {
    const newFilters = {
      ...filters,
      [field]: value
    };
    setFilters(newFilters);
    // 연결 유형 변경 시 바로 필터 적용
    if (field === 'connectionType') {
      const activeFilters = { ...newFilters, isActive: true };
      setFilters(activeFilters);
      if (onConditionChange) {
        onConditionChange(activeFilters, filterNodes(data, activeFilters));
      }
    } else {
      // 조건이 변경되면 상위 컴포넌트에 알림
      if (onConditionChange) {
        onConditionChange(newFilters, filterNodes(data, newFilters));
      }
    }
  };

  const handleTypeToggle = (type) => {
    const newTypes = filters.nodeTypes.includes(type)
      ? filters.nodeTypes.filter(t => t !== type)
      : [...filters.nodeTypes, type];
    handleInputChange('nodeTypes', newTypes);
  };

  const applyFilters = () => {
    const activeFilters = { ...filters, isActive: true };
    setFilters(activeFilters);
    if (onConditionChange) {
      onConditionChange(activeFilters, filterNodes(data, activeFilters));
    }
  };

  const clearFilters = () => {
    const clearedFilters = {
      minConnections: '',
      minTargetScore: '',
      maxConnections: '',
      maxTargetScore: '',
      nodeTypes: [],
      isActive: false
    };
    setFilters(clearedFilters);
    if (onConditionChange) {
      onConditionChange(clearedFilters, filterNodes(data, clearedFilters));
    }
  };

  return (
    <div className="target-condition">
      <div className="condition-header">
        <h3>노드 필터링 조건</h3>
        <button 
          className="toggle-advanced-btn"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? '간단히 보기' : '고급 옵션'}
        </button>
      </div>

      <div className="condition-content">
        {/* 직접/간접 연결 필터 버튼 */}
        <ConnectionTypeField
          value={filters.connectionType}
          onChange={val => handleInputChange('connectionType', val)}
        />
        {/* 기본 조건 */}
        <ScoreField
          filters={filters}
          onInputChange={handleInputChange}
        />
        {/* 고급 조건 */}
        <NodeLabelField
          showAdvanced={showAdvanced}
          availableTypes={availableTypes}
          filters={filters}
          onTypeToggle={handleTypeToggle}
        />

        {/* 액션 버튼 */}
        <div className="condition-actions">
          <button 
            className="apply-btn"
            onClick={applyFilters}
            disabled={!filters.minConnections && !filters.minTargetScore && !filters.maxConnections && !filters.maxTargetScore && filters.nodeTypes.length === 0}
          >
            필터 적용
          </button>
          <button 
            className="clear-btn"
            onClick={clearFilters}
          >
            초기화
          </button>
        </div>

        {/* 현재 활성 필터 표시 */}
        {filters.isActive && (
          <div className="active-filters">
            <h4>적용된 필터:</h4>
            <ul>
              {filters.minConnections && <li>최소 연결 수: {filters.minConnections}개</li>}
              {filters.maxConnections && <li>최대 연결 수: {filters.maxConnections}개</li>}
              {filters.minTargetScore && <li>최소 Target Score: {filters.minTargetScore}</li>}
              {filters.maxTargetScore && <li>최대 Target Score: {filters.maxTargetScore}</li>}
              {filters.nodeTypes.length > 0 && <li>노드 유형: {filters.nodeTypes.join(', ')}</li>}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default TargetCondition;