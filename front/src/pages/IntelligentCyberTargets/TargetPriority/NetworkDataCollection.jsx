import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Typography
} from '@mui/material';

const pad = (n, width = 2) => String(n).padStart(width, '0');

const getFormattedTimestamp = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const mi = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  const ms = pad(now.getMilliseconds(), 3);
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}.${ms}`;
};

const makeLogLine = (level, content) => {
  const paddedLevel = level === 'SUCCESS' ? 'SUCCESS' : level.padEnd(5, ' ');
  return `[${getFormattedTimestamp()}] [${paddedLevel}] ${content}`;
};

const makeSeparatorLine = (title) =>
  `--------------------------- ${title} ---------------------------`;

const makeInitialState = (stepTemplates) => {
  const safeStepTemplates =
    stepTemplates && typeof stepTemplates === 'object' ? stepTemplates : {};

  return Object.keys(safeStepTemplates).reduce((acc, key) => {
    acc[key] = {
      logs: [],
      cycleCards: [],
      processedCycleSet: [],
      typingCount: 0
    };
    return acc;
  }, {});
};

const getStepTitle = (pipelineSteps, stepKey) =>
  pipelineSteps.find((step) => step.key === stepKey)?.title || stepKey;

const formatNumber = (value) => Number(value).toLocaleString();

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const buildDynamicMetrics = (stepKey, cycleNumber = 1) => {
  const cycle = Math.max(1, cycleNumber);

  const trafficRecords = 98182532 + cycle * 184231;
  const flows = 3000000 + cycle * 8421;
  const sessions = 1000000 + cycle * 3912;

  const nodes = 824 + ((cycle - 1) % 3) * 6;
  const edges = 3912440 + cycle * 5312;
  const components = clamp(126 + ((cycle - 1) % 4) * 3, 126, 135);

  const validatedRecords = 28473591 + cycle * 91234;
  const anomalies = 18432 + cycle * 37;
  const resolved = anomalies - (cycle % 11);

  const normalizedFields = 31 + (cycle % 3);
  const scaledFeatures = 22 + (cycle % 4);
  const outlierHandled = 182541 + cycle * 143;

  const augmentedFeatures = 14 + (cycle % 3);
  const contextLinks = 83 + cycle * 2;
  const enrichedRecords = validatedRecords - 1200 + cycle * 18;

  const finalRecords = enrichedRecords - 3200 + cycle * 11;
  const outputBatches = 6 + (cycle % 3);

  const dynamicMap = {
    'traffic-ingestion': {
      수집레코드: formatNumber(trafficRecords),
      플로우수: formatNumber(flows),
      세션수: formatNumber(sessions)
    },
    'topology-generation': {
      노드수: formatNumber(nodes),
      엣지수: formatNumber(edges),
      컴포넌트수: formatNumber(components)
    },
    'infrastructure-inference': {
      추론역할수: formatNumber(12 + (cycle % 3)),
      게이트웨이수: formatNumber(3),
      서버수: formatNumber(9 + (cycle % 2))
    },
    'consistency-validation': {
      검증완료건수: formatNumber(validatedRecords),
      이상건수: formatNumber(anomalies),
      해결건수: formatNumber(resolved)
    },
    normalization: {
      정규화필드수: formatNumber(normalizedFields),
      스케일조정특징수: formatNumber(scaledFeatures),
      이상치처리수: formatNumber(outlierHandled)
    },
    augmentation: {
      증강특징수: formatNumber(augmentedFeatures),
      문맥연결수: formatNumber(contextLinks),
      강화레코드수: formatNumber(enrichedRecords)
    },
    'analysis-ready': {
      준비상태: 'READY',
      출력배치수: formatNumber(outputBatches),
      최종레코드수: formatNumber(finalRecords)
    }
  };

  return dynamicMap[stepKey] || {};
};

const buildDynamicHighlights = (stepKey, cycleNumber = 1) => {
  const cycle = Math.max(1, cycleNumber);

  const nodes = 824 + ((cycle - 1) % 3) * 6;
  const edges = 3912440 + cycle * 5312;

  const validatedRecords = 28473591 + cycle * 91234;
  const outlierHandled = 182541 + cycle * 143;
  const finalRecords = validatedRecords - 4400 + cycle * 29;

  const highlightMap = {
    'traffic-ingestion': ['대용량 트래픽 수집 반영.', 'Flow / Session 집계 갱신.'],
    'topology-generation': [
      `활성 엔드포인트 ${formatNumber(nodes)}개 중심 토폴로지 반영.`,
      `대규모 통신 링크 ${formatNumber(edges)}건 구조화 완료.`
    ],
    'infrastructure-inference': ['인프라 역할 분류 갱신.', '핵심 노드 신뢰도 재산정.'],
    'consistency-validation': [
      `검증 대상 레코드 ${formatNumber(validatedRecords)}건 반영.`,
      '이상 관계 정리 완료.'
    ],
    normalization: [
      `이상치 / 결측치 처리량 ${formatNumber(outlierHandled)}건 반영.`,
      '정규화 스키마 갱신 완료.'
    ],
    augmentation: ['문맥 기반 feature 확장 완료.', '그래프 문맥 연결 정보 반영.'],
    'analysis-ready': [
      `최종 데이터셋 ${formatNumber(finalRecords)}건 준비.`,
      '분석 입력 포맷 정리 완료.'
    ]
  };

  return highlightMap[stepKey] || [];
};

const buildLogScheduleFromTemplate = (logs) => {
  const normalizedLogs = logs.map((item) =>
    typeof item === 'string'
      ? { message: item, delayAfter: 700 }
      : {
          message: item.message,
          delayAfter: item.delayAfter ?? 700
        }
  );

  let elapsed = 180;
  const logDelays = [];

  for (let i = 0; i < normalizedLogs.length; i += 1) {
    logDelays.push(elapsed);
    elapsed += normalizedLogs[i].delayAfter;
  }

  const cardDelay = elapsed + 260;
  const totalDuration = elapsed + 500;

  return {
    normalizedLogs,
    logDelays,
    cardDelay,
    totalDuration
  };
};

const NetworkDataCollection = ({
  selectedStep = { key: 'default-step', title: '대기 단계', description: '' },
  currentStepIndex = 0,
  cycleNumber = 1,
  isRunning = false,
  stepTemplates = {},
  stepHistory = [],
  pipelineSteps = [],
  runToken,
}) => {
  const [stepStateMap, setStepStateMap] = useState(() => makeInitialState(stepTemplates));
  const [pipelineLogs, setPipelineLogs] = useState([]);
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  const [animatedPipelineLogs, setAnimatedPipelineLogs] = useState([]);

  const logRef = useRef(null);
  const cardRef = useRef(null);
  const fullLogScrollRef = useRef(null);

  const animationTimersRef = useRef([]);
  const pipelineLogsRef = useRef([]);
  const lastAnimatedIndexRef = useRef(0);
  const isDialogInitializedRef = useRef(false);

  const selectedData = stepStateMap[selectedStep.key] || {
    logs: [],
    cycleCards: [],
    processedCycleSet: [],
    typingCount: 0
  };

  const currentStep = pipelineSteps[currentStepIndex];
  const currentStepKey = currentStep?.key;
  const currentStepTitle = currentStep?.title || '-';
  const isSelectedStepActive = currentStepKey === selectedStep.key;

  useEffect(() => {
    pipelineLogsRef.current = pipelineLogs;
  }, [pipelineLogs]);

  const clearAnimationTimers = useCallback(() => {
    animationTimersRef.current.forEach(clearTimeout);
    animationTimersRef.current = [];
  }, []);

  const getLineAnimationDelay = useCallback((line) => {
    if (line.includes('[DONE') || line.includes('[READY')) return 140;
    if (line.includes('[OUTPUT') || line.includes('[EXPORT')) return 220;
    if (line.includes('[CHECK') || line.includes('[SCAN') || line.includes('[FILTER')) return 70;
    if (line.includes('[FIX') || line.includes('[DROP') || line.includes('[FILL')) return 85;
    if (line.includes('---------------------------')) return 120;
    return 95;
  }, []);

  const animateLogsFromIndex = useCallback(
    (startIndex = 0) => {
      clearAnimationTimers();

      const currentLogs = pipelineLogsRef.current;

      if (currentLogs.length === 0) {
        setAnimatedPipelineLogs([makeLogLine('INFO', '파이프라인 로그 대기 중.')]);
        lastAnimatedIndexRef.current = 0;
        return;
      }

      const targetLogs = currentLogs.slice(startIndex);
      if (targetLogs.length === 0) return;

      if (startIndex === 0) {
        setAnimatedPipelineLogs([]);
      }

      let elapsed = 0;

      targetLogs.forEach((line, idx) => {
        const timerId = setTimeout(() => {
          setAnimatedPipelineLogs((prev) => [...prev, line]);
          lastAnimatedIndexRef.current = startIndex + idx + 1;
        }, elapsed);

        animationTimersRef.current.push(timerId);
        elapsed += getLineAnimationDelay(line);
      });
    },
    [clearAnimationTimers, getLineAnimationDelay]
  );

  useEffect(() => {
    setStepStateMap(makeInitialState(stepTemplates));
    setPipelineLogs([]);
    setAnimatedPipelineLogs([]);
    clearAnimationTimers();
    lastAnimatedIndexRef.current = 0;
    isDialogInitializedRef.current = false;
  }, [runToken, stepTemplates, clearAnimationTimers]);

  useEffect(() => {
    if (!isRunning || !currentStepKey) return;

    const template = stepTemplates[currentStepKey] || {
      logs: [],
      metrics: {},
      highlights: []
    };

    const activeCycle = cycleNumber;
    const cycleMark = `${currentStepKey}-${activeCycle}`;
    const stepTitle = getStepTitle(pipelineSteps, currentStepKey);

    const { normalizedLogs, logDelays, cardDelay } =
      buildLogScheduleFromTemplate(template.logs);

    const timers = [];

    setStepStateMap((prev) => {
      const currentData = prev[currentStepKey];
      if (!currentData || currentData.processedCycleSet.includes(cycleMark)) {
        return prev;
      }

      return {
        ...prev,
        [currentStepKey]: {
          ...currentData,
          processedCycleSet: [...currentData.processedCycleSet, cycleMark],
          typingCount: 0
        }
      };
    });

    const separatorTimer = setTimeout(() => {
      const separator = makeSeparatorLine(stepTitle);
      const headerLog = makeLogLine('INFO', separator);

      setStepStateMap((prev) => {
        const currentData = prev[currentStepKey];
        if (!currentData || currentData.logs.includes(headerLog)) return prev;

        return {
          ...prev,
          [currentStepKey]: {
            ...currentData,
            logs: [...currentData.logs, headerLog]
          }
        };
      });

      setPipelineLogs((prev) => [...prev, headerLog]);
    }, 100);

    timers.push(separatorTimer);

    normalizedLogs.forEach((logItem, idx) => {
      const timerId = setTimeout(() => {
        setStepStateMap((prev) => {
          const currentData = prev[currentStepKey];
          if (!currentData || !currentData.processedCycleSet.includes(cycleMark)) {
            return prev;
          }

          const level =
            currentStepKey === 'analysis-ready' && idx === normalizedLogs.length - 1
              ? 'SUCCESS'
              : 'INFO';

          const newLine = makeLogLine(level, logItem.message);

          return {
            ...prev,
            [currentStepKey]: {
              ...currentData,
              logs: [...currentData.logs, newLine],
              typingCount: idx + 1
            }
          };
        });

        setPipelineLogs((prev) => {
          const level =
            currentStepKey === 'analysis-ready' && idx === normalizedLogs.length - 1
              ? 'SUCCESS'
              : 'INFO';

          const newLine = makeLogLine(level, logItem.message);
          return [...prev, newLine];
        });
      }, logDelays[idx]);

      timers.push(timerId);
    });

    const cardTimer = setTimeout(() => {
      setStepStateMap((prev) => {
        const currentData = prev[currentStepKey];
        if (!currentData) return prev;

        const nextIndex = currentData.cycleCards.length + 1;

        const card = {
          id: `${currentStepKey}-${Date.now()}`,
          timestamp: getFormattedTimestamp(),
          title: `${stepTitle} · Snapshot #${nextIndex}`,
          metrics: buildDynamicMetrics(currentStepKey, cycleNumber),
          highlights: buildDynamicHighlights(currentStepKey, cycleNumber)
        };

        return {
          ...prev,
          [currentStepKey]: {
            ...currentData,
            cycleCards: [...currentData.cycleCards, card]
          }
        };
      });
    }, cardDelay);

    timers.push(cardTimer);

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [
    currentStepIndex,
    cycleNumber,
    isRunning,
    currentStepKey,
    pipelineSteps,
    stepTemplates
  ]);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [selectedData.logs.length, selectedStep.key]);

  useEffect(() => {
    const el = cardRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [selectedData.cycleCards.length, selectedStep.key]);

  useEffect(() => {
    if (isLogDialogOpen) {
      isDialogInitializedRef.current = true;
      lastAnimatedIndexRef.current = 0;
      animateLogsFromIndex(0);
    } else {
      clearAnimationTimers();
      isDialogInitializedRef.current = false;
      lastAnimatedIndexRef.current = 0;
      setAnimatedPipelineLogs([]);
    }

    return () => {
      clearAnimationTimers();
    };
  }, [isLogDialogOpen, animateLogsFromIndex, clearAnimationTimers]);

  useEffect(() => {
    if (!isLogDialogOpen) return;
    if (!isDialogInitializedRef.current) return;

    const nextStartIndex = lastAnimatedIndexRef.current;
    if (pipelineLogs.length > nextStartIndex) {
      animateLogsFromIndex(nextStartIndex);
    }
  }, [pipelineLogs.length, isLogDialogOpen, animateLogsFromIndex]);

  useEffect(() => {
    const el = fullLogScrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [animatedPipelineLogs.length]);

  const pipelineStateText = useMemo(() => {
    if (!isRunning) return '일시 정지';
    return '실행 중';
  }, [isRunning]);

  const latestStepCount = useMemo(() => {
    return stepHistory.filter((item) => item.stepKey === selectedStep.key).length;
  }, [stepHistory, selectedStep.key]);

  const typingDots = useMemo(() => {
    if (!isSelectedStepActive || !isRunning) return '';
    const count = (selectedData.typingCount % 3) + 1;
    return '.'.repeat(count);
  }, [isSelectedStepActive, isRunning, selectedData.typingCount]);

  return (
    <>
      <Card sx={{ boxShadow: 3, minHeight: 0 }}>
        <CardContent
          sx={{
            p: 1,
            height: '100%',
            '&:last-child': { pb: 1 },
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          <Box
            sx={{
              background: '#f0edfd',
              color: '#39306b',
              p: 2,
              borderRadius: 2,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <Box
              sx={{
                borderBottom: '2px solid #39306b',
                pb: 1.2,
                mb: 1.5,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 1.5,
                flexWrap: 'wrap'
              }}
            >
              <Box>
                <Typography sx={{ fontSize: '1.15rem', fontWeight: 700 }}>
                  단계 상세: {selectedStep.title}
                </Typography>
                <Typography sx={{ fontSize: '0.78rem', opacity: 0.78, mt: 0.35 }}>
                  {selectedStep.description}
                </Typography>
              </Box>

              <Button
                size="small"
                variant="outlined"
                onClick={() => setIsLogDialogOpen(true)}
                sx={{
                  borderColor: '#7c6ef6',
                  color: '#5a4fd1',
                  whiteSpace: 'nowrap',
                  '&:hover': {
                    borderColor: '#5a4fd1',
                    backgroundColor: 'rgba(124,110,246,0.06)'
                  }
                }}
              >
                전체 로그 보기
              </Button>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', xl: '1.08fr 0.92fr' },
                gap: 2,
                flex: 1,
                minHeight: 0
              }}
            >
              <Box
                sx={{
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, mb: 1 }}>
                  실행 로그
                </Typography>

                <Box
                  ref={logRef}
                  sx={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: 'auto',
                    bgcolor: '#fff',
                    color: '#222',
                    borderRadius: 2,
                    p: 1.5,
                    fontFamily: 'monospace',
                    fontSize: '0.84rem',
                    lineHeight: 1.7,
                    border: '1px solid rgba(57, 48, 107, 0.18)'
                  }}
                >
                  {selectedData.logs.length === 0 ? (
                    <Typography
                      sx={{
                        color: 'rgba(0,0,0,0.5)',
                        fontFamily: 'monospace',
                        fontSize: '0.84rem'
                      }}
                    >
                      {makeLogLine('INFO', `${selectedStep.title} 단계 이벤트 대기 중.`)}
                    </Typography>
                  ) : (
                    <>
                      {selectedData.logs.map((log, idx) => (
                        <Box
                          key={`${idx}-${log}`}
                          sx={{
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            mb: 0.4
                          }}
                        >
                          {log}
                        </Box>
                      ))}

                      {isSelectedStepActive && isRunning && (
                        <Box
                          sx={{
                            mt: 0.5,
                            color: '#7c6ef6',
                            fontFamily: 'monospace'
                          }}
                        >
                          {makeLogLine('INFO', `${selectedStep.title} 처리 진행 중${typingDots}`)}
                        </Box>
                      )}
                    </>
                  )}
                </Box>
              </Box>

              <Box
                sx={{
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, mb: 1 }}>
                  단계 결과 카드
                </Typography>

                <Box
                  ref={cardRef}
                  sx={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: 'auto',
                    bgcolor: '#fff',
                    borderRadius: 2,
                    border: '1px solid rgba(57, 48, 107, 0.15)',
                    p: 1.5
                  }}
                >
                  {selectedData.cycleCards.length === 0 ? (
                    <Typography sx={{ color: 'rgba(57,48,107,0.6)', fontSize: '0.9rem' }}>
                      아직 생성된 결과 카드가 없습니다.
                    </Typography>
                  ) : (
                    selectedData.cycleCards.map((card, index) => (
                      <Box
                        key={card.id}
                        sx={{
                          mb: index === selectedData.cycleCards.length - 1 ? 0 : 1.4,
                          p: 1.6,
                          borderRadius: 1.5,
                          border: '1px solid rgba(99, 102, 241, 0.18)',
                          bgcolor: '#fafafe'
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 1,
                            mb: 1
                          }}
                        >
                          <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>
                            {card.title}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: '0.74rem',
                              color: '#5f5a8a',
                              fontFamily: 'monospace'
                            }}
                          >
                            {card.timestamp}
                          </Typography>
                        </Box>

                        <Divider sx={{ mb: 1.2 }} />

                        <Box sx={{ display: 'grid', rowGap: 0.55 }}>
                          {Object.entries(card.metrics).map(([key, value]) => (
                            <Typography key={key} sx={{ fontSize: '0.88rem', color: '#1f1f1f' }}>
                              • {key}: <strong>{value}</strong>
                            </Typography>
                          ))}

                          {card.highlights.map((line) => (
                            <Typography key={line} sx={{ fontSize: '0.88rem', color: '#1f1f1f' }}>
                              • {line}
                            </Typography>
                          ))}
                        </Box>
                      </Box>
                    ))
                  )}
                </Box>
              </Box>
            </Box>

            <Box
              sx={{
                mt: 1.2,
                pt: 1,
                borderTop: '1px solid rgba(57,48,107,0.15)',
                display: 'flex',
                justifyContent: 'space-between',
                gap: 1.2,
                flexWrap: 'wrap',
                fontSize: '0.78rem',
                color: 'rgba(57,48,107,0.7)',
                flexShrink: 0
              }}
            >
              <span>파이프라인 상태: {pipelineStateText}</span>
              <span>선택 단계: {selectedStep.title}</span>
              <span>현재 진행 단계: {currentStepTitle}</span>
              <span>누적 실행 횟수: {latestStepCount}</span>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Dialog
        open={isLogDialogOpen}
        onClose={() => setIsLogDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            background: '#ffffff',
            boxShadow: '0 20px 60px rgba(57,48,107,0.18)',
            border: '1px solid rgba(124,110,246,0.16)'
          }
        }}
      >
        <DialogTitle
          sx={{
            px: 2.5,
            py: 1.8,
            borderBottom: '1px solid rgba(57,48,107,0.10)',
            background: 'linear-gradient(180deg, #f7f5ff 0%, #ffffff 100%)'
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              flexWrap: 'wrap'
            }}
          >
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: '1.02rem', color: '#2f285f' }}>
                파이프라인 전체 로그
              </Typography>
              <Typography sx={{ fontSize: '0.78rem', color: 'rgba(57,48,107,0.68)', mt: 0.35 }}>
                전체 단계 누적 로그 · 실시간 콘솔 스타일 재생
              </Typography>
            </Box>

            <Button
              size="small"
              variant="outlined"
              onClick={() => setIsLogDialogOpen(false)}
              sx={{
                borderColor: 'rgba(57,48,107,0.18)',
                color: '#4b4675',
                backgroundColor: '#fff',
                '&:hover': {
                  borderColor: '#7c6ef6',
                  backgroundColor: 'rgba(124,110,246,0.05)'
                }
              }}
            >
              닫기
            </Button>
          </Box>
        </DialogTitle>

        <DialogContent
          sx={{
            p: 0,
            background: '#ffffff'
          }}
        >
          <Box
            sx={{
              px: 2.5,
              py: 1.2,
              borderBottom: '1px solid rgba(57,48,107,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5,
              flexWrap: 'wrap',
              background: '#fcfbff'
            }}
          >
            <Typography sx={{ fontSize: '0.78rem', color: 'rgba(57,48,107,0.72)' }}>
              누적 로그 수: <strong>{pipelineLogs.length}</strong>
            </Typography>
            <Typography sx={{ fontSize: '0.78rem', color: 'rgba(57,48,107,0.72)' }}>
              현재 진행 단계: <strong>{currentStepTitle}</strong>
            </Typography>
          </Box>

          <Box
            ref={fullLogScrollRef}
            sx={{
              minHeight: '420px',
              maxHeight: '70vh',
              overflowY: 'auto',
              background: '#ffffff',
              px: 2.5,
              py: 2,
              fontFamily: 'monospace',
              fontSize: '0.84rem',
              lineHeight: 1.72
            }}
          >
            {animatedPipelineLogs.length === 0 ? (
              <Typography
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '0.84rem',
                  color: 'rgba(57,48,107,0.46)'
                }}
              >
                {makeLogLine('INFO', '파이프라인 로그 대기 중.')}
              </Typography>
            ) : (
              animatedPipelineLogs.map((line, idx) => {
                const isSeparator = line.includes('---------------------------');
                const isDone = line.includes('[DONE') || line.includes('[READY');
                const isOutput = line.includes('[OUTPUT') || line.includes('[EXPORT');
                const isCheck =
                  line.includes('[CHECK') ||
                  line.includes('[SCAN') ||
                  line.includes('[FILTER') ||
                  line.includes('[RECHECK');
                const isFix =
                  line.includes('[FIX') || line.includes('[DROP') || line.includes('[FILL');

                let color = '#374151';
                let bg = 'transparent';
                let borderLeft = '3px solid transparent';

                if (isSeparator) {
                  color = '#6d5bd0';
                  bg = 'rgba(124,110,246,0.06)';
                  borderLeft = '3px solid #7c6ef6';
                } else if (isDone) {
                  color = '#1b5e20';
                  bg = 'rgba(76,175,80,0.08)';
                  borderLeft = '3px solid #43a047';
                } else if (isOutput) {
                  color = '#0d47a1';
                  bg = 'rgba(33,150,243,0.08)';
                  borderLeft = '3px solid #1e88e5';
                } else if (isCheck) {
                  color = '#ef6c00';
                  bg = 'rgba(255,167,38,0.09)';
                  borderLeft = '3px solid #fb8c00';
                } else if (isFix) {
                  color = '#ad1457';
                  bg = 'rgba(233,30,99,0.08)';
                  borderLeft = '3px solid #d81b60';
                }

                return (
                  <Box
                    key={`${idx}-${line}`}
                    sx={{
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      mb: 0.6,
                      px: 1.2,
                      py: 0.75,
                      borderRadius: 1.5,
                      color,
                      background: bg,
                      borderLeft,
                      opacity: 0,
                      transform: 'translateY(6px)',
                      animation: 'pipelineLogFadeIn 0.22s ease-out forwards',
                      '@keyframes pipelineLogFadeIn': {
                        from: {
                          opacity: 0,
                          transform: 'translateY(6px)'
                        },
                        to: {
                          opacity: 1,
                          transform: 'translateY(0)'
                        }
                      }
                    }}
                  >
                    {line}
                  </Box>
                );
              })
            )}
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NetworkDataCollection;