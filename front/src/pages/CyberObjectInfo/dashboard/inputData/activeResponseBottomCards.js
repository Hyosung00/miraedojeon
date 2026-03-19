const activeResponseBottomCards = [
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
    logCard: '새로 발견된 CVE',
    title: '새로 발견된 CVE',
    subtitle: 'CVSS-V3 점수 기반 취약점 목록',
    modules: [],
    tags: ['#CVE', '#CVSS', '#취약점']
  },
  {
    logCard: '대응 방책',
    title: '대응 방책',
    subtitle: '우회 경로 통제 전략 목록',
    modules: [],
    tags: ['#대응전략', '#방어정책', '#우회통제']
  }
];

export default activeResponseBottomCards;
