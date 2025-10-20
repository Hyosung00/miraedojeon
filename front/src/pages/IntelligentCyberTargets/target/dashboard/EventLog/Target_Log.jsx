import React from "react";

function TargetLog({ logs }) {
  const safeLogs = Array.isArray(logs) ? logs : [];
  return (
    <>
      {safeLogs.map((log, index) => (
        <div key={index} className={`packet-log ${log.type || ''}`} style={{ color: '#222' }}>
          {log.message && <div style={{ color: '#222' }}>{log.message}</div>}
          {/* 연결된 노드 개수: Source IP 위에 출력 + 드롭다운 ip 목록 */}
          {log.connectedCount !== undefined && (
            <div key={index} className={`packet-log ${log.type || ''}`} style={{ marginBottom: '16px', color: '#222' }}>
              연결된 노드 개수: {log.connectedCount}
              {Array.isArray(log.connectedIps) && log.connectedIps.length > 0 && (
                <details style={{ marginTop: '4px', color: '#222' }}>
                  <summary style={{ cursor: 'pointer', color: '#1976d2', fontWeight: 'bold' }}>연결된 노드 IP 목록 보기</summary>
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {log.connectedIps.map((ip, idx) => (
                      <li key={ip + idx} style={{ color: '#222' }}>{ip}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
          {/* dbInfo 배열 출력 - 하나의 카드로 통합 */}
          {Array.isArray(log.dbInfo) && log.dbInfo.length > 0 && log.dbInfo.map((info, i) => (
            <div key={i} style={{ margin: '8px 0', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(124,58,237,0.18)', borderRadius: 10, padding: '12px', color: '#222' }}>
              {/* Source IP */}
              {info.src_IP && (
                <div style={{ marginBottom: '12px' }}>
                  <strong style={{ color: '#3b2c6b' }}>Source IP</strong>
                  <ul style={{ margin: 0, paddingLeft: 16, marginTop: 6 }}>
                    {Object.entries(info.src_IP)
                      .filter(([key]) => ["ip", "__labels", "__id", "id", "index"].includes(key))
                      .map(([key, value]) => (
                        <li key={key} style={{ color: '#2a2050' }}><b style={{ color: '#6553a7' }}>{key}:</b> {String(value)}</li>
                      ))}
                  </ul>
                </div>
              )}
              
              {/* Destination IP */}
              {info.dst_IP && (
                <div style={{ marginBottom: '12px' }}>
                  <strong style={{ color: '#3b2c6b' }}>Destination IP</strong>
                  <ul style={{ margin: 0, paddingLeft: 16, marginTop: 6 }}>
                    {Object.entries(info.dst_IP)
                      .filter(([key]) => ["ip", "__labels", "__id", "id", "__indexColor", "color", "index"].includes(key))
                      .map(([key, value]) => (
                        <li key={key} style={{ color: '#2a2050' }}><b style={{ color: '#6553a7' }}>{key}:</b> {String(value)}</li>
                      ))}
                  </ul>
                </div>
              )}
              
              {/* Edge Info */}
              {info.edge && (
                <div>
                  <strong style={{ color: '#3b2c6b' }}>Edge Info</strong>
                  <ul style={{ margin: 0, paddingLeft: 16, marginTop: 6 }}>
                    {Object.entries(info.edge)
                      .map(([key, value]) => (
                        <li key={key} style={{ color: '#2a2050' }}><b style={{ color: '#6553a7' }}>{key}:</b> {String(value)}</li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

export default TargetLog;
