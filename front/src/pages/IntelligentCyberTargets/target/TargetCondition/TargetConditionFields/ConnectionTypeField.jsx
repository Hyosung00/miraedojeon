import React from 'react';

const ConnectionTypeField = ({ value, onChange }) => (
  <div className="condition-group">
    <label>연결 유형</label>
    <div style={{ display: 'flex', gap: '8px' }}>
      <button
        type="button"
        className={value === '' ? 'apply-btn active' : 'apply-btn'}
        onClick={() => onChange('')}
      >전체</button>
      <button
        type="button"
        className={value === 'direct' ? 'apply-btn active' : 'apply-btn'}
        onClick={() => onChange('direct')}
      >직접 연결</button>
      <button
        type="button"
        className={value === 'indirect' ? 'apply-btn active' : 'apply-btn'}
        onClick={() => onChange('indirect')}
      >간접 연결</button>
    </div>
  </div>
);

export default ConnectionTypeField;
