import React, { useEffect, useMemo, useState } from 'react';
import { Box, Button, Card, CardContent, Typography } from '@mui/material';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ClearOutlined,
  CheckCircleFilled,
  ClockCircleOutlined
} from '@ant-design/icons';
import NetworkDataCollection from '../../IntelligentCyberTargets/TargetPriority/NetworkDataCollection';

const PIPELINE_STEPS = [
  {
    key: 'traffic-ingestion',
    title: '네트워크 트래픽 추출',
    shortTitle: '트래픽 추출',
    description:
      '네트워크 원천 트래픽을 수집하고 flow/session 단위 메타데이터를 추출합니다.'
  },
  {
    key: 'topology-generation',
    title: '네트워크 토폴로지 생성',
    shortTitle: '토폴로지 생성',
    description:
      '트래픽 기반 통신 관계를 분석하여 네트워크 토폴로지 노드 및 엣지를 생성합니다.'
  },
  {
    key: 'infrastructure-inference',
    title: '토폴로지 인프라 추론',
    shortTitle: '인프라 추론',
    description:
      '토폴로지 구조를 바탕으로 게이트웨이, 서버군, 핵심 노드의 역할을 추론합니다.'
  },
  {
    key: 'consistency-validation',
    title: '데이터 정합성 검증',
    shortTitle: '정합성 검증',
    description:
      '분석 전 데이터 정합성, 스키마 일관성, 누락 및 이상 관계를 검사합니다.'
  },
  {
    key: 'normalization',
    title: '결측치 / 이상치 제거 및 정규화',
    shortTitle: '정제 및 정규화',
    description:
      '결측치와 이상치를 처리하고 feature scale 및 표현 형식을 정규화합니다.'
  },
  {
    key: 'augmentation',
    title: '네트워크 노드 특징 증강',
    shortTitle: '특징 증강',
    description:
      '토폴로지 기반 문맥 정보와 추론 결과를 바탕으로 노드 특징을 증강합니다.'
  },
  {
    key: 'analysis-ready',
    title: '분석을 위한 데이터셋 정리',
    shortTitle: '데이터셋 정리',
    description:
      '정제 및 증강이 완료된 데이터를 분석 가능한 데이터셋 형태로 정리합니다.'
  }
];

const d = {
  flash: 40,
  burst: 70,
  fast: 180,
  quick: 120,
  normal: 220,
  medium: 330,
  load: 1550,
  heavy: 1050,
  save: 720,
  finalize: 200
};

const STEP_RESULT_TEMPLATES = {
  'traffic-ingestion': {
    logs: [
      { message: '[BOOT   ] Collector bootstrap 시작.', delayAfter: d.fast },
      { message: '[CONFIG ] Config 로드 (./config/collector.yml).', delayAfter: d.load },
      { message: '[INPUT  ] Source binding 확인 (eth0, mirror-port-1).', delayAfter: d.medium },
      { message: '[FILTER ] Capture filter 적용 (tcp, udp, icmp).', delayAfter: d.quick },
      { message: '[BUFFER ] Ring buffer 할당 (size=512MB).', delayAfter: d.load },
      { message: '[FILE   ] Raw capture target 생성 (/data/capture/traffic_20260322_2048.pcap).', delayAfter: d.medium },
      { message: '[PCAP   ] Packet decoding 시작 (libpcap).', delayAfter: d.flash },
      { message: '[FLOW   ] 5-tuple flow extraction 시작.', delayAfter: d.flash },
      { message: '[FLOW   ] Session window 정렬.', delayAfter: d.burst },
      { message: '[FLOW   ] TCP/UDP/ICMP 분류.', delayAfter: d.burst },
      { message: '[CLEAN  ] Duplicate packet 정리.', delayAfter: d.fast },
      { message: '[CLEAN  ] Retransmission 구간 정리.', delayAfter: d.fast },
      { message: '[SPLIT  ] Incomplete session 분리.', delayAfter: d.fast },
      { message: '[BATCH  ] Batch 분할 (window=60s, batch_id=batch_0001).', delayAfter: d.normal },
      { message: '[STATS  ] Parsed packets=58,412 / flows=3,294 / sessions=1,102.', delayAfter: d.medium },
      { message: '[OUTPUT ] Flow metadata 저장 (/data/batch/batch_0001.parquet).', delayAfter: d.save },
      { message: '[DONE   ] 네트워크 트래픽 추출 완료.', delayAfter: d.quick }
    ],
    metrics: {
      수집레코드: '98,182,532',
      플로우수: '3,000,000',
      세션수: '1,000,000'
    },
    highlights: [
      '대용량 트래픽 수집 완료.',
      'Raw → Flow 변환 완료.'
    ]
  },

  'topology-generation': {
    logs: [
      { message: '[GRAPH  ] Topology builder 초기화.', delayAfter: d.quick },
      { message: '[INPUT  ] Batch 로드 (/data/batch/batch_0001.parquet).', delayAfter: d.load },
      { message: '[NODE   ] Endpoint scan 시작 (src_ip, dst_ip, port).', delayAfter: d.quick },
      { message: '[NODE   ] Node candidate 생성 (active endpoints=824).', delayAfter: d.medium },
      { message: '[EDGE   ] Flow relation scan 시작.', delayAfter: d.quick },
      { message: '[EDGE   ] Edge candidate 생성 (raw edges=4,128,554).', delayAfter: d.heavy },
      { message: '[EDGE   ] Duplicate edge 병합.', delayAfter: d.medium },
      { message: '[EDGE   ] Edge weight 계산 (frequency-based).', delayAfter: d.medium },
      { message: '[TEMP   ] Temporal ordering 적용.', delayAfter: d.heavy },
      { message: '[CLUSTER] Connected components 탐색.', delayAfter: d.heavy },
      { message: '[CLUSTER] Subgraph grouping 정리.', delayAfter: d.medium },
      { message: '[GRAPH  ] Graph serialization (/data/graph/topology_0001.bin).', delayAfter: d.save },
      { message: '[STATS  ] nodes=824 / edges=3,912,440 / components=126.', delayAfter: d.normal },
      { message: '[DONE   ] 네트워크 토폴로지 생성 완료.', delayAfter: d.quick }
    ],
    metrics: {
      노드수: '824',
      엣지수: '3,912,440',
      컴포넌트수: '126'
    },
    highlights: [
      '고정 엔드포인트 중심 그래프 생성 완료.',
      '연간 통신 구조 모델링 완료.'
    ]
  },

  'infrastructure-inference': {
    logs: [
      { message: '[INFER  ] Inference engine 초기화.', delayAfter: d.quick },
      { message: '[INPUT  ] Graph 로드 (/data/graph/topology_0001.bin).', delayAfter: d.load },
      { message: '[SCORE  ] Degree centrality 계산.', delayAfter: d.medium },
      { message: '[SCORE  ] Betweenness centrality 계산.', delayAfter: d.heavy },
      { message: '[TRAFFIC] High-traffic node scan.', delayAfter: d.medium },
      { message: '[ROLE   ] Gateway 후보 탐색.', delayAfter: d.medium },
      { message: '[ROLE   ] Server 후보 탐색.', delayAfter: d.medium },
      { message: '[RULE   ] Rule-based classification 적용.', delayAfter: d.medium },
      { message: '[MODEL  ] Heuristic role scoring 적용.', delayAfter: d.heavy },
      { message: '[PATH   ] Service dependency tracing.', delayAfter: d.heavy },
      { message: '[LAYER  ] Gateway → App → Storage layer 정리.', delayAfter: d.medium },
      { message: '[CONF   ] Role confidence score 계산.', delayAfter: d.normal },
      { message: '[OUTPUT ] Infra role 저장 (/data/inference/infra_roles_0001.json).', delayAfter: d.save },
      { message: '[DONE   ] 토폴로지 인프라 추론 완료.', delayAfter: d.quick }
    ],
    metrics: {
      추론역할수: '12',
      게이트웨이수: '7',
      서버수: '9'
    },
    highlights: [
      '인프라 구조 추론 완료.',
      '핵심 노드 식별 완료.'
    ]
  },

  'consistency-validation': {
    logs: [
      { message: '[CHECK  ] Validation module 초기화.', delayAfter: d.fast },
      { message: '[INPUT  ] Validation target 로드 (/data/inference/infra_roles_0001.json).', delayAfter: d.medium },

      { message: '[CHECK  ] Schema validation.', delayAfter: d.flash },
      { message: '[CHECK  ] Required field scan.', delayAfter: d.flash },
      { message: '[CHECK  ] Null reference scan.', delayAfter: d.flash },
      { message: '[CHECK  ] Node-edge integrity scan.', delayAfter: d.burst },
      { message: '[CHECK  ] Edge direction consistency scan.', delayAfter: d.burst },
      { message: '[CHECK  ] Component linkage scan.', delayAfter: d.burst },
      { message: '[CHECK  ] Role conflict detection.', delayAfter: d.burst },
      { message: '[CHECK  ] Orphan edge detection.', delayAfter: d.burst },
      { message: '[CHECK  ] Invalid endpoint mapping detection.', delayAfter: d.fast },

      { message: '[FIX    ] Auto-correction rule 적용.', delayAfter: d.quick },
      { message: '[FIX    ] Invalid relation 정리.', delayAfter: d.burst },
      { message: '[FIX    ] Broken reference 정리.', delayAfter: d.burst },
      { message: '[RECHECK] Corrected data 재검증.', delayAfter: d.fast },

      { message: '[STATS  ] valid=11,904 / anomaly=14 / fixed=14.', delayAfter: d.normal },
      { message: '[OUTPUT ] Validated batch 저장 (/data/validated/validated_0001.parquet).', delayAfter: d.save },
      { message: '[DONE   ] 데이터 정합성 검증 완료.', delayAfter: d.fast }
    ],
    metrics: {
      검증완료건수: '28,473,591',
      이상건수: '18,432',
      해결건수: '18,425'
    },
    highlights: [
      '일부 핵심 레코드만 검증 반영.',
      '이상 데이터 정리 완료.'
    ]
  },

  normalization: {
    logs: [
      { message: '[NORM   ] Normalization pipeline 초기화.', delayAfter: d.fast },
      { message: '[INPUT  ] Validated batch 로드 (/data/validated/validated_0001.parquet).', delayAfter: d.medium },

      { message: '[SCAN   ] Missing field 탐지.', delayAfter: d.flash },
      { message: '[SCAN   ] Outlier candidate 탐지.', delayAfter: d.flash },
      { message: '[SCAN   ] Categorical mismatch 탐지.', delayAfter: d.flash },
      { message: '[FILL   ] Missing value 보정.', delayAfter: d.burst },
      { message: '[FILL   ] Default rule 적용.', delayAfter: d.burst },
      { message: '[DROP   ] Extreme outlier 제거.', delayAfter: d.burst },
      { message: '[DROP   ] Invalid row 정리.', delayAfter: d.burst },
      { message: '[NORM   ] Protocol / endpoint 표현 정규화.', delayAfter: d.fast },
      { message: '[SCALE  ] Feature scaling 적용 (min-max / standard).', delayAfter: d.quick },
      { message: '[ENCODE ] Categorical encoding 적용.', delayAfter: d.fast },
      { message: '[CHECK  ] Feature consistency 확인 완료.', delayAfter: d.fast },

      { message: '[OUTPUT ] Normalized batch 저장 (/data/normalized/norm_0001.parquet).', delayAfter: d.save },
      { message: '[STATS  ] normalized_fields=24 / scaled_features=18 / cleaned_rows=37.', delayAfter: d.normal },
      { message: '[DONE   ] 결측치 / 이상치 제거 및 정규화 완료.', delayAfter: d.fast }
    ],
    metrics: {
      정규화필드수: '31',
      스케일조정특징수: '22',
      이상치처리수: '182,541'
    },
    highlights: [
      '결측치/이상치 처리 완료.',
      'Feature 정규화 완료.'
    ]
  },

  augmentation: {
    logs: [
      { message: '[AUG    ] Feature augmentation 시작.', delayAfter: d.quick },
      { message: '[INPUT  ] Normalized batch 로드 (/data/normalized/norm_0001.parquet).', delayAfter: d.load },
      { message: '[GRAPH  ] Neighborhood context 로드.', delayAfter: d.medium },
      { message: '[EMBED  ] Node embedding 계산.', delayAfter: d.heavy },
      { message: '[AGG    ] Neighbor feature aggregation.', delayAfter: d.heavy },
      { message: '[AUG    ] Traffic density feature 생성.', delayAfter: d.normal },
      { message: '[AUG    ] Gateway reachability feature 생성.', delayAfter: d.normal },
      { message: '[AUG    ] Service dependency feature 생성.', delayAfter: d.medium },
      { message: '[AUG    ] Temporal feature 확장.', delayAfter: d.normal },
      { message: '[MERGE  ] Feature merge 수행.', delayAfter: d.medium },
      { message: '[CLEAN  ] Redundant feature 정리.', delayAfter: d.normal },
      { message: '[OUTPUT ] Augmented dataset 저장 (/data/augmented/aug_0001.parquet).', delayAfter: d.save },
      { message: '[DONE   ] 네트워크 노드 특징 증강 완료.', delayAfter: d.quick }
    ],
    metrics: {
      증강특징수: '14',
      문맥연결수: '83',
      강화레코드수: '28,472,391'
    },
    highlights: [
      '노드 특징 확장 완료.',
      '그래프 문맥 반영 완료.'
    ]
  },

  'analysis-ready': {
    logs: [
      { message: '[FINAL  ] Dataset finalizer 초기화.', delayAfter: d.quick },
      { message: '[INPUT  ] Augmented dataset 로드 (/data/augmented/aug_0001.parquet).', delayAfter: d.load },
      { message: '[CHECK  ] Input schema 검증.', delayAfter: d.normal },
      { message: '[CHECK  ] Required feature 존재 여부 확인.', delayAfter: d.fast },
      { message: '[CHECK  ] Graph connectivity 최종 확인.', delayAfter: d.medium },
      { message: '[SPLIT  ] Train / Validation / Test split (8:1:1).', delayAfter: d.heavy },
      { message: '[INDEX  ] Dataset indexing.', delayAfter: d.medium },
      { message: '[META   ] Metadata 생성 (version=20260322_01).', delayAfter: d.normal },
      { message: '[EXPORT ] PyG / DGL compatible format 변환.', delayAfter: d.heavy },
      { message: '[OUTPUT ] Final dataset 저장 (/data/final/dataset_0001.pt).', delayAfter: d.save },
      { message: '[STATS  ] records=11,904 / features=33 / output_batches=4.', delayAfter: d.normal },
      { message: '[READY  ] 분석 준비 상태 READY.', delayAfter: d.fast },
      { message: '[DONE   ] 분석을 위한 데이터셋 정리 완료.', delayAfter: d.quick }
    ],
    metrics: {
      준비상태: 'READY',
      출력배치수: '16',
      최종레코드수: '28,472,391'
    },
    highlights: [
      '분석용 데이터셋 생성 완료.',
      '모델 입력 준비 완료.'
    ]
  }
};

const getStepDuration = (stepKey) => {
  const template = STEP_RESULT_TEMPLATES[stepKey];

  if (!template?.logs?.length) {
    return 3000;
  }

  const totalLogDelay = template.logs.reduce((sum, item) => {
    if (typeof item === 'string') return sum + 700;
    return sum + (item.delayAfter ?? 700);
  }, 0);

  // 헤더 로그 + 결과 카드 표시 + 단계 전환 여유시간
  return Math.max(totalLogDelay + 900, 2500);
};

const KPI_CARD_ORDER = [
  '수집 레코드',
  '플로우 수',
  '세션 수',
  '노드 수',
  '엣지 수',
  '컴포넌트 수',
  '진행률',
  '품질 점수'
];

const buildKpis = (cycle, isRunning, currentStepIndex, totalSteps) => {
  const currentCycle = Math.max(1, cycle);

  const trafficRecords = 98182532 + currentCycle * 184231;
  const flows = 3000000 + currentCycle * 8421;
  const sessions = 1000000 + currentCycle * 3912;

  // 노드는 대규모 트래픽 대비 고정 엔드포인트 군집 특성을 반영해 800대에서만 소폭 변동
  const nodes = 824 + ((currentCycle - 1) % 3) * 6; // 824, 830, 836
  const edges = 3912440 + currentCycle * 5312;
  const components = 126 + ((currentCycle - 1) % 4) * 3; // 126, 129, 132, 135

  const progress = `${currentStepIndex + 1} / ${totalSteps} 단계`;
  const qualityScore = (92.1 + ((currentCycle - 1) % 4) * 0.1).toFixed(1);

  return [
    {
      title: '수집 레코드',
      value: trafficRecords.toLocaleString(),
      sub: 'Raw Input Size',
      accent: '#42a5f5'
    },
    {
      title: '플로우 수',
      value: flows.toLocaleString(),
      sub: 'Flow Aggregation',
      accent: '#26a69a'
    },
    {
      title: '세션 수',
      value: sessions.toLocaleString(),
      sub: 'Sessionization',
      accent: '#7e57c2'
    },
    {
      title: '노드 수',
      value: nodes.toLocaleString(),
      sub: 'Active Endpoints',
      accent: '#5c6bc0'
    },
    {
      title: '엣지 수',
      value: edges.toLocaleString(),
      sub: 'Communication Links',
      accent: '#26a69a'
    },
    {
      title: '컴포넌트 수',
      value: components.toLocaleString(),
      sub: 'Connected Subgraphs',
      accent: '#ffa726'
    },
    {
      title: '진행률',
      value: progress,
      sub: isRunning ? 'Pipeline Running' : 'Pipeline Paused',
      accent: isRunning ? '#66bb6a' : '#bdbdbd'
    },
    {
      title: '품질 점수',
      value: qualityScore,
      sub: 'Quality Summary',
      accent: '#ef5350'
    }
  ];
};

const formatCompact = (value) => {
  if (!value) return '';

  const num = Number(String(value).replace(/,/g, ''));

  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 0
  }).format(num);
};

const NetworkDataFusion = ({ isPopup = false }) => {
  const [isRunning, setIsRunning] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedStepKey, setSelectedStepKey] = useState(PIPELINE_STEPS[0].key);
  const [cycleNumber, setCycleNumber] = useState(1);
  const [stepHistory, setStepHistory] = useState([]);
  const [runToken, setRunToken] = useState(1);

  useEffect(() => {
    if (!isRunning) return;

    const currentStep = PIPELINE_STEPS[currentStepIndex];
    if (!currentStep) return;

    const duration = getStepDuration(currentStep.key);

    const timeoutId = setTimeout(() => {
      setStepHistory((history) => [
        ...history,
        {
          id: `${Date.now()}-${currentStepIndex}`,
          stepKey: currentStep.key,
          stepTitle: currentStep.title
        }
      ]);

      const nextIndex = (currentStepIndex + 1) % PIPELINE_STEPS.length;

      if (nextIndex === 0) {
        setCycleNumber((c) => c + 1);
      }

      setCurrentStepIndex(nextIndex);
    }, duration);

    return () => clearTimeout(timeoutId);
  }, [isRunning, currentStepIndex]);

  const selectedStep =
    PIPELINE_STEPS.find((step) => step.key === selectedStepKey) || PIPELINE_STEPS[0];

  const handleClear = () => {
    setIsRunning(false);
    setCurrentStepIndex(0);
    setSelectedStepKey(PIPELINE_STEPS[0].key);
    setCycleNumber(1);
    setStepHistory([]);
    setRunToken((v) => v + 1);
  };

  const kpis = useMemo(
    () => buildKpis(cycleNumber, isRunning, currentStepIndex, PIPELINE_STEPS.length),
    [cycleNumber, isRunning, currentStepIndex]
  );

  return (
    <Box
      sx={{
        width: '100%',
        height: isPopup ? '100%' : 'calc(100vh - 132px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(4, minmax(0, 1fr))',
            xl: 'repeat(8, minmax(0, 1fr))'
          },
          gap: 1.5,
          flexShrink: 0
        }}
      >
        {kpis
          .filter((card) => KPI_CARD_ORDER.includes(card.title))
          .map((card) => (
            <Card
              key={card.title}
              sx={{
                boxShadow: 2,
                borderRadius: 2,
                borderTop: `3px solid ${card.accent}`
              }}
            >
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography
                  sx={{
                    fontSize: '0.72rem',
                    color: 'text.secondary',
                    mb: 0.6,
                    fontWeight: 600
                  }}
                >
                  {card.title}
                </Typography>

                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 0.5
                  }}
                >
                  <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: '#333' }}>
                    {card.value}
                  </Typography>

                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      border: `2px solid ${card.accent}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: card.accent,
                      fontSize: '0.72rem',
                      fontWeight: 700
                    }}
                  >
                    {formatCompact(card.value)}
                  </Box>
                </Box>

                <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
                  {card.sub}
                </Typography>
              </CardContent>
            </Card>
          ))}
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '560px minmax(0, 1fr)' },
          gap: 2
        }}
      >
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
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1.5,
                  flexWrap: 'wrap'
                }}
              >
                <Box>
                  <Typography sx={{ fontSize: '1.15rem', fontWeight: 700 }}>
                    네트워크 데이터 파이프라인
                  </Typography>
                  <Typography sx={{ fontSize: '0.78rem', opacity: 0.75 }}>
                    트래픽 추출 · 토폴로지 생성 · 인프라 추론 · 정합성 검증 · 정규화 · 특징 증강 · 데이터셋 정리
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => setIsRunning(true)}
                    disabled={isRunning}
                    startIcon={<PlayCircleOutlined />}
                    sx={{
                      bgcolor: '#2e7d32',
                      '&:hover': { bgcolor: '#1b5e20' },
                      '&:disabled': { bgcolor: '#aaa' },
                      fontSize: '0.75rem',
                      py: 0.5
                    }}
                  >
                    Start
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => setIsRunning(false)}
                    disabled={!isRunning}
                    startIcon={<PauseCircleOutlined />}
                    sx={{
                      bgcolor: '#b71c1c',
                      '&:hover': { bgcolor: '#7f0000' },
                      '&:disabled': { bgcolor: '#aaa' },
                      fontSize: '0.75rem',
                      py: 0.5
                    }}
                  >
                    Stop
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleClear}
                    startIcon={<ClearOutlined />}
                    sx={{
                      bgcolor: '#1565c0',
                      '&:hover': { bgcolor: '#0d47a1' },
                      fontSize: '0.75rem',
                      py: 0.5
                    }}
                  >
                    Clear
                  </Button>
                </Box>
              </Box>

              <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pr: 0.5 }}>
                {PIPELINE_STEPS.map((step, index) => {
                  const isActive = index === currentStepIndex;
                  const isDone = index < currentStepIndex;
                  const isSelected = selectedStepKey === step.key;

                  return (
                    <Box key={step.key}>
                      <Box
                        onClick={() => setSelectedStepKey(step.key)}
                        sx={{
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 1.4,
                          p: 1.2,
                          borderRadius: 2,
                          border: isSelected
                            ? '2px solid #7c6ef6'
                            : '1px solid rgba(57, 48, 107, 0.14)',
                          bgcolor: isActive
                            ? 'rgba(124, 110, 246, 0.08)'
                            : isSelected
                              ? 'rgba(124, 110, 246, 0.04)'
                              : '#fff',
                          boxShadow: isActive ? '0 0 0 2px rgba(124,110,246,0.10)' : 'none',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <Box
                          sx={{
                            width: 28,
                            height: 28,
                            mt: 0.1,
                            borderRadius: '50%',
                            bgcolor: isDone ? '#43a047' : isActive ? '#7c6ef6' : '#e0e0e0',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: isActive ? '0 0 12px rgba(124,110,246,0.45)' : 'none'
                          }}
                        >
                          {isDone ? <CheckCircleFilled /> : <ClockCircleOutlined />}
                        </Box>

                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#2f285f' }}>
                            {step.title}
                          </Typography>
                          <Typography
                            sx={{
                              mt: 0.35,
                              fontSize: '0.78rem',
                              color: 'rgba(57,48,107,0.78)',
                              lineHeight: 1.45
                            }}
                          >
                            {step.description}
                          </Typography>

                          <Typography
                            sx={{
                              mt: 0.7,
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: isActive ? '#7c6ef6' : isDone ? '#43a047' : '#888'
                            }}
                          >
                            {isActive ? 'RUNNING' : isDone ? 'DONE' : 'PENDING'}
                          </Typography>
                        </Box>
                      </Box>

                      {index !== PIPELINE_STEPS.length - 1 && (
                        <Box
                          sx={{
                            ml: '13px',
                            height: 26,
                            width: 2,
                            bgcolor: index < currentStepIndex ? '#43a047' : 'rgba(57,48,107,0.18)'
                          }}
                        />
                      )}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </CardContent>
        </Card>

        <NetworkDataCollection
          selectedStep={selectedStep}
          currentStepIndex={currentStepIndex}
          cycleNumber={cycleNumber}
          isRunning={isRunning}
          stepTemplates={STEP_RESULT_TEMPLATES}
          stepHistory={stepHistory}
          pipelineSteps={PIPELINE_STEPS}
          runToken={runToken}
        />
      </Box>
    </Box>
  );
};

export default NetworkDataFusion;