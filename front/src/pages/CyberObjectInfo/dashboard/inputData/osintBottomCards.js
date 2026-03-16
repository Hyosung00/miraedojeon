const osintBottomCards = [
  {
    logCard: 'OSINT 데이터 표',
    title: '데이터 표 - 수집 소스 현황',
    subtitle: '수집 채널, 데이터 건수, 최신 수집 시각을 표 형태로 표시',
    modules: [
      { label: '표', content: 'AS 번호, 국가, 수집 건수, 최신 이벤트 시간을 표로 제공합니다.' },
      { label: '그래프', content: '시간대별 이상 이벤트 분포를 막대/선 그래프로 비교합니다.' },
      { label: '세부 과업', content: '누락 데이터 탐지, 라우팅 이상치 검증, 소스 품질 점검을 수행합니다.' }
    ],
    tags: ['#수집소스', '#이상징후', '#시간축분석']
  },
  {
    logCard: 'OSINT 경로 그래프',
    title: '경로 그래프 - 위협 흐름',
    subtitle: '위협 발원지에서 대상 네트워크까지의 경로를 시각화',
    modules: [
      { label: '표', content: '발원지 AS, 경유 AS, 도착지 AS 관계를 경로 표로 제공합니다.' },
      { label: '그래프', content: '경유지별 위험 점수를 링크 두께와 색상으로 강조합니다.' },
      { label: '세부 과업', content: '비정상 우회 경로 식별, 우선 차단 후보 노드 선정을 수행합니다.' }
    ],
    tags: ['#경로시각화', '#위협흐름', '#우회탐지']
  },
  {
    logCard: 'OSINT 트렌드 분석',
    title: '트렌드 분석 - 빈도/집중도',
    subtitle: '시간 흐름에 따른 공격 빈도와 집중 구간을 분석',
    modules: [
      { label: '표', content: '일/주/월 단위 빈도와 피크 구간을 요약 표로 표시합니다.' },
      { label: '그래프', content: '이상치 발생 추이를 선형 차트로 제공하여 패턴을 비교합니다.' },
      { label: '세부 과업', content: '급증 시점 원인 분석, 경보 임계치 재조정, 룰 업데이트를 진행합니다.' }
    ],
    tags: ['#시계열', '#피크탐지', '#룰튜닝']
  },
  {
    logCard: 'OSINT 운영 과업',
    title: '운영 과업 - 대응 우선순위',
    subtitle: '탐지 결과를 운영 작업 단위로 분해해 관리',
    modules: [
      { label: '표', content: '위험도, 영향 범위, 처리 상태 기준으로 작업 목록을 제공합니다.' },
      { label: '그래프', content: '처리 진행률과 미해결 건수를 대시보드 그래프로 집계합니다.' },
      { label: '세부 과업', content: '고위험 이벤트 선조치, 티켓 발행, 사후 리포트 자동화를 수행합니다.' }
    ],
    tags: ['#우선순위', '#운영대응', '#진행률']
  }
];

export default osintBottomCards;
