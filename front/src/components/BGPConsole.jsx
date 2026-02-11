import { useState, useEffect, useRef } from 'react';
import { Box, Button, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import RefreshIcon from '@mui/icons-material/Refresh';

// BGP 데이터 수집 로그 메시지
const LOG_MESSAGES = [
  { text: 'C:\\Projects\\bgp-collector> bgp_archive_collector.exe --source routeviews,ris --start 2025-01-01T00:00:00Z', color: '#333333', delay: 0 },
  { text: '', color: '#333333', delay: 200 },
  { text: '[2025-01-10 09:13:21.004] [INFO ] BGP Archive Collector v1.2.3 starting...', color: '#008000', delay: 400 },
  { text: '[2025-01-10 09:13:21.017] [INFO ] Loading config from .\\config\\collector.yml', color: '#333333', delay: 600 },
  { text: '[2025-01-10 09:13:21.032] [INFO ] Time window     : 2025-01-01 00:00:00 ~ 2025-01-01 01:00:00 (UTC)', color: '#333333', delay: 800 },
  { text: '[2025-01-10 09:13:21.033] [INFO ] Sources        : routeviews, ris', color: '#333333', delay: 1000 },
  { text: '[2025-01-10 09:13:21.034] [INFO ] Target DB      : MongoDB (network_traffic)', color: '#333333', delay: 1200 },
  { text: '[2025-01-10 09:13:21.048] [INFO ] Testing database connectivity...', color: '#333333', delay: 1400 },
  { text: '[2025-01-10 09:13:21.097] [INFO ] DB connection OK (latency 12ms)', color: '#008000', delay: 1800 },
  { text: '[2025-01-10 09:13:21.111] [INFO ] Initializing schema migration...', color: '#333333', delay: 2000 },
  { text: '[2025-01-10 09:13:21.384] [INFO ] Schema up-to-date (version 20250105_01)', color: '#008000', delay: 2400 },
  { text: '', color: '#333333', delay: 2600 },
  { text: '[2025-01-10 09:13:21.412] [INFO ] Fetching MRT file list from RouteViews (route-views2)...', color: '#333333', delay: 2800 },
  { text: '[2025-01-10 09:13:22.034] [INFO ]  -> Found 4 UPDATE dump files, 1 RIB snapshot', color: '#cc6600', delay: 3200 },
  { text: '[2025-01-10 09:13:22.041] [INFO ] Fetching MRT file list from RIPE RIS (rrc00)...', color: '#333333', delay: 3400 },
  { text: '[2025-01-10 09:13:22.619] [INFO ]  -> Found 3 UPDATE dump files, 1 RIB snapshot', color: '#cc6600', delay: 3800 },
  { text: '', color: '#333333', delay: 4000 },
  { text: '[2025-01-10 09:13:22.641] [INFO ] Starting parallel downloader (max 3 jobs)...', color: '#333333', delay: 4200 },
  { text: '[2025-01-10 09:13:23.102] [INFO ] [DL-001] routeviews/2025.01/updates.20250101.0000.gz (12.4 MB) queued', color: '#0066cc', delay: 4600 },
  { text: '[2025-01-10 09:13:23.104] [INFO ] [DL-002] routeviews/2025.01/updates.20250101.0015.gz (11.1 MB) queued', color: '#0066cc', delay: 4800 },
  { text: '[2025-01-10 09:13:23.107] [INFO ] [DL-003] ris/rrc00/2025.01/updates.20250101.0000.gz (9.7 MB) queued', color: '#0066cc', delay: 5000 },
  { text: '[2025-01-10 09:13:24.889] [INFO ] [DL-001] Downloading...  35% (4.3 MB / 12.4 MB)', color: '#0066cc', delay: 5400 },
  { text: '[2025-01-10 09:13:26.417] [INFO ] [DL-001] Downloading...  82% (10.2 MB / 12.4 MB)', color: '#0066cc', delay: 5800 },
  { text: '[2025-01-10 09:13:27.095] [INFO ] [DL-001] Completed (12.4 MB, 3.9s, avg 3.1 MB/s)', color: '#008000', delay: 6200 },
  { text: '[2025-01-10 09:13:27.102] [INFO ] [DL-004] ris/rrc00/2025.01/bview.20250101.0000.gz (45.8 MB) queued', color: '#0066cc', delay: 6400 },
  { text: '[2025-01-10 09:13:28.781] [INFO ] [DL-002] Completed (11.1 MB, 5.6s, avg 2.0 MB/s)', color: '#008000', delay: 6800 },
  { text: '[2025-01-10 09:13:29.004] [INFO ] [DL-003] Completed (9.7 MB, 5.8s, avg 1.7 MB/s)', color: '#008000', delay: 7000 },
  { text: '[2025-01-10 09:13:33.612] [INFO ] [DL-004] Completed (45.8 MB, 6.4s, avg 7.1 MB/s)', color: '#008000', delay: 7600 },
  { text: '', color: '#333333', delay: 7800 },
  { text: '[2025-01-10 09:13:33.645] [INFO ] All MRT files downloaded. Starting parsing pipeline...', color: '#333333', delay: 8000 },
  { text: '[2025-01-10 09:13:33.656] [INFO ] Launching worker pool: 4 parser threads, 2 DB writer threads', color: '#333333', delay: 8200 },
  { text: '[2025-01-10 09:13:33.889] [INFO ] [PARSER-01] Reading updates.20250101.0000.gz', color: '#007799', delay: 8600 },
  { text: '[2025-01-10 09:13:33.901] [INFO ] [PARSER-02] Reading updates.20250101.0015.gz', color: '#007799', delay: 8800 },
  { text: '[2025-01-10 09:13:33.912] [INFO ] [PARSER-03] Reading ris-rrc00-updates.20250101.0000.gz', color: '#007799', delay: 9000 },
  { text: '[2025-01-10 09:13:34.027] [INFO ] [PARSER-01] MRT header parsed, stream starts at ts=1735689600', color: '#007799', delay: 9400 },
  { text: '[2025-01-10 09:13:34.291] [INFO ] [PARSER-01] Decoded 10,000 BGP UPDATE messages (RIB=0/U=10000, 0.23s)', color: '#007799', delay: 9800 },
  { text: '[2025-01-10 09:13:34.293] [INFO ] [PARSER-02] Decoded 7,812 BGP UPDATE messages (RIB=0/U=7812, 0.19s)', color: '#007799', delay: 10000 },
  { text: '[2025-01-10 09:13:34.311] [INFO ] [PARSER-03] Decoded 9,104 BGP UPDATE messages (RIB=0/U=9104, 0.21s)', color: '#007799', delay: 10200 },
  { text: '', color: '#333333', delay: 10400 },
  { text: '[2025-01-10 09:13:34.345] [INFO ] [FILTER ] Applying prefix / ASN filters...', color: '#333333', delay: 10600 },
  { text: '[2025-01-10 09:13:34.612] [INFO ] [FILTER ]   -> Prefix filter: 0.0.0.0/0, 10.0.0.0/8, 192.168.0.0/16', color: '#cc6600', delay: 11000 },
  { text: '[2025-01-10 09:13:34.614] [INFO ] [FILTER ]   -> ASN watchlist: 64512, 64513, 64514', color: '#cc6600', delay: 11200 },
  { text: '[2025-01-10 09:13:35.041] [INFO ] [FILTER ] Kept 12,341 / 26,916 elems (45.8%)', color: '#008000', delay: 11600 },
  { text: '', color: '#333333', delay: 11800 },
  { text: '[2025-01-10 09:13:35.092] [INFO ] [DB-WRITER-01] Inserting batch (size=2,000) into MongoDB...', color: '#cc0066', delay: 12000 },
  { text: '[2025-01-10 09:13:35.642] [INFO ] [DB-WRITER-01] Committed batch (rows=2,000, elapsed=0.54s)', color: '#cc0066', delay: 12400 },
  { text: '[2025-01-10 09:13:35.713] [INFO ] [DB-WRITER-02] Inserting batch (size=2,000) into MongoDB...', color: '#cc0066', delay: 12600 },
  { text: '[2025-01-10 09:13:36.204] [INFO ] [DB-WRITER-02] Committed batch (rows=2,000, elapsed=0.49s)', color: '#cc0066', delay: 13000 },
  { text: '[2025-01-10 09:13:36.812] [INFO ] [DB-WRITER-01] Inserting batch (size=2,000) into MongoDB...', color: '#cc0066', delay: 13400 },
  { text: '[2025-01-10 09:13:37.305] [INFO ] [DB-WRITER-01] Committed batch (rows=2,000, elapsed=0.49s)', color: '#cc0066', delay: 13800 },
  { text: '[2025-01-10 09:13:38.019] [INFO ] [DB-WRITER-02] Inserting final batch (size=2,341) into MongoDB...', color: '#cc0066', delay: 14200 },
  { text: '[2025-01-10 09:13:38.587] [INFO ] [DB-WRITER-02] Committed batch (rows=2,341, elapsed=0.56s)', color: '#cc0066', delay: 14600 },
  { text: '', color: '#333333', delay: 14800 },
  { text: '[2025-01-10 09:13:38.601] [INFO ] [STATS] Parsed records     : 26,916', color: '#cc6600', delay: 15000 },
  { text: '[2025-01-10 09:13:38.602] [INFO ] [STATS] Stored updates     : 12,341', color: '#cc6600', delay: 15200 },
  { text: '[2025-01-10 09:13:38.603] [INFO ] [STATS] Unique prefixes    : 3,287', color: '#cc6600', delay: 15400 },
  { text: '[2025-01-10 09:13:38.604] [INFO ] [STATS] Unique origin ASNs : 412', color: '#cc6600', delay: 15600 },
  { text: '[2025-01-10 09:13:38.605] [INFO ] [STATS] Total processing   : 17.3s', color: '#cc6600', delay: 15800 },
  { text: '', color: '#333333', delay: 16000 },
  { text: '[2025-01-10 09:13:38.617] [INFO ] BGP archive collection finished successfully.', color: '#008000', delay: 16200 },
  { text: '[2025-01-10 09:13:38.618] [INFO ] Press any key to close this window...', color: '#888888', delay: 16600 }
];

export default function BGPConsole({ onNavigate }) {
  const [logs, setLogs] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const logEndRef = useRef(null);
  const timeoutRefs = useRef([]);

  // 자동 스크롤
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // 애니메이션 시작
  const startAnimation = () => {
    setLogs([]);
    setIsRunning(true);
    setIsPaused(false);

    LOG_MESSAGES.forEach((log, index) => {
      const timeoutId = setTimeout(() => {
        if (!isPaused) {
          setLogs((prev) => [...prev, log]);
        }
      }, log.delay / 3);
      timeoutRefs.current.push(timeoutId);
    });

    // 마지막 메시지 후 완료 처리
    const finalTimeout = setTimeout(() => {
      setIsRunning(false);
    }, (LOG_MESSAGES[LOG_MESSAGES.length - 1].delay + 500) / 3);
    timeoutRefs.current.push(finalTimeout);
  };

  // 애니메이션 정지
  const stopAnimation = () => {
    timeoutRefs.current.forEach(clearTimeout);
    timeoutRefs.current = [];
    setIsRunning(false);
    setIsPaused(true);
  };

  // 리셋
  const resetAnimation = () => {
    stopAnimation();
    setLogs([]);
    setIsPaused(false);
  };

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(clearTimeout);
    };
  }, []);

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#F0EDFD',
        borderRadius: 1,
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* 제목과 이동하기 버튼 */}
      <Box
        sx={{
          position: 'absolute',
          top: 8,
          left: 12,
          right: 12,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 10
        }}
      >
        <Typography variant="h4" color="text.secondary" fontWeight="bold">
          💾 BGP Archive Data 수집 및 DB 저장
        </Typography>
        {onNavigate && (
          <Button
            size="small"
            variant="outlined"
            onClick={onNavigate}
            sx={{ flexShrink: 0 }}
          >
            이동하기
          </Button>
        )}
      </Box>

      {/* 컨트롤 버튼 */}
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          p: 1,
          pt: 6,
          bgcolor: '#F0EDFD',
          borderBottom: '1px solid #D0C9F5'
        }}
      >
        <Button
          size="small"
          variant="contained"
          color="success"
          startIcon={<PlayArrowIcon />}
          onClick={startAnimation}
          disabled={isRunning}
          sx={{ minWidth: '80px', fontSize: '0.7rem' }}
        >
          Start
        </Button>
        <Button
          size="small"
          variant="contained"
          color="error"
          startIcon={<StopIcon />}
          onClick={stopAnimation}
          disabled={!isRunning}
          sx={{ minWidth: '80px', fontSize: '0.7rem' }}
        >
          Stop
        </Button>
        <Button
          size="small"
          variant="contained"
          color="info"
          startIcon={<RefreshIcon />}
          onClick={resetAnimation}
          sx={{ minWidth: '80px', fontSize: '0.7rem' }}
        >
          Reset
        </Button>
      </Box>

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
        {logs.length === 0 && !isRunning && (
          <Typography
            sx={{
              fontFamily: '"Courier New", Courier, monospace',
              fontSize: '0.75rem',
              color: '#999',
              fontStyle: 'italic'
            }}
          >
            Press 'Start' to begin BGP data collection...
          </Typography>
        )}
        
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
        
        {isRunning && (
          <Box
            sx={{
              display: 'inline-block',
              width: '8px',
              height: '14px',
              bgcolor: '#008000',
              ml: 0.5,
              animation: 'blink 1s infinite',
              '@keyframes blink': {
                '0%, 49%': { opacity: 1 },
                '50%, 100%': { opacity: 0 }
              }
            }}
          />
        )}
        
        <div ref={logEndRef} />
      </Box>
    </Box>
  );
}
