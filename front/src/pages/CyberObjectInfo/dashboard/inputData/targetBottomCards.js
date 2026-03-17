const targetBottomCards = [
  {
    logCard: '표적 후보 표',
    title: '후보 표 - 핵심 표적 선별',
    subtitle: '후보 자산의 취약성·가치·접근성을 표로 비교',
    modules: [
      { label: '표', content: '후보 ID, 취약성 점수, 파급력, 접근 난이도를 표로 제공함.' },
      { label: '그래프', content: '후보별 종합 점수와 우선순위를 막대 그래프로 시각화함.' },
      { label: '세부 과업', content: '상위 후보 검증, 오탐 제거, 우선순위 조정을 수행함.' }
    ],
    tags: ['#표적선별', '#우선순위', '#다차원평가']
  },
  {
    logCard: '표적 의존성 그래프',
    title: '의존성 그래프 - 공격 벡터 분석',
    subtitle: '표적 중심 의존 관계와 공격 경로 분석',
    modules: [
      { label: '표', content: '의존 노드, 연결 강도, 공격 가능 벡터를 관계 표로 제공함.' },
      { label: '그래프', content: '중심 표적 주변의 공격 벡터를 그래프 형태로 강조함.' },
      { label: '세부 과업', content: '핵심 의존 경로 차단, 약한 연결점 보강, 대응 시나리오 업데이트를 수행함.' }
    ],
    tags: ['#의존성', '#공격벡터', '#경로차단']
  },
  {
    logCard: '표적 위험 추세',
    title: '위험 추세 - 위험도 변화',
    subtitle: '핵심 후보 표적의 위험도 변화 추세 분석',
    modules: [
      { label: '표', content: '기간별 위험 점수, 이벤트 수, 영향 범위를 추세 표로 제공함.' },
      { label: '그래프', content: '시간대별 위험도 상승/하락 구간을 선 그래프로 시각화함.' },
      { label: '세부 과업', content: '급상승 구간 원인 분석, 임계치 조정, 알림 정책 개선을 수행함.' }
    ],
    tags: ['#위험추세', '#임계치', '#알림정책']
  },
  {
    logCard: '표적 대응 과업',
    title: '운영 과업 - 표적 대응 실행',
    subtitle: '우선 표적 기반 대응 작업을 단계별 관리',
    modules: [
      { label: '표', content: '대응 항목, 담당자, 상태, SLA를 실행 표로 제공함.' },
      { label: '그래프', content: '진행률, 지연 작업, 위험 감소율을 운영 그래프로 표시함.' },
      { label: '세부 과업', content: '즉시 조치, 재평가, 결과 검증 및 리포트 생성을 수행함.' }
    ],
    tags: ['#대응실행', '#SLA', '#위험감소']
  }
];

export default targetBottomCards;
