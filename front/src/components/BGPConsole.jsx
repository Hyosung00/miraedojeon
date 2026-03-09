import { useState, useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';

// 타임스탬프 포맷 함수
const formatTimestamp = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`;
};

// BGP 데이터 수집 로그 메시지 생성 함수 (현재 시간 기준)
const generateLogMessages = () => {
  const startTime = new Date();
  
  const getTimestamp = (delayMs) => {
    const logTime = new Date(startTime.getTime() + delayMs);
    return formatTimestamp(logTime);
  };

  const currentYear = startTime.getFullYear();
  const currentMonth = String(startTime.getMonth() + 1).padStart(2, '0');
  
  return [
    { text: 'C:\\Projects\\bgp-collector> bgp_archive_collector.exe --source routeviews,ris --start 2025-01-01T00:00:00Z', color: '#333333', delay: 0 },
    { text: '', color: '#333333', delay: 200 },
    { text: `[${getTimestamp(400)}] [INFO ] BGP Archive Collector v1.2.3 starting...`, color: '#008000', delay: 400 },
    { text: `[${getTimestamp(600)}] [INFO ] Loading config from .\\config\\collector.yml`, color: '#333333', delay: 600 },
    { text: `[${getTimestamp(800)}] [INFO ] Time window     : 2024-01-01 00:00:00 ~ 2024-12-31 01:00:00 (UTC)`, color: '#333333', delay: 800 },
    { text: `[${getTimestamp(1000)}] [INFO ] Sources        : routeviews, ris`, color: '#333333', delay: 1000 },
    { text: `[${getTimestamp(1200)}] [INFO ] Target DB      : MongoDB (network_traffic)`, color: '#333333', delay: 1200 },
    { text: `[${getTimestamp(1400)}] [INFO ] Testing database connectivity...`, color: '#333333', delay: 1400 },
    { text: `[${getTimestamp(1800)}] [INFO ] DB connection OK (latency 12ms)`, color: '#008000', delay: 1800 },
    { text: `[${getTimestamp(2000)}] [INFO ] Initializing schema migration...`, color: '#333333', delay: 2000 },
    { text: `[${getTimestamp(2400)}] [INFO ] Schema up-to-date (version 20250105_01)`, color: '#008000', delay: 2400 },
    { text: '', color: '#333333', delay: 2600 },
    { text: `[${getTimestamp(2800)}] [INFO ] Fetching MRT file list from RouteViews (route-views2)...`, color: '#333333', delay: 2800 },
    { text: `[${getTimestamp(3200)}] [INFO ]  -> Found 4 UPDATE dump files, 1 RIB snapshot`, color: '#cc6600', delay: 3200 },
    { text: `[${getTimestamp(3400)}] [INFO ] Fetching MRT file list from RIPE RIS (rrc00)...`, color: '#333333', delay: 3400 },
    { text: `[${getTimestamp(3800)}] [INFO ]  -> Found 3 UPDATE dump files, 1 RIB snapshot`, color: '#cc6600', delay: 3800 },
    { text: '', color: '#333333', delay: 4000 },
    { text: `[${getTimestamp(4200)}] [INFO ] Starting parallel downloader (max 3 jobs)...`, color: '#333333', delay: 4200 },
    { text: `[${getTimestamp(4600)}] [INFO ] [DL-001] routeviews/${currentYear}.${currentMonth}/updates.20250101.0000.gz (12.4 MB) queued`, color: '#0066cc', delay: 4600 },
    { text: `[${getTimestamp(4800)}] [INFO ] [DL-002] routeviews/${currentYear}.${currentMonth}/updates.20250101.0015.gz (11.1 MB) queued`, color: '#0066cc', delay: 4800 },
    { text: `[${getTimestamp(5000)}] [INFO ] [DL-003] ris/rrc00/${currentYear}.${currentMonth}/updates.20250101.0000.gz (9.7 MB) queued`, color: '#0066cc', delay: 5000 },
    { text: `[${getTimestamp(5400)}] [INFO ] [DL-001] Downloading...  35% (4.3 MB / 12.4 MB)`, color: '#0066cc', delay: 5400 },
    { text: `[${getTimestamp(5800)}] [INFO ] [DL-001] Downloading...  82% (10.2 MB / 12.4 MB)`, color: '#0066cc', delay: 5800 },
    { text: `[${getTimestamp(6200)}] [INFO ] [DL-001] Completed (12.4 MB, 3.9s, avg 3.1 MB/s)`, color: '#008000', delay: 6200 },
    { text: `[${getTimestamp(6400)}] [INFO ] [DL-004] ris/rrc00/${currentYear}.${currentMonth}/bview.20250101.0000.gz (45.8 MB) queued`, color: '#0066cc', delay: 6400 },
    { text: `[${getTimestamp(6800)}] [INFO ] [DL-002] Completed (11.1 MB, 5.6s, avg 2.0 MB/s)`, color: '#008000', delay: 6800 },
    { text: `[${getTimestamp(7000)}] [INFO ] [DL-003] Completed (9.7 MB, 5.8s, avg 1.7 MB/s)`, color: '#008000', delay: 7000 },
    { text: `[${getTimestamp(7600)}] [INFO ] [DL-004] Completed (45.8 MB, 6.4s, avg 7.1 MB/s)`, color: '#008000', delay: 7600 },
    { text: '', color: '#333333', delay: 7800 },
    { text: `[${getTimestamp(8000)}] [INFO ] All MRT files downloaded. Starting parsing pipeline...`, color: '#333333', delay: 8000 },
    { text: `[${getTimestamp(8200)}] [INFO ] Launching worker pool: 4 parser threads, 2 DB writer threads`, color: '#333333', delay: 8200 },
    { text: `[${getTimestamp(8600)}] [INFO ] [PARSER-01] Reading updates.20250101.0000.gz`, color: '#007799', delay: 8600 },
    { text: `[${getTimestamp(8800)}] [INFO ] [PARSER-02] Reading updates.20250101.0015.gz`, color: '#007799', delay: 8800 },
    { text: `[${getTimestamp(9000)}] [INFO ] [PARSER-03] Reading ris-rrc00-updates.20250101.0000.gz`, color: '#007799', delay: 9000 },
    { text: `[${getTimestamp(9400)}] [INFO ] [PARSER-01] MRT header parsed, stream starts at ts=1735689600`, color: '#007799', delay: 9400 },
    { text: `[${getTimestamp(9800)}] [INFO ] [PARSER-01] Decoded 10,000 BGP UPDATE messages (RIB=0/U=10000, 0.23s)`, color: '#007799', delay: 9800 },
    { text: `[${getTimestamp(10000)}] [INFO ] [PARSER-02] Decoded 7,812 BGP UPDATE messages (RIB=0/U=7812, 0.19s)`, color: '#007799', delay: 10000 },
    { text: `[${getTimestamp(10200)}] [INFO ] [PARSER-03] Decoded 9,104 BGP UPDATE messages (RIB=0/U=9104, 0.21s)`, color: '#007799', delay: 10200 },
    { text: '', color: '#333333', delay: 10400 },
    { text: `[${getTimestamp(10600)}] [INFO ] [FILTER ] Applying prefix / ASN filters...`, color: '#333333', delay: 10600 },
    { text: `[${getTimestamp(11000)}] [INFO ] [FILTER ]   -> Prefix filter: 0.0.0.0/0, 10.0.0.0/8, 192.168.0.0/16`, color: '#cc6600', delay: 11000 },
    { text: `[${getTimestamp(11200)}] [INFO ] [FILTER ]   -> ASN watchlist: 64512, 64513, 64514`, color: '#cc6600', delay: 11200 },
    { text: `[${getTimestamp(11600)}] [INFO ] [FILTER ] Kept 12,341 / 26,916 elems (45.8%)`, color: '#008000', delay: 11600 },
    { text: '', color: '#333333', delay: 11800 },
    { text: `[${getTimestamp(12000)}] [INFO ] [DB-WRITER-01] Inserting batch (size=2,000) into MongoDB...`, color: '#cc0066', delay: 12000 },
    { text: `[${getTimestamp(12400)}] [INFO ] [DB-WRITER-01] Committed batch (rows=2,000, elapsed=0.54s)`, color: '#cc0066', delay: 12400 },
    { text: `[${getTimestamp(12600)}] [INFO ] [DB-WRITER-02] Inserting batch (size=2,000) into MongoDB...`, color: '#cc0066', delay: 12600 },
    { text: `[${getTimestamp(13000)}] [INFO ] [DB-WRITER-02] Committed batch (rows=2,000, elapsed=0.49s)`, color: '#cc0066', delay: 13000 },
    { text: `[${getTimestamp(13400)}] [INFO ] [DB-WRITER-01] Inserting batch (size=2,000) into MongoDB...`, color: '#cc0066', delay: 13400 },
    { text: `[${getTimestamp(13800)}] [INFO ] [DB-WRITER-01] Committed batch (rows=2,000, elapsed=0.49s)`, color: '#cc0066', delay: 13800 },
    { text: `[${getTimestamp(14200)}] [INFO ] [DB-WRITER-02] Inserting final batch (size=2,341) into MongoDB...`, color: '#cc0066', delay: 14200 },
    { text: `[${getTimestamp(14600)}] [INFO ] [DB-WRITER-02] Committed batch (rows=2,341, elapsed=0.56s)`, color: '#cc0066', delay: 14600 },
    { text: '', color: '#333333', delay: 14800 },
    { text: `[${getTimestamp(15000)}] [INFO ] [STATS] Parsed records     : 26,916`, color: '#cc6600', delay: 15000 },
    { text: `[${getTimestamp(15200)}] [INFO ] [STATS] Stored updates     : 12,341`, color: '#cc6600', delay: 15200 },
    { text: `[${getTimestamp(15400)}] [INFO ] [STATS] Unique prefixes    : 3,287`, color: '#cc6600', delay: 15400 },
    { text: `[${getTimestamp(15600)}] [INFO ] [STATS] Unique origin ASNs : 412`, color: '#cc6600', delay: 15600 },
    { text: `[${getTimestamp(15800)}] [INFO ] [STATS] Total processing   : 17.3s`, color: '#cc6600', delay: 15800 },
    { text: '', color: '#333333', delay: 16000 },
    { text: `[${getTimestamp(16200)}] [INFO ] BGP archive collection finished successfully.`, color: '#008000', delay: 16200 },
    { text: `[${getTimestamp(16600)}] [INFO ] Press any key to close this window...`, color: '#888888', delay: 16600 }
  ];
};

export default function BGPConsole({ onNavigate }) {
  const [logs, setLogs] = useState([]);
  const logEndRef = useRef(null);

  // 자동 스크롤
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [logs]);

  // 컴포넌트 마운트 시 로그 자동 표시
  useEffect(() => {
    const LOG_MESSAGES = generateLogMessages();
    LOG_MESSAGES.forEach((log) => {
      setTimeout(() => {
        setLogs((prev) => [...prev, log]);
      }, log.delay / 3);
    });
  }, []);

  return (
    <Box
      sx={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#F0EDFD',
        overflow: 'hidden'
      }}
    >
      {/* 콘솔 출력 영역 */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 2,
          fontFamily: '"Courier New", Courier, monospace',
          fontSize: '0.75rem',
          lineHeight: 1.6,
          bgcolor: '#F0EDFD',
          color: '#333333',
          '&::-webkit-scrollbar': {
            width: '8px'
          },
          '&::-webkit-scrollbar-track': {
            bgcolor: '#F0EDFD'
          },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: '#C5BEE6',
            borderRadius: '4px',
            '&:hover': {
              bgcolor: '#B0A8D9'
            }
          }
        }}
      >
        {logs.map((log, index) => (
          <Box
            key={index}
            sx={{
              mb: 0.5,
              color: log.color,
              animation: 'fadeIn 0.3s ease-in',
              '@keyframes fadeIn': {
                from: { opacity: 0, transform: 'translateX(-10px)' },
                to: { opacity: 1, transform: 'translateX(0)' }
              }
            }}
          >
            {log.text}
          </Box>
        ))}
        
        <div ref={logEndRef} />
      </Box>
    </Box>
  );
}
