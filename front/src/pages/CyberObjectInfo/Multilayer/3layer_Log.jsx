import React from "react";
import { Card, CardContent, Typography } from '@mui/material';

function InternalLog({ eventLogs = [] }) {
  return (
      <Card elevation={0} sx={{
        minWidth: 350,
        width: 300,
        bgcolor: '#f0edfd',
        color: '#000',
        border: '1px solid #d0c9f0',
        // boxShadow removed
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
              <div key={idx} style={{
                padding: '10px',
                marginBottom: '8px',
                background: 'rgba(57, 48, 107, 0.1)',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#333'
              }}>
                {log.message && <div style={{ fontWeight: 600, marginBottom: '4px', color: '#222' }}>{log.message}</div>}
                {log.nodeInfo && (
                  <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                    Layer: {log.nodeInfo.layer} | Type: {log.nodeInfo.type}
                  </div>
                )}

                {/* 연결된 노드 개수 */}
                {log.connectedCount !== undefined && (
                  <div style={{ marginTop: '8px', marginBottom: '8px', color: '#222' }}>
                    연결된 노드 개수: {log.connectedCount}
                    {Array.isArray(log.connectedIps) && log.connectedIps.length > 0 && (
                      <details style={{ marginTop: '4px', color: '#222' }}>
                        <summary style={{ cursor: 'pointer', color: '#1976d2', fontWeight: 'bold' }}>연결된 노드 IP 목록 보기</summary>
                        <ul style={{ margin: 0, paddingLeft: 16 }}>
                          {log.connectedIps.map((ip, i) => (
                            <li key={ip + i} style={{ color: '#222' }}>{ip}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                )}

                {/* dbInfo 배열 출력 - 하나의 카드로 통합 */}
                {Array.isArray(log.dbInfo) && log.dbInfo.length > 0 && log.dbInfo.map((info, i) => (
                  <Card key={i} elevation={0} sx={{
                    bgcolor: 'rgba(255,255,255,0.6)',
                    border: '1px solid rgba(124,58,237,0.18)',
                    borderRadius: 2,
                    mt: 1
                  }}>
                    <CardContent sx={{ py: 1.25, px: 1.5 }}>
                      {/* Source IP */}
                      {info.src_IP && (
                        <div style={{ marginBottom: '12px' }}>
                          <Typography variant="subtitle2" sx={{ color: '#3b2c6b', fontWeight: 700, mb: 0.5 }}>Source IP</Typography>
                          <ul style={{ margin: 0, paddingLeft: 16 }}>
                                {(() => {
                                  const filtered = Object.entries(info.src_IP)
                                    .filter(([key]) => ["subnet", "ip", "__labels", "id"].includes(key));
                                  return filtered.map(([key, value]) => (
                                    <li key={key} style={{ color: '#2a2050' }}><b style={{ color: '#6553a7' }}>{key}:</b> {String(value)}</li>
                                  ));
                                })()}
                          </ul>
                        </div>
                      )}
                      
                      {/* Destination IP */}
                      {info.dst_IP && (
                        <div style={{ marginBottom: '12px' }}>
                          <Typography variant="subtitle2" sx={{ color: '#3b2c6b', fontWeight: 700, mb: 0.5 }}>Destination IP</Typography>
                          <ul style={{ margin: 0, paddingLeft: 16 }}>
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
                          <Typography variant="subtitle2" sx={{ color: '#3b2c6b', fontWeight: 700, mb: 0.5 }}>Edge Info</Typography>
                          <ul style={{ margin: 0, paddingLeft: 16 }}>
                            {Object.entries(info.edge)
                              .map(([key, value]) => (
                                <li key={key} style={{ color: '#2a2050' }}><b style={{ color: '#6553a7' }}>{key}:</b> {String(value)}</li>
                              ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
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
