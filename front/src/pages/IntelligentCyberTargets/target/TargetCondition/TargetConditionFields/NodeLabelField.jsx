import React from 'react';

const NodeLabelField = ({ showAdvanced, availableTypes, filters, onTypeToggle }) => (
  showAdvanced && (
        <div className="label-checkboxes">
          {/* 2계층 */}
          <React.Fragment>
            <div style={{ color: '#2a70b0', fontWeight: 'bold', marginBottom: '4px' }}>2계층</div>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px', marginLeft: '12px' }}>
              {["switch", "router"].filter(type => availableTypes.includes(type)).map(type => (
                <label key={type} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={filters.nodeTypes && filters.nodeTypes.includes(type)}
                    onChange={() => onTypeToggle(type)}
                    style={{ marginRight: '8px' }}
                  />
                  <span>{type}</span>
                </label>
              ))}
            </div>
          </React.Fragment>
          {/* 3계층 */}
          <React.Fragment>
            <div style={{ color: '#18b57b', fontWeight: 'bold', marginBottom: '4px' }}>3계층</div>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px', marginLeft: '12px' }}>
              {["firewall", "router", "server", "workstation", "printer", "laptop"].filter(type => availableTypes.includes(type)).map(type => (
                <label key={type} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={filters.nodeTypes && filters.nodeTypes.includes(type)}
                    onChange={() => onTypeToggle(type)}
                    style={{ marginRight: '8px' }}
                  />
                  <span>{type}</span>
                </label>
              ))}
            </div>
          </React.Fragment>
          {/* 4계층 */}
          <React.Fragment>
            <div style={{ color: '#b06e2a', fontWeight: 'bold', marginBottom: '4px' }}>4계층</div>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px', marginLeft: '12px' }}>
              {["plc", "sensor"].filter(type => availableTypes.includes(type)).map(type => (
                <label key={type} className="checkbox-label" style={{ minWidth: '100px' }}>
                  <input
                    type="checkbox"
                    checked={filters.nodeTypes && filters.nodeTypes.includes(type)}
                    onChange={() => onTypeToggle(type)}
                    style={{ marginRight: '8px' }}
                  />
                  <span>{type}</span>
                </label>
              ))}
            </div>
          </React.Fragment>
        </div>
  )
);

export default NodeLabelField;
