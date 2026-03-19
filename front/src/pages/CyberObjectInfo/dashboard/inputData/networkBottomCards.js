const networkBottomCards = [
  {
    logCard: '네트워크 자산 표',
    title: '장비 유형 분포 - 내부/외부 자산',
    subtitle: '장비 종류 원형 분포',
    modules: [
      { label: '표', content: '노드명, IP, 존, 연결 수, 위험 점수를 표로 제공함.' },
      { label: '그래프', content: '존별 노드 수와 연결 밀도를 막대 그래프로 비교함.' },
      { label: '세부 과업', content: '미분류 자산 정리, 중요 노드 라벨링, 취약 구간 보강을 수행함.' }
    ],
    tags: ['#자산맵', '#연결밀도', '#존분석']
  },
  {
    logCard: '네트워크 토폴로지 그래프',
    title: '토폴로지 이벤트',
    subtitle: '분당 이벤트 추이',
    modules: [
      { label: '표', content: '거점 노드, 연결 경로, 병목 지표를 요약 표로 제공함.' },
      { label: '그래프', content: '중요 경로와 병목 링크를 네트워크 토폴로지로 강조함.' },
      { label: '세부 과업', content: '병목 경로 우선 개선, 우회 경로 설계, 라우팅 정책 점검을 수행함.' }
    ],
    tags: ['#토폴로지', '#병목구간', '#경로최적화']
  },
  {
    logCard: '내부 확산 시뮬레이션',
    title: '망 구간별 자산',
    subtitle: '망 구간별 자산 분포',
    modules: [
      { label: '표', content: '확산 단계, 예상 도달 시간, 영향 자산 수를 시나리오 표로 제공함.' },
      { label: '그래프', content: '시나리오별 확산 속도와 도달 범위를 비교 그래프로 표시함.' },
      { label: '세부 과업', content: '격리 정책 적용, 접근 제어 강화, 세그먼트 재구성을 수행함.' }
    ],
    tags: ['#확산예측', '#격리정책', '#세그먼트']
  },
  {
    logCard: '네트워크 운영 과업',
    title: '링크 유형 분포',
    subtitle: '링크 유형 분포 게이지',
    modules: [
      { label: '표', content: '개선 항목, 우선순위, 담당팀, 완료 예정일을 작업 표로 제공함.' },
      { label: '그래프', content: '개선 진행률과 잔여 리스크를 대시보드 그래프로 제공함.' },
      { label: '세부 과업', content: '고위험 경로 우선 조치, 변경관리 승인, 사후 검증을 수행함.' }
    ],
    tags: ['#구조개선', '#변경관리', '#잔여리스크']
  }
];

export default networkBottomCards;
