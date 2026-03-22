import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  LinearProgress,
  Stack,
  Typography
} from '@mui/material';
import {
  SyncOutlined,
  ApartmentOutlined,
  SafetyCertificateOutlined,
  PartitionOutlined,
  AimOutlined
} from '@ant-design/icons';

import TARGET_ROWS from './CandidateTarget.json';
import {
  DEFAULT_STEPS,
  STEP_RESULT_TEMPLATES,
  getStepDuration,
  INITIAL_VISIBLE_TARGETS,
  SUMMARY_CARDS,
  STEP_INSIGHTS
} from './TargetConstants';

import {
  KpiCard,
  StepRail,
  AnalysisStreamPanel,
  DetailPanel
} from './TargetComponents';

const formatCompact = (value) => String(value ?? '');

const pad = (num, size = 2) => String(num).padStart(size, '0');

const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
};

const parseLogItem = (item, index = 0) => ({
  id: item?.id ?? `log-${index}`,
  timestamp: item?.timestamp,
  level: item?.level ?? 'INFO ',
  message: item?.message ?? ''
});

export default function TargetIdentification({
  steps,
  currentStepIndex,
  streamedLogs,
  isPlaying
}) {
  const safeSteps = Array.isArray(steps) && steps.length > 0 ? steps : DEFAULT_STEPS;

  const isControlled =
    typeof currentStepIndex === 'number' &&
    Array.isArray(streamedLogs) &&
    typeof isPlaying === 'boolean';

  const [internalStepIndex, setInternalStepIndex] = useState(0);
  const [internalLogs, setInternalLogs] = useState([]);
  const [internalPlaying, setInternalPlaying] = useState(true);

  const stepTimerRef = useRef(null);
  const logTimersRef = useRef([]);

  const activeStepIndex = isControlled ? currentStepIndex : internalStepIndex;
  const activeLogs = isControlled ? streamedLogs : internalLogs;
  const activePlaying = isControlled ? isPlaying : internalPlaying;

  const [selectedStepKey, setSelectedStepKey] = useState(safeSteps[0]?.key ?? '');
  const [selectedDeviceId, setSelectedDeviceId] = useState(
    INITIAL_VISIBLE_TARGETS[0]?.id ?? FALLBACK_TARGET_ROWS[0]?.id ?? ''
  );
  const [revealedCandidates, setRevealedCandidates] = useState(INITIAL_VISIBLE_TARGETS);
  const [lastCycleStep, setLastCycleStep] = useState(activeStepIndex);

  const currentStep = safeSteps[activeStepIndex] || safeSteps[0] || {};
  const progress = Math.round((((activeStepIndex ?? 0) + 1) / Math.max(safeSteps.length, 1)) * 100);

  useEffect(() => {
    const isCycleRestarted = currentStepIndex === 0 && lastCycleStep === safeSteps.length - 1;
    if (!isCycleRestarted) {
      setLastCycleStep(currentStepIndex);
      return;
    }

    const initialTop5 = [...FALLBACK_TARGET_ROWS]
      .sort((a, b) => (b.final ?? 0) - (a.final ?? 0))
      .slice(0, 5);

    setRevealedCandidates(initialTop5);
    setLastCycleStep(currentStepIndex);
  }, [currentStepIndex, lastCycleStep, safeSteps.length]);

  useEffect(() => {
    if (isControlled) return undefined;

    const step = safeSteps[activeStepIndex];
    if (!step) return undefined;

    const logs = Array.isArray(STEP_RESULT_TEMPLATES[step.key]?.logs)
      ? STEP_RESULT_TEMPLATES[step.key].logs
      : [];

    setInternalLogs([]);

    logTimersRef.current.forEach((id) => window.clearTimeout(id));
    logTimersRef.current = [];

    let accumulatedDelay = 0;

    logs.forEach((logItem, index) => {
      const timerId = window.setTimeout(() => {
        setInternalLogs((prev) => [
          ...prev,
          {
            id: `${step.key}-${index}-${Date.now()}`,
            timestamp: logItem.timestamp,
            level: logItem.level,
            message: logItem.message
          }
        ]);
      }, accumulatedDelay);

      logTimersRef.current.push(timerId);
      accumulatedDelay += logItem.delayAfter ?? 400;
    });

    return () => {
      logTimersRef.current.forEach((id) => window.clearTimeout(id));
      logTimersRef.current = [];
    };
  }, [isControlled, activeStepIndex, safeSteps]);

  useEffect(() => {
    if (isControlled) return undefined;

    if (!internalPlaying) return undefined;

    const step = safeSteps[activeStepIndex];
    if (!step) return undefined;

    const duration = getStepDuration(step.key);

    stepTimerRef.current = window.setTimeout(() => {
      setInternalStepIndex((prev) => {
        if (prev >= safeSteps.length - 1) return 0;
        return prev + 1;
      });
    }, duration);

    return () => {
      if (stepTimerRef.current) {
        window.clearTimeout(stepTimerRef.current);
      }
    };
  }, [isControlled, internalPlaying, activeStepIndex, safeSteps]);

  const selectedStep = useMemo(
    () => safeSteps.find((step) => step.key === selectedStepKey) || currentStep,
    [safeSteps, selectedStepKey, currentStep]
  );

  const selectedRow = useMemo(() => {
    const sourceRows = revealedCandidates.length > 0 ? revealedCandidates : FALLBACK_TARGET_ROWS;
    return sourceRows.find((item) => item.id === selectedDeviceId) || sourceRows[0] || {};
  }, [selectedDeviceId, revealedCandidates]);

  return (
    <Box
      sx={{
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        boxSizing: 'border-box'.a,
        bgcolor: '#f8fafc',
        p: 1.3,
      }}
    >
      <Stack spacing={1.3} sx={{ height: '100%', minHeight: 0, overflow: 'hidden' }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, minmax(0, 1fr))',
              md: 'repeat(4, minmax(0, 1fr))',
              xl: 'repeat(8, minmax(0, 1fr))'
            },
            gap: 1
          }}
        >
          {SUMMARY_CARDS.map((card) => (
            <KpiCard key={card.label} card={card} />
          ))}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Box>
            <Typography sx={{ fontSize: '1.02rem', fontWeight: 900, color: '#0f172a' }}>
              지능형 표적 식별 및 분석 모듈
            </Typography>
            <Typography sx={{ fontSize: '0.74rem', color: '#64748b', mt: 0.15 }}>
              8단계 표적 식별 파이프라인과 스트리밍 로그, 최종 후보 표적 생성 과정을 한 화면에서 확인합니다.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            <Chip
              icon={activePlaying ? <SyncOutlined spin /> : <AimOutlined />}
              label={activePlaying ? '자동 단계 전환' : '수동 보기'}
              sx={{
                bgcolor: activePlaying ? '#e8f0ff' : '#f8fafc',
                color: activePlaying ? '#3563e9' : '#475569',
                fontWeight: 800
              }}
            />
            <Chip
              label={`Current: ${currentStep?.title ?? '-'}`}
              sx={{ bgcolor: '#eef2ff', color: '#4338ca', fontWeight: 800 }}
            />
          </Stack>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', xl: '400px minmax(0, 1fr) 360px' },
            gridTemplateRows: 'minmax(0, 1fr)',
            gap: 1.3,
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            alignItems: 'stretch'
          }}
        >
          <StepRail
            steps={safeSteps}
            currentStepIndex={activeStepIndex}
            selectedStepKey={selectedStepKey}
            onSelect={(key) => setSelectedStepKey(key)}
          />

          <AnalysisStreamPanel
            step={selectedStep}
            streamedLogs={activeLogs}
            progress={progress}
            stepInsights={STEP_INSIGHTS}
          />

          <Box
            sx={{
              height: '100%',
              minHeight: 0,
              overflow: 'hidden',
              display: 'flex'
            }}
          >
            <DetailPanel
              row={selectedRow}
              candidates={revealedCandidates}
              selectedId={selectedDeviceId}
              onSelect={(id) => setSelectedDeviceId(id)}
            />
          </Box>
        </Box>
      </Stack>
    </Box>
  );
}