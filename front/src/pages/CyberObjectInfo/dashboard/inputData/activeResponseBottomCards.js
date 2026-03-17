const activeResponseBottomCards = [
  {
    logCard: '능동 대응 시나리오 표',
    title: '시나리오 표 - 대응 옵션 비교',
    subtitle: '차단/우회/격리 시나리오를 표로 비교',
    modules: [
      { label: '표', content: '시나리오명, 적용 대상, 예상 효과, 부작용을 표로 제공함.' },
      { label: '그래프', content: '시나리오별 효과 대비 비용을 비교 그래프로 표시함.' },
      { label: '세부 과업', content: '사전 검토, 승인 체계 적용, 롤백 계획 수립을 수행함.' }
    ],
    tags: ['#시나리오비교', '#효과분석', '#롤백계획']
  },
  {
    logCard: '차단 효과 그래프',
    title: '효과 그래프 - 차단/완화 결과',
    subtitle: '정책 적용 전후의 위협 감소 효과를 시각화',
    modules: [
      { label: '표', content: '적용 정책, 전/후 이벤트 수, 감소율을 결과 표로 제공함.' },
      { label: '그래프', content: '정책별 감소율과 반응 시간을 시계열 그래프로 표시함.' },
      { label: '세부 과업', content: '저효율 정책 대체, 룰 재정의, 자동화 트리거 점검을 수행함.' }
    ],
    tags: ['#정책효과', '#감소율', '#반응시간']
  },
  {
    logCard: '우회/방어 전략',
    title: '전략 그래프 - 우회 경로 통제',
    subtitle: '우회 가능 경로에 대한 방어 전략을 분석',
    modules: [
      { label: '표', content: '우회 경로, 노출 자산, 통제 수준을 전략 표로 정리함.' },
      { label: '그래프', content: '통제 적용 전후 경로 노출도를 비교 그래프로 표시함.' },
      { label: '세부 과업', content: '고노출 경로 우선 통제, 방어 계층 보강, 정책 검증을 수행함.' }
    ],
    tags: ['#우회통제', '#노출도', '#방어계층']
  },
  {
    logCard: '능동 대응 운영 과업',
    title: '운영 과업 - 대응 실행 관리',
    subtitle: '능동 대응 정책을 실행/검증/개선 주기로 운영',
    modules: [
      { label: '표', content: '실행 작업, 승인 상태, 검증 결과, 재작업 여부를 관리 표로 제공함.' },
      { label: '그래프', content: '작업 처리량과 정책 성공률을 운영 지표로 표시함.' },
      { label: '세부 과업', content: '정책 배포, 효과 검증, 지속 개선 루프를 수행함.' }
    ],
    tags: ['#실행관리', '#성공률', '#지속개선']
  }
];

export default activeResponseBottomCards;
