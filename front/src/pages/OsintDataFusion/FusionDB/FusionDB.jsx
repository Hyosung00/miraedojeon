import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Card, CardContent } from '@mui/material';
import { PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import ConsoleView from '../../Console/ConsoleView';
import BGPConsole from '../../../components/BGPConsole';

const FusionDB = ({ open = true, isPopup = false }) => {
  const isBGPRealtimeRunning = true;
  const [tableRunning, setTableRunning] = useState(true);
  const [tableKey, setTableKey] = useState(0);
  const [neo4jLogs, setNeo4jLogs] = useState([]);
  const donutPanelRef = useRef(null);
  const neo4jTimerRef = useRef(null);
  const neo4jEndRef = useRef(null);
  const [rirTooltip, setRirTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    label: '',
    value: 0
  });

  const collectorTypeData = [
    { label: 'FRR', value: 45, color: '#2f9e44' },
    { label: 'Quagga', value: 2, color: '#f59f00' },
    { label: 'Cisco', value: 1, color: '#4263eb' }
  ];

  const rirRegionData = [
    { label: 'ARIN', value: 19, color: '#66c2c2' },
    { label: 'APNIC', value: 9, color: '#b5b08e' },
    { label: 'LACNIC', value: 8, color: '#d9c27a' },
    { label: 'RIPE NCC', value: 8, color: '#e9b98f' },
    { label: 'AFRINIC', value: 4, color: '#b8a2b5' }
  ];

  const totalRir = rirRegionData.reduce((sum, item) => sum + item.value, 0);
  const donutSegments = rirRegionData.reduce((acc, item) => {
    const start = acc.offset;
    const fraction = item.value / totalRir;
    const length = fraction * 100;
    acc.items.push({ ...item, start, length });
    acc.offset += length;
    return acc;
  }, { offset: 0, items: [] }).items;
  const maxCollectorValue = Math.max(...collectorTypeData.map((item) => item.value));

  const handleTableStart = () => setTableRunning(true);
  const handleTableStop = () => setTableRunning(false);
  const handleTableRestart = () => {
    setTableRunning(false);
    setTimeout(() => {
      setTableKey(prev => prev + 1);
      setTableRunning(true);
    }, 100);
  };

  const showRirTooltip = (event, item) => {
    const panelRect = donutPanelRef.current?.getBoundingClientRect();
    if (!panelRect) return;

    setRirTooltip({
      visible: true,
      x: event.clientX - panelRect.left + 12,
      y: event.clientY - panelRect.top + 12,
      label: item.label,
      value: item.value
    });
  };

  const hideRirTooltip = () => {
    setRirTooltip((prev) => ({ ...prev, visible: false }));
  };

  const formatNeo4jTimestamp = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    return `${year}-${month}-${day} ${hour}:${minute}:${second}.${ms}`;
  };

  useEffect(() => {
    if (neo4jTimerRef.current) {
      clearTimeout(neo4jTimerRef.current);
      neo4jTimerRef.current = null;
    }

    if (!tableRunning) return undefined;

    const starter = `[${formatNeo4jTimestamp()}] [INFO ] Neo4j writer attached (bolt+s://eff16e19.databases.neo4j.io)`;
    setNeo4jLogs([starter]);

    const templates = [
      () => `[${formatNeo4jTimestamp()}] [INFO ] MERGE (:IP {value:$ip}) -> (:ASN {value:$asn}) relation upsert completed`,
      () => `[${formatNeo4jTimestamp()}] [INFO ] CREATE/MERGE batch committed (nodes=${Math.floor(Math.random() * 90) + 30}, rels=${Math.floor(Math.random() * 220) + 80})`,
      () => `[${formatNeo4jTimestamp()}] [INFO ] CYPHER profile: rows=${Math.floor(Math.random() * 3000) + 1000}, dbHits=${Math.floor(Math.random() * 12000) + 4000}`,
      () => `[${formatNeo4jTimestamp()}] [INFO ] Index lookup hit ratio ${(Math.random() * 10 + 89).toFixed(2)}%`,
      () => `[${formatNeo4jTimestamp()}] [INFO ] Transaction committed in ${(Math.random() * 90 + 20).toFixed(0)} ms`,
      () => `[${formatNeo4jTimestamp()}] [WARN ] Duplicate edge key detected, dedup rule applied`
    ];

    const tick = () => {
      const nextLine = templates[Math.floor(Math.random() * templates.length)]();
      setNeo4jLogs((prev) => {
        const updated = [...prev, nextLine];
        return updated.length > 240 ? updated.slice(updated.length - 240) : updated;
      });

      neo4jTimerRef.current = setTimeout(tick, Math.floor(Math.random() * 700) + 350);
    };

    neo4jTimerRef.current = setTimeout(tick, 450);

    return () => {
      if (neo4jTimerRef.current) {
        clearTimeout(neo4jTimerRef.current);
        neo4jTimerRef.current = null;
      }
    };
  }, [tableRunning, tableKey]);

  useEffect(() => {
    neo4jEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [neo4jLogs]);

  return (
    <Box sx={{ 
      width: '100%', 
      height: isPopup ? '100%' : 'calc(100vh - 132px)',
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }}>
      {/* 상단: 통합 카드 (내부 3분할) */}
      <Card sx={{
        width: '100%',
        height: { xs: '900px', sm: '720px', lg: '300px' },
        flexShrink: 0,
        bgcolor: 'background.paper',
        boxShadow: 3,
        m: 0
      }}>
        <CardContent sx={{ p: 1, height: '100%', '&:last-child': { pb: 1 }, overflow: 'hidden' }}>
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' },
              gridTemplateRows: { xs: '1fr 1fr 1fr', sm: '1fr 1fr', lg: '1fr' },
              gap: 2
            }}
          >
            <div style={{
              background: '#f0edfd',
              color: '#39306b',
              padding: '20px',
              fontFamily: "'Noto Sans KR', 'Malgun Gothic', 'Apple SD Gothic Neo', Arial, Helvetica, sans-serif",
              height: '100%',
              fontSize: '14px',
              lineHeight: '1.5',
              overflow: 'hidden',
              borderRadius: '4px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* 헤더 */}
              <div style={{
                borderBottom: '2px solid #39306b',
                paddingBottom: '10px',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                flexShrink: 0
              }}>
                <div>
                  <h2 style={{ margin: 0 }}>BGP Archive Data 수집 및 DB 저장</h2>
                  <div style={{ fontSize: '12px', opacity: 0.7 }}>
                    실시간 수집 중 ~ MongoDB - network_traffic
                  </div>
                </div>
              </div>
              {/* 콘솔 출력 영역 */}
              <div style={{ flex: 1, minHeight: 0, borderRadius: '4px', overflow: 'hidden' }}>
                <BGPConsole isRunning={isBGPRealtimeRunning} />
              </div>
            </div>

            <div style={{
              background: '#f0edfd',
              height: '100%',
              borderRadius: '4px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#1f2340', marginBottom: '12px' }}>
                Type of collector
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '6px' }}>
                {collectorTypeData.map((item) => (
                  <div key={item.label} title={`${item.label}: ${item.value}`} style={{ display: 'grid', gridTemplateColumns: '56px 1fr 36px', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <div style={{ fontSize: '0.84rem', color: '#444' }}>{item.label}</div>
                    <div style={{ height: '14px', background: '#e9e7f5', borderRadius: '999px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${(item.value / maxCollectorValue) * 100}%`,
                          background: item.color,
                          borderRadius: '999px'
                        }}
                      />
                    </div>
                    <div style={{ fontSize: '0.84rem', color: '#444', textAlign: 'right', fontWeight: 600 }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{
              background: '#f0edfd',
              height: '100%',
              borderRadius: '4px',
              padding: '14px 16px',
              display: 'grid',
              gridTemplateRows: 'auto 1fr',
              gap: '8px',
              position: 'relative'
            }}>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#1f2340' }}>
                Collectors by RIR region
              </div>
              <div ref={donutPanelRef} style={{ display: 'grid', gridTemplateColumns: '150px 1fr', alignItems: 'center', minHeight: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="128" height="128" viewBox="0 0 120 120" aria-label="RIR donut chart">
                    <circle cx="60" cy="60" r="36" fill="none" stroke="#e5e2f2" strokeWidth="18" />
                    {donutSegments.map((seg) => (
                      <circle
                        key={seg.label}
                        cx="60"
                        cy="60"
                        r="36"
                        fill="none"
                        stroke={seg.color}
                        strokeWidth="18"
                        strokeDasharray={`${seg.length} ${100 - seg.length}`}
                        strokeDashoffset={-seg.start}
                        pathLength="100"
                        transform="rotate(-90 60 60)"
                        strokeLinecap="butt"
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={(e) => showRirTooltip(e, seg)}
                        onMouseMove={(e) => showRirTooltip(e, seg)}
                        onMouseLeave={hideRirTooltip}
                      >
                        <title>{`${seg.label}: ${seg.value}`}</title>
                      </circle>
                    ))}
                    <text x="60" y="56" textAnchor="middle" fontSize="10" fill="#5a5480">Total</text>
                    <text x="60" y="70" textAnchor="middle" fontSize="16" fontWeight="700" fill="#2f2a49">{totalRir}</text>
                  </svg>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', minWidth: 0 }}>
                  {rirRegionData.map((item) => (
                    <div
                      key={item.label}
                      title={`${item.label}: ${item.value}`}
                      style={{ display: 'grid', gridTemplateColumns: '12px 1fr auto', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                      onMouseEnter={(e) => showRirTooltip(e, item)}
                      onMouseMove={(e) => showRirTooltip(e, item)}
                      onMouseLeave={hideRirTooltip}
                    >
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color, display: 'inline-block' }} />
                      <span style={{ fontSize: '0.8rem', color: '#3f3a5e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.label}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: '#3f3a5e', fontWeight: 600 }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              {rirTooltip.visible && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${rirTooltip.x}px`,
                    top: `${rirTooltip.y}px`,
                    background: 'rgba(30, 29, 41, 0.92)',
                    color: '#ffffff',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    boxShadow: '0 6px 14px rgba(0,0,0,0.22)',
                    pointerEvents: 'none',
                    zIndex: 10,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {rirTooltip.label}, {rirTooltip.value}
                </div>
              )}
            </div>
          </Box>
        </CardContent>
      </Card>

      {/* 하단: 통합 카드 (내부 2분할) */}
      <Card sx={{
        width: '100%',
        flex: 1,
        minHeight: 0,
        bgcolor: 'background.paper',
        boxShadow: 3,
        m: 0
      }}>
        <CardContent sx={{ p: 1, height: '100%', '&:last-child': { pb: 1 }, overflow: 'hidden' }}>
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gridTemplateRows: { xs: '1fr 220px', md: '1fr' },
              gap: 2
            }}
          >
            <div style={{
              background: '#f0edfd',
              color: '#39306b',
              padding: '20px',
              fontFamily: "'Noto Sans KR', 'Malgun Gothic', 'Apple SD Gothic Neo', Arial, Helvetica, sans-serif",
              height: '100%',
              fontSize: '14px',
              lineHeight: '1.5',
              overflow: 'hidden',
              borderRadius: '4px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* 헤더 */}
              <div style={{
                borderBottom: '2px solid #39306b',
                paddingBottom: '10px',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                flexShrink: 0
              }}>
                <div>
                  <h2 style={{ margin: 0 }}>융합 데이터베이스 구축</h2>
                  <div style={{ fontSize: '12px', opacity: 0.7 }}>
                    Loading ~ Neo4j - neo4j+s://eff16e19.databases.neo4j.io
                  </div>
                </div>
                {/* 제어 버튼 */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleTableStart}
                    disabled={tableRunning}
                    startIcon={<PlayCircleOutlined />}
                    sx={{ bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' }, '&:disabled': { bgcolor: '#aaa' }, fontSize: '0.75rem', py: 0.5 }}
                  >
                    Start
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleTableStop}
                    disabled={!tableRunning}
                    startIcon={<PauseCircleOutlined />}
                    sx={{ bgcolor: '#b71c1c', '&:hover': { bgcolor: '#7f0000' }, '&:disabled': { bgcolor: '#aaa' }, fontSize: '0.75rem', py: 0.5 }}
                  >
                    Stop
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleTableRestart}
                    startIcon={<ReloadOutlined />}
                    sx={{ bgcolor: '#1565c0', '&:hover': { bgcolor: '#0d47a1' }, fontSize: '0.75rem', py: 0.5 }}
                  >
                    Restart
                  </Button>
                </div>
              </div>
              {/* 테이블 출력 영역 */}
              <div style={{ flex: 1, minHeight: 0, borderRadius: '4px', overflow: 'auto' }}>
                <ConsoleView
                  key={tableKey}
                  type="fusionDB"
                  open={tableRunning}
                  isPopup={true}
                  bare={true}
                />
              </div>
            </div>

            <div
              style={{
                background: '#f0edfd',
                color: '#39306b',
                padding: '20px',
                fontFamily: "'Noto Sans KR', 'Malgun Gothic', 'Apple SD Gothic Neo', Arial, Helvetica, sans-serif",
                height: '100%',
                fontSize: '14px',
                lineHeight: '1.5',
                overflow: 'hidden',
                borderRadius: '4px',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div
                style={{
                  borderBottom: '2px solid #39306b',
                  paddingBottom: '10px',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexShrink: 0
                }}
              >
                <div>
                  <h2 style={{ margin: 0 }}>Neo4j 콘솔 모니터링</h2>
                  <div style={{ fontSize: '12px', opacity: 0.7 }}>
                    {tableRunning ? '실시간 쿼리/트랜잭션 로그 출력 중' : '중지됨'}
                  </div>
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  borderRadius: '4px',
                  overflow: 'auto',
                  background: '#f7f5ff',
                  border: '1px solid #d8d1ef',
                  padding: '10px 12px',
                  fontFamily: '"Courier New", Courier, monospace',
                  fontSize: '12px',
                  lineHeight: 1.55,
                  color: '#2f2b44'
                }}
              >
                {neo4jLogs.map((line, idx) => (
                  <div key={idx} style={{ marginBottom: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {line}
                  </div>
                ))}
                <div ref={neo4jEndRef} />
              </div>
            </div>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default FusionDB;
