import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ClearOutlined,
  CheckCircleFilled,
  ClockCircleOutlined
} from '@ant-design/icons';
import TargetIdentification from './TargetIdentification';

export const PIPELINE_STEPS = [
  {
    key: 'graph-load',
    title: '네트워크 토폴로지 그래프 로드',
    shortTitle: '그래프 로드',
    description: '네트워크 토폴로지 그래프를 로드하고 zone / subnet 구조를 복원합니다.'
  },
  {
    key: 'feature-build',
    title: '노드 특징 구성 및 분석',
    shortTitle: '특징 구성',
    description: '노드 속성과 네트워크 맥락 정보를 기반으로 특징 벡터를 구성합니다.'
  },
  {
    key: 'structural-scoring',
    title: '연결 구조 기반 중요도 계산',
    shortTitle: '구조 점수화',
    description: '중심성 및 경계성 기반으로 구조 중요도를 계산합니다.'
  },
  {
    key: 'gnn-scoring',
    title: '그래프 신경망 기반 중요도 계산',
    shortTitle: 'GNN 점수화',
    description: '관계 패턴과 주변 구조를 반영한 GNN 기반 중요도를 산출합니다.'
  },
  {
    key: 'role-assessment',
    title: '인프라 역할 및 제어 가능성 평가',
    shortTitle: '역할 평가',
    description: '인프라 역할과 제어 가능성을 기준으로 후보 가치를 평가합니다.'
  },
  {
    key: 'neighbor-analysis',
    title: '연관 노드 영향 분석',
    shortTitle: '영향 분석',
    description: '주변 장치에 대한 영향 범위와 확산 가능성을 분석합니다.'
  },
  {
    key: 'target-validation',
    title: '표적 유효성 검증',
    shortTitle: '유효성 검증',
    description: '오탐 가능성과 대체 가능성을 제거하고 유효 표적을 검증합니다.'
  },
  {
    key: 'final-scoring',
    title: '최종 점수 산출',
    shortTitle: '최종 점수',
    description: '모든 분석 결과를 통합해 최종 후보 점수를 산출합니다.'
  }
];

const d = {
  quick: 240,
  normal: 360,
  medium: 560,
  heavy: 820,
  hold: 1200
};

const TEMPLATE_BASE_TIME = new Date('2026-03-23T00:31:30.817');

const formatLogTime = (date) => {
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
};

const buildTimedLogs = (entries) => {
  let offset = 0;
  return entries.map((entry) => {
    const ts = new Date(TEMPLATE_BASE_TIME.getTime() + offset);
    offset += entry.delayAfter ?? 300;

    return {
      ...entry,
      timestamp: formatLogTime(ts),
      level: entry.level ?? 'INFO'
    };
  });
};

export const STEP_RESULT_TEMPLATES = {
  'graph-load': {
    logs: buildTimedLogs([
      { level: 'INFO ', message: 'Starting topology session bootstrap for graph load stage.', delayAfter: d.quick },
      { level: 'INFO ', message: 'Scanning Neo4j device node index for active infrastructure assets.', delayAfter: d.normal },
      { level: 'INFO ', message: 'Fetching CONNECTED relationships in parallel batches.', delayAfter: d.medium },
      { level: 'DEBUG', message: 'Merging subnet fragments into unified in-memory graph.', delayAfter: d.medium },
      { level: 'DEBUG', message: 'Restoring cross-zone boundary links and relay edges.', delayAfter: d.normal },
      { level: 'INFO ', message: 'Enumerating connected components for topology stabilization.', delayAfter: d.medium },
      { level: 'INFO ', message: 'Verifying orphan relations and isolated nodes.', delayAfter: d.normal },
      { level: 'INFO ', message: 'Caching graph snapshot for downstream scoring pipeline.', delayAfter: d.normal },
      { level: 'INFO ', message: 'Topology load summary: nodes=824, edges=3,912,440, components=126.', delayAfter: d.quick },
      { level: 'INFO ', message: 'Completed network topology graph loading stage.', delayAfter: d.hold }
    ])
  },
  'feature-build': {
    logs: buildTimedLogs([
      { level: 'INFO ', message: 'Initializing node feature builder.', delayAfter: d.quick },
      { level: 'INFO ', message: 'Parsing ip, subnet, gateway, zone and device-type attributes.', delayAfter: d.normal },
      { level: 'DEBUG', message: 'Normalizing categorical labels for router, switch and firewall nodes.', delayAfter: d.normal },
      { level: 'DEBUG', message: 'Encoding relation type flags and gateway adjacency features.', delayAfter: d.medium },
      { level: 'INFO ', message: 'Constructing zone/subnet identity embeddings.', delayAfter: d.medium },
      { level: 'INFO ', message: 'Applying neighborhood degree and boundary-presence feature expansion.', delayAfter: d.normal },
      { level: 'WARN ', message: 'Patched sparse gateway fields for edge-case infrastructure records.', delayAfter: d.normal },
      { level: 'INFO ', message: 'Materializing node feature matrix for scoring stages.', delayAfter: d.medium },
      { level: 'INFO ', message: 'Feature distribution check completed without critical imbalance.', delayAfter: d.quick },
      { level: 'INFO ', message: 'Completed node feature construction and analysis stage.', delayAfter: d.hold }
    ])
  },
  'structural-scoring': {
    logs: buildTimedLogs([
      { level: 'INFO ', message: 'Starting structural importance scoring.', delayAfter: d.quick },
      { level: 'INFO ', message: 'Computing degree centrality across active graph nodes.', delayAfter: d.normal },
      { level: 'INFO ', message: 'Computing betweenness centrality on relay paths.', delayAfter: d.heavy },
      { level: 'INFO ', message: 'Computing closeness centrality for reachable infrastructure nodes.', delayAfter: d.medium },
      { level: 'DEBUG', message: 'Tracing cross-subnet transition paths.', delayAfter: d.medium },
      { level: 'DEBUG', message: 'Tracing zone-boundary bridge nodes with relay behavior.', delayAfter: d.normal },
      { level: 'INFO ', message: 'Boosting bridge-capable routers and relay switches.', delayAfter: d.normal },
      { level: 'INFO ', message: 'Lowering rank for low-impact leaf nodes.', delayAfter: d.quick },
      { level: 'INFO ', message: 'Merged structural metrics into candidate scoring table.', delayAfter: d.normal },
      { level: 'INFO ', message: 'Structural ranking stabilized for top candidate set.', delayAfter: d.hold }
    ])
  },
  'gnn-scoring': {
    logs: buildTimedLogs([
      { level: 'INFO ', message: 'Initializing graph neural network encoder.', delayAfter: d.quick },
      { level: 'INFO ', message: 'Executing message passing layer 1.', delayAfter: d.medium },
      { level: 'INFO ', message: 'Executing message passing layer 2.', delayAfter: d.medium },
      { level: 'DEBUG', message: 'Updating relation-aware aggregation weights.', delayAfter: d.medium },
      { level: 'DEBUG', message: 'Refining hidden node representations with learned context.', delayAfter: d.medium },
      { level: 'INFO ', message: 'Fusing structural priors with learned embeddings.', delayAfter: d.normal },
      { level: 'INFO ', message: 'Recalculating candidate likelihoods using GNN outputs.', delayAfter: d.normal },
      { level: 'INFO ', message: 'Reordering control-capable nodes against endpoint-only assets.', delayAfter: d.normal },
      { level: 'INFO ', message: 'GNN ranking agreement ratio settled at 0.68.', delayAfter: d.quick },
      { level: 'INFO ', message: 'Completed graph neural network importance scoring.', delayAfter: d.hold }
    ])
  },
  'role-assessment': {
    logs: buildTimedLogs([
      { level: 'INFO ', message: 'Starting infrastructure role assessment.', delayAfter: d.quick },
      { level: 'INFO ', message: 'Assigning role weights to router, switch and firewall assets.', delayAfter: d.normal },
      { level: 'DEBUG', message: 'Evaluating gateway adjacency and route mediation points.', delayAfter: d.normal },
      { level: 'DEBUG', message: 'Tracing administrative control paths through critical segments.', delayAfter: d.medium },
      { level: 'INFO ', message: 'Estimating service dependency exposure by infrastructure role.', delayAfter: d.medium },
      { level: 'INFO ', message: 'Deprioritizing endpoint-only and replaceable relay nodes.', delayAfter: d.normal },
      { level: 'INFO ', message: 'Applying control premium to boundary routers and mediated firewalls.', delayAfter: d.normal },
      { level: 'INFO ', message: 'Merged role-based control score into final candidate table.', delayAfter: d.normal },
      { level: 'INFO ', message: 'Completed infrastructure role and controllability assessment.', delayAfter: d.hold }
    ])
  },
  'neighbor-analysis': {
    logs: buildTimedLogs([
      { level: 'INFO ', message: 'Starting 1-hop and 2-hop neighborhood impact analysis.', delayAfter: d.quick },
      { level: 'INFO ', message: 'Scanning direct neighbors for control spread potential.', delayAfter: d.normal },
      { level: 'INFO ', message: 'Expanding relay paths to 2-hop infrastructure neighborhoods.', delayAfter: d.medium },
      { level: 'DEBUG', message: 'Tracing downstream dependency chains.', delayAfter: d.medium },
      { level: 'DEBUG', message: 'Tracing upstream gateway influence channels.', delayAfter: d.medium },
      { level: 'INFO ', message: 'Grouping workstation and server clusters around candidate nodes.', delayAfter: d.normal },
      { level: 'INFO ', message: 'Estimating subnet spillover probability for boundary devices.', delayAfter: d.normal },
      { level: 'INFO ', message: 'Merged neighborhood impact score into candidate ranking.', delayAfter: d.normal },
      { level: 'INFO ', message: 'Completed related-node impact analysis.', delayAfter: d.hold }
    ])
  },
  'target-validation': {
    logs: buildTimedLogs([
      { level: 'INFO ', message: 'Starting target validity validation.', delayAfter: d.quick },
      { level: 'INFO ', message: 'Estimating false-positive risk for top-ranked nodes.', delayAfter: d.normal },
      { level: 'INFO ', message: 'Running replaceability analysis on candidate paths.', delayAfter: d.normal },
      { level: 'DEBUG', message: 'Checking uniqueness of control paths and route leverage.', delayAfter: d.medium },
      { level: 'DEBUG', message: 'Reviewing infrastructure dependency concentration.', delayAfter: d.medium },
      { level: 'INFO ', message: 'Pruning low-uniqueness and low-control candidates.', delayAfter: d.normal },
      { level: 'INFO ', message: 'Verifying explainability and analyst review consistency.', delayAfter: d.normal },
      { level: 'INFO ', message: 'Validation evidence bundle assembled for retained targets.', delayAfter: d.normal },
      { level: 'INFO ', message: 'Completed target validity validation.', delayAfter: d.hold }
    ])
  },
  'final-scoring': {
    logs: buildTimedLogs([
      { level: 'INFO ', message: 'Loading structural, GNN, role and neighborhood scores.', delayAfter: d.quick },
      { level: 'INFO ', message: 'Loading validation confidence weights.', delayAfter: d.quick },
      { level: 'INFO ', message: 'Starting weighted aggregation for final target scoring.', delayAfter: d.medium },
      { level: 'DEBUG', message: 'Applying threshold labels to ranked candidates.', delayAfter: d.normal },
      { level: 'INFO ', message: 'Sorting candidates by integrated target score.', delayAfter: d.normal },
      { level: 'INFO ', message: 'Preparing candidate target list and top-target evidence package.', delayAfter: d.normal },
      { level: 'INFO ', message: 'Final scoring summary: best=96.4, retained=5.', delayAfter: d.quick },
      { level: 'INFO ', message: 'Completed final scoring stage.', delayAfter: d.hold }
    ])
  }
};

const getStepDuration = (stepKey) => {
  const template = STEP_RESULT_TEMPLATES[stepKey];
  if (!template?.logs?.length) return 3200;

  const total = template.logs.reduce((sum, item) => sum + (item.delayAfter ?? 400), 0);
  return Math.max(total + 900, 3000);
};

export default function IdentificationCollection() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [runToken, setRunToken] = useState(0);
  const [streamedLogs, setStreamedLogs] = useState([]);
  const timerRef = useRef(null);

  const currentStep = PIPELINE_STEPS[currentStepIndex];
  const progress = useMemo(
    () => Math.round(((currentStepIndex + 1) / PIPELINE_STEPS.length) * 100),
    [currentStepIndex]
  );

  useEffect(() => {
    if (!isPlaying) return undefined;

    const duration = getStepDuration(currentStep?.key);
    timerRef.current = window.setTimeout(() => {
      setCurrentStepIndex((prev) => (prev < PIPELINE_STEPS.length - 1 ? prev + 1 : prev));
    }, duration);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [currentStepIndex, isPlaying, runToken, currentStep?.key]);

  useEffect(() => {
    const step = PIPELINE_STEPS[currentStepIndex];
    if (!step) return undefined;

    const logs = Array.isArray(STEP_RESULT_TEMPLATES[step.key]?.logs)
      ? STEP_RESULT_TEMPLATES[step.key].logs
      : [];

    setStreamedLogs([]);

    let cancelled = false;
    let accumulatedDelay = 0;
    const timers = [];

    logs.forEach((logItem, index) => {
      const delay = logItem.delayAfter ?? 400;

      const id = window.setTimeout(() => {
        if (cancelled) return;

        setStreamedLogs((prev) => [
          ...prev,
          {
            id: `${step.key}-${index}-${Date.now()}`,
            timestamp: logItem.timestamp,
            level: logItem.level,
            message: logItem.message
          }
        ]);
      }, accumulatedDelay);

      timers.push(id);
      accumulatedDelay += delay;
    });

    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [currentStepIndex, runToken]);

  const handlePlayPause = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleReset = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setIsPlaying(false);
    setCurrentStepIndex(0);
    setStreamedLogs([]);
    setRunToken((prev) => prev + 1);
  };

  const handleRestartAndPlay = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setCurrentStepIndex(0);
    setStreamedLogs([]);
    setRunToken((prev) => prev + 1);
    setIsPlaying(true);
  };

  return (
    <Box sx={{ width: '100%', height: '100%', minHeight: '100vh', bgcolor: '#f8fafc' }}>
      <Stack spacing={1.2} sx={{ height: '100%', p: 1.4 }}>
        <Card sx={{ borderRadius: 4, boxShadow: '0 10px 26px rgba(15,23,42,0.06)' }}>
          <CardContent sx={{ py: 1.1, px: 1.4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Box>
                <Typography sx={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>
                  지능형 표적 식별 파이프라인
                </Typography>
                <Typography sx={{ fontSize: '0.73rem', color: '#64748b', mt: 0.2 }}>
                  8단계 분석 흐름에 따라 로그를 스트리밍하고, 최종 단계 완료 후 후보 표적 목록을 생성합니다.
                </Typography>
              </Box>

              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                  onClick={handlePlayPause}
                  sx={{ borderRadius: 999 }}
                >
                  {isPlaying ? '일시정지' : '재생'}
                </Button>

                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ClearOutlined />}
                  onClick={handleReset}
                  sx={{ borderRadius: 999 }}
                >
                  초기화
                </Button>

                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ClockCircleOutlined />}
                  onClick={handleRestartAndPlay}
                  sx={{ borderRadius: 999 }}
                >
                  다시 실행
                </Button>
              </Stack>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 1 }}>
              {currentStepIndex >= PIPELINE_STEPS.length - 1 && !isPlaying ? (
                <CheckCircleFilled style={{ color: '#10b981' }} />
              ) : (
                <ClockCircleOutlined style={{ color: '#5b8cff' }} />
              )}
              <Typography sx={{ fontSize: '0.72rem', color: '#475569', fontWeight: 700 }}>
                Current Step: {currentStep?.title ?? '-'} / Progress {progress}%
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Box sx={{ flex: 1, minHeight: 0 }}>
          <TargetIdentification
            steps={PIPELINE_STEPS}
            currentStepIndex={currentStepIndex}
            streamedLogs={streamedLogs}
            isPlaying={isPlaying}
            pipelineTitle="지능형 표적 식별 파이프라인"
          />
        </Box>
      </Stack>
    </Box>
  );
}