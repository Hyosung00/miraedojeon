const activeResponseBottomCards = [
  {
    logCard: '능동 대응 시나리오 표',
    title: '대응 자산 분포 - 장치 유형 집중도',
    subtitle: 'zone7 장치 유형 비중을 도넛 차트로 시각화',
    modules: [
      { label: '그래프', content: 'zone7 물리 토폴로지에서 수집한 장치 type을 switch/router/server/firewall/workstation 등으로 집계해 도넛 차트로 표시하고, 비중 상위 5개 유형 집중도를 통해 대응 우선 시나리오를 도출함.' },
      { label: '세부 과업', content: '사전 검토, 승인 체계 적용, 롤백 계획 수립을 수행함.' }
    ],
    tags: ['#자산분포', '#유형집중도', '#도넛차트']
  },
  {
    logCard: '차단 효과 그래프',
    title: '효과 그래프 - 차단/완화 결과',
    subtitle: '정책 적용 전후의 위험군 감소 효과를 시각화',
    modules: [
      { label: '그래프', content: 'RS( degree*0.6 + con*0.4 ) 기준으로 고/중/저 위험군을 분리하고, 차단 전(red)·차단 후(green) 노드 수를 그룹 바 차트로 비교해 위험군별 완화율 편차를 확인함.' },
      { label: '세부 과업', content: '저효율 정책 대체, 룰 재정의, 자동화 트리거 점검을 수행함.' }
    ],
    tags: ['#정책효과', '#RS점수', '#차단전후']
  },
  {
    logCard: '우회/방어 전략',
    title: '전략 그래프 - 우회 경로 통제',
    subtitle: '우회 가능 경로에 대한 방어 전략을 분석',
    modules: [
      { label: '그래프', content: '물리 네트워크 중심-주변 토폴로지에서 공격경로(빨간 점선)와 정상연결(보라 실선)을 분리 표시하고, 고위험 노드 링 강조를 통해 우회 가능 링크·핵심 방어 지점을 동시에 식별함.' },
      { label: '세부 과업', content: '고노출 경로 우선 통제, 방어 계층 보강, 정책 검증을 진행함.' }
    ],
    tags: ['#우회통제', '#공격경로', '#방어계층']
  },
  {
    logCard: '능동 대응 운영 과업',
    title: '운영 과업 - 대응 실행 관리',
    subtitle: '능동 대응 정책을 실행/검증/개선 루프로 운영',
    modules: [
      { label: '그래프', content: 'RS 점수를 10% 단위(10~100%) 버킷으로 분할해 노드 분포를 Area 차트로 표현하고, 피크 구간·꼬리 구간을 통해 정책 적용 대상의 집중도와 잔존 위험 구간을 추적함.' },
      { label: '세부 과업', content: '정책 배포, 효과 검증, 지속 개선 루프를 수행함.' }
    ],
    tags: ['#RS분포', '#운영과업', '#지속개선']
  }
];

export default activeResponseBottomCards;
