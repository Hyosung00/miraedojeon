import React from "react";
import { Card, CardContent, Typography, IconButton } from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { useNavigate } from 'react-router-dom';

const SECTION_LABELS = {
  src_IP: '출발지 IP',
  dst_IP: '목적지 IP',
  edge: '연결 정보'
};

const FIELD_LABELS = {
  ip: 'IP 주소',
  subnet: '서브넷',
  gateway: '게이트웨이',
  __labels: '장비 유형',
  id: '식별자',
  sourceIP: '출발지 ID',
  targetIP: '목적지 ID',
  type: '링크 유형',
  count: '연결 수'
};

const KIND_LABELS = {
  core: '코어',
  firewall: '방화벽',
  router: '라우터',
  l3switch: 'L3 스위치',
  switchrouter: '스위치 라우터',
  layer3: '레이어 3 장비',
  switch: '스위치',
  l2switch: 'L2 스위치',
  hub: '허브',
  server: '서버',
  host: '호스트',
  default: '기본 장비'
};

const formatFieldValue = (key, value) => {
  if (Array.isArray(value)) {
    if (key === '__labels') {
      return value.map((item) => KIND_LABELS[item] || item).join(', ');
    }
    return value.join(', ');
  }

  if (value && typeof value === 'object') {
    return JSON.stringify(value);
  }

  if (key === '__labels') {
    return KIND_LABELS[value] || String(value);
  }

  if (key === 'type') {
    const typeLabels = {
      physical: '물리',
      logical: '논리'
    };
    return typeLabels[value] || String(value);
  }

  return String(value);
};

const renderInfoList = (info, visibleKeys) => (
  <ul style={{ margin: 0, paddingLeft: 16, marginTop: 6 }}>
    {Object.entries(info)
      .filter(([key, value]) => visibleKeys.includes(key) && value !== undefined && value !== null && value !== '')
      .map(([key, value]) => (
        <li key={key} style={{ color: '#2a2050' }}>
          <b style={{ color: '#6553a7' }}>{FIELD_LABELS[key] || key}:</b> {formatFieldValue(key, value)}
        </li>
      ))}
  </ul>
);

function InternalLog({ eventLogs = [] }) {
  const navigate = useNavigate();

  return (
    <Card sx={{
      minWidth: 300,
      width: 300,
      maxWidth: 300,
      bgcolor: '#f0edfd',
      color: '#000',
      border: '1px solid #d0c9f0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      borderRadius: '20px',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      height: '100%',
      minHeight: 0,
      overflow: 'hidden'
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
                <div key={i} style={{ margin: '8px 0', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(124,58,237,0.18)', borderRadius: 10, padding: '12px', color: '#2a2050', position: 'relative' }}>
                  {/* 내부망 이동 아이콘 */}
                  <IconButton
                    size="small"
                    aria-label="타겟 대시보드로 이동"
                    title="타겟 대시보드로 이동"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/target/targetDashboard');
                    }}
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      color: '#7c3aed',
                      bgcolor: 'rgba(124,58,237,0.1)',
                      border: '1px solid rgba(124,58,237,0.3)',
                      '&:hover': {
                        bgcolor: 'rgba(124,58,237,0.2)',
                        color: '#9333ea'
                      },
                      width: 24,
                      height: 24
                    }}
                  >
                    <AccountTreeIcon sx={{ fontSize: 12 }} />
                  </IconButton>
                  
                  {/* Source IP */}
                  {info.src_IP && (
                    <div style={{ marginBottom: '12px' }}>
                      <strong style={{ color: '#3b2c6b' }}>{SECTION_LABELS.src_IP}</strong>
                      {renderInfoList(info.src_IP, ['ip', 'subnet', 'gateway', '__labels', 'id'])}
                    </div>
                  )}
                  
                  {/* Destination IP */}
                  {info.dst_IP && (
                    <div style={{ marginBottom: '12px' }}>
                      <strong style={{ color: '#3b2c6b' }}>{SECTION_LABELS.dst_IP}</strong>
                      {renderInfoList(info.dst_IP, ['ip', 'subnet', 'gateway', '__labels', 'id'])}
                    </div>
                  )}
                  
                  {/* Edge Info */}
                  {info.edge && (
                    <div>
                      <strong style={{ color: '#3b2c6b' }}>{SECTION_LABELS.edge}</strong>
                      {renderInfoList(info.edge, ['sourceIP', 'targetIP', 'type'])}
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
