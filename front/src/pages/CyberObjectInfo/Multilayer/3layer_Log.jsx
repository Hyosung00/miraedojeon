import React, { memo } from "react";
import { Card, CardContent, Typography } from '@mui/material';

const InternalLog = memo(({ eventLogs = [] }) => {
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
                      {(() => {
                        const srcLabel = String(info?.src_IP?.__labels?.[0] || '').toLowerCase();
                        const srcIsPhysical = srcLabel === 'physical';
                        const srcIsLogical = srcLabel === 'logical';
                        if (srcIsPhysical) {
                          return (
                            <>
                              {/* Src Node (physical) */}
                              {info.src_IP && (
                                <div style={{ marginBottom: '12px' }}>
                                  <Typography variant="subtitle2" sx={{ color: '#3b2c6b', fontWeight: 700, mb: 0.5 }}>Src Node</Typography>
                                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                                    {[
                                      ['name', info.src_IP.name],
                                      ['type', info.src_IP.type],
                                      ['ip', info.src_IP.ip],
                                      ['subnet', info.src_IP.subnet],
                                      ['dns', info.src_IP.dns],
                                      ['gateway', info.src_IP.gateway]
                                    ].filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => (
                                      <li key={k} style={{ color: '#2a2050' }}><b style={{ color: '#6553a7' }}>{k}:</b> {String(v)}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Dst Node (logical-like) */}
                              {info.dst_IP && (
                                <div style={{ marginBottom: '12px' }}>
                                  <Typography variant="subtitle2" sx={{ color: '#3b2c6b', fontWeight: 700, mb: 0.5 }}>Dst Node</Typography>
                                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                                    {[
                                      ['name', info.dst_IP.name],
                                      ['description', info.dst_IP.description],
                                      ['cve', info.dst_IP.cve]
                                    ].filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => (
                                      <li key={k} style={{ color: '#2a2050' }}><b style={{ color: '#6553a7' }}>{k}:</b> {String(v)}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Edge (rel, SrcID, targetID) */}
                              {info.edge && (
                                <div>
                                  <Typography variant="subtitle2" sx={{ color: '#3b2c6b', fontWeight: 700, mb: 0.5 }}>Edge Info</Typography>
                                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                                    {[
                                      ['rel', info.edge.rel || info.edge.kind],
                                      ['SrcID', info.edge.sourceIP],
                                      ['TargetID', info.edge.targetIP]
                                    ].map(([k, v]) => {
                                      const display = Array.isArray(v) ? v.join(', ') : String(v);
                                      return (
                                        <li key={k} style={{ color: '#2a2050' }}><b style={{ color: '#6553a7' }}>{k}:</b> {display}</li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              )}
                            </>
                          );
                        }

                        // Logical src mapping
                        if (srcIsLogical) {
                          return (
                            <>
                              {/* Src Node (logical) */}
                              {info.src_IP && (
                                <div style={{ marginBottom: '12px' }}>
                                  <Typography variant="subtitle2" sx={{ color: '#3b2c6b', fontWeight: 700, mb: 0.5 }}>Src Node</Typography>
                                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                                    {[
                                      ['name', info.src_IP.name],
                                      ['description', info.src_IP.description],
                                      ['cve', info.src_IP.cve]
                                    ].filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => {
                                      const display = Array.isArray(v) ? v.join(', ') : String(v);
                                      return (
                                        <li key={k} style={{ color: '#2a2050' }}><b style={{ color: '#6553a7' }}>{k}:</b> {display}</li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              )}

                              {/* Dst Node (logical) - KV vs Entity 구분 */}
                              {info.dst_IP && (
                                <div style={{ marginBottom: '12px' }}>
                                  <Typography variant="subtitle2" sx={{ color: '#3b2c6b', fontWeight: 700, mb: 0.5 }}>Dst Node</Typography>
                                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                                    {(() => {
                                      const isKV = info.dst_IP.key !== undefined || info.dst_IP.value !== undefined;
                                      const pairs = isKV
                                        ? [
                                            ['id', info.dst_IP.id],
                                            ['key', info.dst_IP.key],
                                            ['value', info.dst_IP.value]
                                          ]
                                        : [
                                            ['name', info.dst_IP.name],
                                            ['description', info.dst_IP.description],
                                            ['cve', info.dst_IP.cve]
                                          ];
                                      return pairs
                                        .filter(([, v]) => v !== undefined && v !== null && v !== '')
                                        .map(([k, v]) => {
                                          const display = Array.isArray(v) ? v.join(', ') : String(v);
                                          return (
                                            <li key={k} style={{ color: '#2a2050' }}><b style={{ color: '#6553a7' }}>{k}:</b> {display}</li>
                                          );
                                        });
                                    })()}
                                  </ul>
                                </div>
                              )}

                              {/* Edge (rel, SrcID, targetID) */}
                              {info.edge && (
                                <div>
                                  <Typography variant="subtitle2" sx={{ color: '#3b2c6b', fontWeight: 700, mb: 0.5 }}>Edge Info</Typography>
                                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                                    {[
                                      ['rel', info.edge.rel || info.edge.kind],
                                      ['SrcID', info.edge.sourceIP],
                                      ['TargetID', info.edge.targetIP]
                                    ].map(([k, v]) => {
                                      const display = Array.isArray(v) ? v.join(', ') : String(v);
                                      return (
                                        <li key={k} style={{ color: '#2a2050' }}><b style={{ color: '#6553a7' }}>{k}:</b> {display}</li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              )}
                            </>
                          );
                        }

                        // Default: show minimal IDs when type unknown
                        return (
                          <>
                            {info.src_IP && (
                              <div style={{ marginBottom: '12px' }}>
                                <Typography variant="subtitle2" sx={{ color: '#3b2c6b', fontWeight: 700, mb: 0.5 }}>Src Node</Typography>
                                <ul style={{ margin: 0, paddingLeft: 16 }}>
                                  {[['id', info.src_IP.id]].map(([k, v]) => (
                                    <li key={k} style={{ color: '#2a2050' }}><b style={{ color: '#6553a7' }}>{k}:</b> {String(v)}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {info.dst_IP && (
                              <div style={{ marginBottom: '12px' }}>
                                <Typography variant="subtitle2" sx={{ color: '#3b2c6b', fontWeight: 700, mb: 0.5 }}>Dst Node</Typography>
                                <ul style={{ margin: 0, paddingLeft: 16 }}>
                                  {[['id', info.dst_IP.id]].map(([k, v]) => {
                                    const display = Array.isArray(v) ? v.join(', ') : String(v);
                                    return (
                                      <li key={k} style={{ color: '#2a2050' }}><b style={{ color: '#6553a7' }}>{k}:</b> {display}</li>
                                    );
                                  })}
                                </ul>
                              </div>
                            )}
                            {info.edge && (
                              <div>
                                <Typography variant="subtitle2" sx={{ color: '#3b2c6b', fontWeight: 700, mb: 0.5 }}>Edge Info</Typography>
                                <ul style={{ margin: 0, paddingLeft: 16 }}>
                                  {[
                                    ['rel', info.edge.rel || info.edge.kind],
                                    ['SrcID', info.edge.sourceIP],
                                    ['TargetID', info.edge.targetIP]
                                  ].map(([k, v]) => {
                                    const display = Array.isArray(v) ? v.join(', ') : String(v);
                                    return (
                                      <li key={k} style={{ color: '#2a2050' }}><b style={{ color: '#6553a7' }}>{k}:</b> {display}</li>
                                    );
                                  })}
                                </ul>
                              </div>
                            )}
                          </>
                        );
                      })()}
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
});

InternalLog.displayName = 'InternalLog';

export default InternalLog;
