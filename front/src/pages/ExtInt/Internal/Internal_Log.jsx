import React from "react";
import { Card, CardContent, Typography } from '@mui/material';

function InternalLog({ eventLogs = [] }) {
  return (
    <Card sx={{
      minWidth: 350,
      width: 300,
      bgcolor: '#f0edfd',
      color: '#000',
      border: '1px solid #d0c9f0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      borderRadius: '20px',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      height: '100%'
    }}>
      <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minHeight: 0 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#39306b', mb: 1 }}>이벤트 로그</Typography>
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {eventLogs.length === 0 ? (
          <div style={{ color: '#666', fontSize: '14px', padding: '10px' }}>
            노드를 클릭하면 이벤트 로그가 표시됩니다.
          </div>
        ) : (
          eventLogs.map((log, idx) => (
            <div
              key={idx}
              style={{
                padding: '12px 14px',
                marginBottom: '12px',
                background: 'linear-gradient(180deg, rgba(128,90,213,0.12), rgba(99,102,241,0.08))',
                borderRadius: '12px',
                border: '1px solid rgba(124,58,237,0.25)',
                boxShadow: '0 6px 20px rgba(91,76,155,0.18)',
                fontSize: '13px',
                color: '#1f1b2e'
              }}
            >
              {log.message && (
                <div style={{ fontWeight: 700, marginBottom: '8px', color: '#2a2050' }}>{log.message}</div>
              )}
              
              {/* 연결된 노드 개수 */}
              {log.connectedCount !== undefined && (
                <div style={{ marginTop: '8px', marginBottom: '8px', color: '#2a2050' }}>
                  연결된 노드 개수: {log.connectedCount}
                  {Array.isArray(log.connectedIps) && log.connectedIps.length > 0 && (
                    <details style={{ marginTop: '4px', color: '#2a2050' }}>
                      <summary style={{ cursor: 'pointer', color: '#6d4dd6', fontWeight: 700 }}>연결된 노드 IP 목록 보기</summary>
                      <ul style={{ margin: 0, paddingLeft: 16 }}>
                        {log.connectedIps.map((ip, i) => (
                          <li key={ip + i} style={{ color: '#2a2050' }}>{ip}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}

              {/* dbInfo 배열 출력 - 하나의 카드로 통합 */}
              {Array.isArray(log.dbInfo) && log.dbInfo.length > 0 && log.dbInfo.map((info, i) => (
                <div key={i} style={{ margin: '8px 0', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(124,58,237,0.18)', borderRadius: 10, padding: '12px', color: '#2a2050' }}>
                  {/* Source IP */}
                  {info.src_IP && (
                    <div style={{ marginBottom: '12px' }}>
                      <strong style={{ color: '#3b2c6b' }}>Source IP</strong>
                      <ul style={{ margin: 0, paddingLeft: 16, marginTop: 6 }}>
                        {Object.entries(info.src_IP)
                          .filter(([key]) => ["ip", "__labels", "id"].includes(key))
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
                          .filter(([key]) => ["ip", "__labels", "id"].includes(key))
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
                          .filter(([key]) => !["count"].includes(key))
                          .map(([key, value]) => (
                            <li key={key} style={{ color: '#2a2050' }}><b style={{ color: '#6553a7' }}>{key}:</b> {String(value)}</li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
        </div>
      </CardContent>
    </Card>
  );
}

export default InternalLog;
