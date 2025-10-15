import React from 'react';

const ScoreField = ({ filters, onInputChange }) => (
  <div className="basic-conditions">
    <div className="condition-group">
      <label>연결된 노드 수</label>
      <div className="range-inputs">
        <input
          type="number"
          placeholder="최소값"
          value={filters.minConnections}
          onChange={e => onInputChange('minConnections', e.target.value)}
          min="0"
        />
        <span>~</span>
        <input
          type="number"
          placeholder="최대값"
          value={filters.maxConnections}
          onChange={e => onInputChange('maxConnections', e.target.value)}
          min="0"
        />
      </div>
    </div>
    <div className="condition-group">
      <label>표적 점수 (1~100)</label>
      <div className="range-inputs">
        <input
          type="number"
          placeholder="최소점수"
          value={filters.minTargetScore}
          onChange={e => onInputChange('minTargetScore', e.target.value)}
          min="0"
          step="0.1"
        />
        <span>~</span>
        <input
          type="number"
          placeholder="최대점수"
          value={filters.maxTargetScore}
          onChange={e => onInputChange('maxTargetScore', e.target.value)}
          min="0"
          step="0.1"
        />
      </div>
    </div>
  </div>
);

export default ScoreField;
