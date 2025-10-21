import React from "react";

import { IconButton } from '@mui/material';
import { ClusterOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

function TargetLog({ logs, selectedNode }) {
  const safeLogs = Array.isArray(logs) ? logs : [];
  const navigate = useNavigate();
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
            <div key={i} style={{
              margin: '8px 0',
              background: 'rgba(255,255,255,0.6)',
              border: '1px solid rgba(124,58,237,0.18)',
              borderRadius: 10,
              padding: '12px',
              color: '#222',
              position: 'relative'
            }}>
              {/* 대응 효과 분석 아이콘 버튼 (상단 작은 아이콘, selectedNode 없으면 disabled) */}
              <IconButton
                size="small"
                aria-label="대응 효과 분석으로 이동"
                title="대응 효과 분석"
                disabled={!selectedNode}
                onClick={() => {
                  if (!selectedNode) return;
                  navigate('/ActiveResponse/responseeffectvisualization', { state: { selectedNode, dbInfo: info } });
                }}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  color: selectedNode ? '#39306b' : '#ccc',
                  bgcolor: selectedNode ? 'rgba(57,48,107,0.08)' : 'rgba(200,200,200,0.12)',
                  border: '1px solid #bdb4e6',
                  cursor: selectedNode ? 'pointer' : 'not-allowed',
                  '&:hover': selectedNode ? {
                    bgcolor: 'rgba(57,48,107,0.18)',
                    color: '#2a1f5a'
                  } : {},
                  width: 24,
                  height: 24
                }}
              >
                <ClusterOutlined style={{ fontSize: 13 }} />
              </IconButton>
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
