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

const LOG_BUFFER_LIMIT = 500;

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const getRandomLogEvent = () => {
  const ts = formatTimestamp(new Date());
  const eventType = pickRandom(['collect', 'parse', 'refine', 'store', 'status', 'warn']);

  if (eventType === 'collect') {
    const sources = ['routeviews', 'ris/rrc00', 'ris/rrc10', 'route-views.sg'];
    const source = pickRandom(sources);
    const size = (Math.random() * 35 + 5).toFixed(1);
    return {
      text: `[${ts}] [INFO ] [COLLECT] ${source} 업데이트 청크 수집 완료 (${size} MB)`,
      color: '#0066cc'
    };
  }

  if (eventType === 'parse') {
    const decoded = randomInt(1200, 9800).toLocaleString();
    const parserId = randomInt(1, 4);
    return {
      text: `[${ts}] [INFO ] [PARSER-${String(parserId).padStart(2, '0')}] BGP UPDATE ${decoded}건 디코딩`,
      color: '#007799'
    };
  }

  if (eventType === 'refine') {
    const kept = randomInt(38, 79);
    const dropped = 100 - kept;
    const rules = ['prefix 정규화', 'ASN 중복 제거', '타임스탬프 보정', '이상치 정제'];
    const rule = pickRandom(rules);
    return {
      text: `[${ts}] [INFO ] [REFINE ] ${rule} 적용 (유지 ${kept}%, 제거 ${dropped}%)`,
      color: '#cc6600'
    };
  }

  if (eventType === 'store') {
    const batch = randomInt(800, 2800).toLocaleString();
    const elapsed = (Math.random() * 0.9 + 0.2).toFixed(2);
    const writerId = randomInt(1, 2);
    return {
      text: `[${ts}] [INFO ] [DB-WRITER-${String(writerId).padStart(2, '0')}] MongoDB batch commit (rows=${batch}, ${elapsed}s)`,
      color: '#cc0066'
    };
  }

  if (eventType === 'warn') {
    const warns = [
      '지연 증가 감지 - 재시도 백오프 250ms 적용',
      '손상된 패킷 3건 무시 후 처리 계속',
      '중복 prefix 다수 감지 - 정제 규칙 강화'
    ];
    return {
      text: `[${ts}] [WARN ] [PIPELINE] ${pickRandom(warns)}`,
      color: '#a86f00'
    };
  }

  const qps = randomInt(800, 2400).toLocaleString();
  const total = randomInt(120000, 980000).toLocaleString();
  return {
    text: `[${ts}] [INFO ] [STATS ] ingest=${qps}/s | stored_total=${total} | target=MongoDB(network_traffic)`,
    color: '#008000'
  };
};

export default function BGPConsole({ onNavigate, isRunning = true }) {
  const [logs, setLogs] = useState([]);
  const logEndRef = useRef(null);
  const streamTimerRef = useRef(null);

  // 자동 스크롤
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [logs]);

  // isRunning 변경 시 로그 제어
  useEffect(() => {
    if (streamTimerRef.current) {
      clearTimeout(streamTimerRef.current);
      streamTimerRef.current = null;
    }

    if (!isRunning) return;

    setLogs([
      {
        text: `[${formatTimestamp(new Date())}] [INFO ] BGP Archive Collector 실시간 수집 파이프라인 시작`,
        color: '#008000'
      },
      {
        text: `[${formatTimestamp(new Date())}] [INFO ] 흐름: 수집 -> 파싱 -> 정제 -> DB 저장 (무한 반복)`,
        color: '#333333'
      }
    ]);

    const scheduleNext = () => {
      const delay = randomInt(180, 900);
      streamTimerRef.current = setTimeout(() => {
        const eventLog = getRandomLogEvent();
        setLogs((prev) => {
          const next = [...prev, eventLog];
          return next.length > LOG_BUFFER_LIMIT ? next.slice(next.length - LOG_BUFFER_LIMIT) : next;
        });
        scheduleNext();
      }, delay);
    };

    scheduleNext();

    return () => {
      if (streamTimerRef.current) {
        clearTimeout(streamTimerRef.current);
        streamTimerRef.current = null;
      }
    };
  }, [isRunning]);

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
