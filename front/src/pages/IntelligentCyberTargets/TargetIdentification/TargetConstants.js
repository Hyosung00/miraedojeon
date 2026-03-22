import TARGET_ROWS from './CandidateTarget.json';

export const DEFAULT_STEPS = [
  {
    key: 'graph-load',
    title: '네트워크 토폴로지 그래프 로드',
    description: '네트워크 토폴로지 그래프를 로드하고 zone / subnet 구조를 복원합니다.'
  },
  {
    key: 'feature-build',
    title: '노드 특징 구성 및 분석',
    description: '노드 속성과 네트워크 맥락 정보를 기반으로 특징 벡터를 구성합니다.'
  },
  {
    key: 'structural-scoring',
    title: '연결 구조 기반 중요도 계산',
    description: '중심성 및 경계성 기반으로 구조 중요도를 계산합니다.'
  },
  {
    key: 'gnn-scoring',
    title: '그래프 신경망 기반 중요도 계산',
    description: '관계 패턴과 주변 구조를 반영한 GNN 기반 중요도를 산출합니다.'
  },
  {
    key: 'role-assessment',
    title: '인프라 역할 및 제어 가능성 평가',
    description: '인프라 역할과 제어 가능성을 기준으로 후보 가치를 평가합니다.'
  },
  {
    key: 'neighbor-analysis',
    title: '연관 노드 영향 분석',
    description: '주변 장치에 대한 영향 범위와 확산 가능성을 분석합니다.'
  },
  {
    key: 'target-validation',
    title: '표적 유효성 검증',
    description: '오탐 가능성과 대체 가능성을 제거하고 유효 표적을 검증합니다.'
  },
  {
    key: 'final-scoring',
    title: '최종 점수 산출',
    description: '모든 분석 결과를 통합해 최종 후보 점수를 산출합니다.'
  }
];

export const STEP_DURATIONS = {
  quick: 240,
  normal: 360,
  medium: 560,
  heavy: 820,
  hold: 1200
};

export const TEMPLATE_BASE_TIME = new Date('2026-03-23T00:31:30.817');

export const buildTimedLogs = (items) => {
  let offset = 0;

  return items.map((item, index) => {
    const ts = new Date(TEMPLATE_BASE_TIME.getTime() + offset);
    offset += item.delayAfter ?? 400;

    return {
      id: `tmpl-${index}-${item.message}`,
      timestamp: ts,
      level: item.level ?? 'INFO ',
      message: item.message,
      delayAfter: item.delayAfter ?? 400
    };
  });
};

export const STEP_RESULT_TEMPLATES = {
  'graph-load': {
    logs: buildTimedLogs([
      { level: 'INFO ', message: 'Loading network topology graph from storage.', delayAfter: STEP_DURATIONS.quick },
      { level: 'INFO ', message: 'Restoring zone and subnet hierarchy.', delayAfter: STEP_DURATIONS.normal },
      { level: 'DEBUG', message: 'Scanning device nodes and physical/logical relations.', delayAfter: STEP_DURATIONS.medium },
      { level: 'INFO ', message: 'Resolved gateway mappings for boundary segments.', delayAfter: STEP_DURATIONS.normal },
      { level: 'INFO ', message: 'Detected isolated and bridge-capable nodes.', delayAfter: STEP_DURATIONS.normal },
      { level: 'INFO ', message: 'Completed topology graph loading stage.', delayAfter: STEP_DURATIONS.hold }
    ])
  },
  'feature-build': {
    logs: buildTimedLogs([
      { level: 'INFO ', message: 'Starting node feature construction.', delayAfter: STEP_DURATIONS.quick },
      { level: 'INFO ', message: 'Collecting degree, zone, subnet and traffic attributes.', delayAfter: STEP_DURATIONS.normal },
      { level: 'DEBUG', message: 'Encoding gateway adjacency and device role signals.', delayAfter: STEP_DURATIONS.medium },
      { level: 'INFO ', message: 'Normalizing per-node feature vectors.', delayAfter: STEP_DURATIONS.normal },
      { level: 'INFO ', message: 'Prepared graph input tensors for downstream scoring.', delayAfter: STEP_DURATIONS.hold }
    ])
  },
  'structural-scoring': {
    logs: buildTimedLogs([
      { level: 'INFO ', message: 'Calculating centrality and bridge-based structural scores.', delayAfter: STEP_DURATIONS.quick },
      { level: 'DEBUG', message: 'Tracing zone-boundary bridge nodes with relay behavior.', delayAfter: STEP_DURATIONS.normal },
      { level: 'INFO ', message: 'Boosting bridge-capable routers and relay switches.', delayAfter: STEP_DURATIONS.normal },
      { level: 'INFO ', message: 'Lowering rank for low-impact leaf nodes.', delayAfter: STEP_DURATIONS.quick },
      { level: 'INFO ', message: 'Structural ranking stabilized for top candidate set.', delayAfter: STEP_DURATIONS.hold }
    ])
  },
  'gnn-scoring': {
    logs: buildTimedLogs([
      { level: 'INFO ', message: 'Initializing graph neural network encoder.', delayAfter: STEP_DURATIONS.quick },
      { level: 'INFO ', message: 'Executing message passing layer 1.', delayAfter: STEP_DURATIONS.medium },
      { level: 'INFO ', message: 'Executing message passing layer 2.', delayAfter: STEP_DURATIONS.medium },
      { level: 'DEBUG', message: 'Updating relation-aware aggregation weights.', delayAfter: STEP_DURATIONS.medium },
      { level: 'INFO ', message: 'Recalculating candidate likelihoods using GNN outputs.', delayAfter: STEP_DURATIONS.normal },
      { level: 'INFO ', message: 'Completed graph neural network importance scoring.', delayAfter: STEP_DURATIONS.hold }
    ])
  },
  'role-assessment': {
    logs: buildTimedLogs([
      { level: 'INFO ', message: 'Starting infrastructure role assessment.', delayAfter: STEP_DURATIONS.quick },
      { level: 'INFO ', message: 'Assigning role weights to router, switch and firewall assets.', delayAfter: STEP_DURATIONS.normal },
      { level: 'DEBUG', message: 'Evaluating gateway adjacency and route mediation points.', delayAfter: STEP_DURATIONS.medium },
      { level: 'INFO ', message: 'Applying control premium to boundary routers and mediated firewalls.', delayAfter: STEP_DURATIONS.normal },
      { level: 'INFO ', message: 'Completed infrastructure role and controllability assessment.', delayAfter: STEP_DURATIONS.hold }
    ])
  },
  'neighbor-analysis': {
    logs: buildTimedLogs([
      { level: 'INFO ', message: 'Starting 1-hop and 2-hop neighborhood impact analysis.', delayAfter: STEP_DURATIONS.quick },
      { level: 'INFO ', message: 'Scanning direct neighbors for control spread potential.', delayAfter: STEP_DURATIONS.normal },
      { level: 'DEBUG', message: 'Tracing downstream dependency chains.', delayAfter: STEP_DURATIONS.medium },
      { level: 'INFO ', message: 'Estimating subnet spillover probability for boundary devices.', delayAfter: STEP_DURATIONS.normal },
      { level: 'INFO ', message: 'Completed related-node impact analysis.', delayAfter: STEP_DURATIONS.hold }
    ])
  },
  'target-validation': {
    logs: buildTimedLogs([
      { level: 'INFO ', message: 'Starting target validity validation.', delayAfter: STEP_DURATIONS.quick },
      { level: 'INFO ', message: 'Estimating false-positive risk for top-ranked nodes.', delayAfter: STEP_DURATIONS.normal },
      { level: 'DEBUG', message: 'Checking uniqueness of control paths and route leverage.', delayAfter: STEP_DURATIONS.medium },
      { level: 'INFO ', message: 'Pruning low-uniqueness and low-control candidates.', delayAfter: STEP_DURATIONS.normal },
      { level: 'INFO ', message: 'Completed target validity validation.', delayAfter: STEP_DURATIONS.hold }
    ])
  },
  'final-scoring': {
    logs: buildTimedLogs([
      { level: 'INFO ', message: 'Loading structural, GNN, role and neighborhood scores.', delayAfter: STEP_DURATIONS.quick },
      { level: 'INFO ', message: 'Loading validation confidence weights.', delayAfter: STEP_DURATIONS.quick },
      { level: 'INFO ', message: 'Starting weighted aggregation for final target scoring.', delayAfter: STEP_DURATIONS.medium },
      { level: 'INFO ', message: 'Sorting candidates by integrated target score.', delayAfter: STEP_DURATIONS.normal },
      { level: 'INFO ', message: 'Preparing candidate target list and top-target evidence package.', delayAfter: STEP_DURATIONS.normal },
      { level: 'INFO ', message: 'Completed final scoring stage.', delayAfter: STEP_DURATIONS.hold }
    ])
  }
};

export const getStepDuration = (stepKey) => {
  const template = STEP_RESULT_TEMPLATES[stepKey];
  if (!template?.logs?.length) return 3200;

  return Math.max(
    template.logs.reduce((sum, item) => sum + (item.delayAfter ?? 400), 0) + 600,
    3000
  );
};

const FALLBACK_TARGET_ROWS = (Array.isArray(TARGET_ROWS) ? TARGET_ROWS : []).map((item, index) => {
  const baseScore = Math.max(72, 96 - index * 3.2);

  return {
    ...item,
    neighborIds: Array.isArray(item.neighborIds)
      ? item.neighborIds
      : (Array.isArray(TARGET_ROWS) ? TARGET_ROWS : [])
          .filter((_, i) => i !== index)
          .slice(0, Math.min(3, Math.max(1, index + 1)))
          .map((target) => target.id),
    pagerank: item.pagerank ?? Number((0.92 - index * 0.05).toFixed(2)),
    betweenness: item.betweenness ?? Number((0.94 - index * 0.04).toFixed(2)),
    closeness: item.closeness ?? Number((0.83 - index * 0.03).toFixed(2)),
    gnn: item.gnn ?? Number((baseScore + 0.8).toFixed(1)),
    final: item.final ?? Number(baseScore.toFixed(1)),
    validity: item.validity ?? Math.max(70, 97 - index * 3),
    label:
      item.label ??
      (baseScore >= 90 ? '표적 적합' : baseScore >= 82 ? '관찰 필요' : '후보 유지'),
    traffic: item.traffic ?? `${Math.max(2.1, 6.8 - index * 0.5).toFixed(1)}M`,
    rationale:
      item.rationale ??
      `${item.type || 'device'} 장치로서 Zone ${item.zone ?? '-'} / ${item.subnet ?? '-'} 구간의 제어 및 중계 가능성을 보유.`,
    relationType: item.relationType ?? 'physical'
  };
});

export const INITIAL_VISIBLE_TARGETS = [...FALLBACK_TARGET_ROWS]
  .sort((a, b) => (b.final ?? 0) - (a.final ?? 0))
  .slice(0, 5);

export const SUMMARY_CARDS = [
  { label: '분석 대상 장치', value: '824', sub: 'Device nodes', accent: '#5b8cff' },
  { label: '후보 표적 수', value: '37', sub: 'Candidate targets', accent: '#14b8a6' },
  { label: '유효 표적 수', value: '12', sub: 'Validated targets', accent: '#8b5cf6' },
  { label: '최고 표적 점수', value: '96.4', sub: 'Best target score', accent: '#f97316' },
  { label: '평균 위험도', value: '71.2', sub: 'Average risk', accent: '#ef4444' },
  { label: 'Top-K 일치율', value: '68%', sub: 'GNN vs Structural', accent: '#4f46e5' },
  { label: '활성 Zone 수', value: '6', sub: 'Zone coverage', accent: '#0f766e' },
  { label: '관계 유형', value: '2', sub: 'Physical / Logical', accent: '#64748b' }
];

export const STEP_INSIGHTS = {
  'graph-load': [
    'zone / subnet 경계 구조가 그래프 형태로 복원됨',
    '고립 노드와 핵심 연결 노드가 1차적으로 분리됨',
    '후속 특징 분석이 가능한 그래프 상태가 확보됨'
  ],
  'feature-build': [
    'router / switch / firewall 계열 특징이 강화됨',
    'subnet 경계 및 gateway 인접성이 수치화됨',
    '노드별 입력 표현이 구조 분석용으로 정렬됨'
  ],
  'structural-scoring': [
    '경계 라우터와 집선 스위치가 상위로 이동함',
    '단순 연결 수보다 경로 제어력이 더 큰 영향을 보임',
    '교차 subnet / zone 노드가 우선 후보군으로 좁혀짐'
  ],
  'gnn-scoring': [
    '주변 관계 패턴이 유사한 경계 노드가 재상승함',
    '고전 점수 대비 제어 가능성이 높은 노드가 강화됨',
    '후보 우선순위가 구조 + 맥락 기준으로 재정렬됨'
  ],
  'role-assessment': [
    '경계 제어가 가능한 라우터/방화벽 계열이 강화됨',
    '단순 endpoint 장치는 후보 우선순위가 낮아짐',
    '실제 제어 가치가 있는 후보만 상위권에 남음'
  ],
  'neighbor-analysis': [
    '주변 장치에 대한 파급 범위가 큰 노드가 강화됨',
    '1-hop / 2-hop 영향이 큰 허브형 장치가 상위권에 유지됨',
    '확산 가능성이 낮은 말단 노드는 점수가 감소함'
  ],
  'target-validation': [
    '대체 가능한 후보가 제거되며 핵심 경로 중심 후보가 남음',
    '오탐 가능성이 높은 leaf/중복 노드가 정리됨',
    '실제 공격/제어 가치가 있는 노드만 유효군으로 남음'
  ],
  'final-scoring': [
    '구조/GNN/역할/영향/유효성 점수가 통합됨',
    '최종 후보 목록과 상위 표적 점수가 확정됨',
    '후보 표적 목록 및 상세 검증 결과가 동기화됨'
  ]
};