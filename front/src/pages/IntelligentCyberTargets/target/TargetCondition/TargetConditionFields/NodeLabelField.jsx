import React from 'react';

const NodeLabelField = ({ showAdvanced, availableTypes, filters, onTypeToggle }) => (
  showAdvanced && (
        <div className="label-checkboxes">
          {/* 2계층 */}
          <React.Fragment>
            <div className="layer-title layer2">2계층</div>
            <div className="layer-checkboxes">
              {["switch", "router"].filter(type => availableTypes.includes(type)).map(type => (
                <label key={type} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={filters.nodeTypes && filters.nodeTypes.includes(type)}
                    onChange={() => onTypeToggle(type)}
                  />
                  <span>{type}</span>
                </label>
              ))}
            </div>
          </React.Fragment>
          {/* 3계층 */}
          <React.Fragment>
            <div className="layer-title layer3">3계층</div>
            <div className="layer-checkboxes">
              {["firewall", "router", "server", "workstation", "printer", "laptop"].filter(type => availableTypes.includes(type)).map(type => (
                <label key={type} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={filters.nodeTypes && filters.nodeTypes.includes(type)}
                    onChange={() => onTypeToggle(type)}
                  />
                  <span>{type}</span>
                </label>
              ))}
            </div>
          </React.Fragment>
          {/* 4계층 */}
          <React.Fragment>
            <div className="layer-title layer4">4계층</div>
            <div className="layer-checkboxes">
              {["plc", "sensor"].filter(type => availableTypes.includes(type)).map(type => (
                <label key={type} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={filters.nodeTypes && filters.nodeTypes.includes(type)}
                    onChange={() => onTypeToggle(type)}
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
