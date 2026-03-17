const osintBottomCards = [
  {
    logCard: 'BGP 트래픽 수집 현황',
    title: 'BGP 트래픽 수집 현황',
    subtitle: '전체 트래픽 수·현재 트래픽 수·국가별 출발지·목적지 통계',
    modules: [
      { label: '전체 트래픽', content: '수집된 BGP 아카이브 전체 트래픽 건수를 집계하여 표시합니다.' },
      { label: '현재 트래픽', content: '날짜 필터 기준으로 현재 화면에 표시 중인 트래픽 건수를 나타냅니다.' },
      { label: '국가 정보', content: '출발지·목적지 국가명을 한국어로 표시하며 트래픽 경로를 추적합니다.' }
    ],
    tags: ['#BGP수집', '#트래픽통계', '#국가별현황']
  },
  {
    logCard: '글로벌 트래픽 흐름 가시화',
    title: '글로벌 트래픽 흐름 가시화',
    subtitle: '세계 지도 위 출발지·목적지 간 트래픽 경로 시각화',
    modules: [
      { label: '출발지', content: '노란색 마커로 공격 출발지 국가 위치를 지도에 표시합니다.' },
      { label: '목적지', content: '청색 마커로 공격 목표 국가 위치를 지도에 표시합니다.' },
      { label: '경로 연결선', content: '붉은 선으로 출발지에서 목적지까지의 트래픽 경로를 나타냅니다.' }
    ],
    tags: ['#세계지도', '#경로시각화', '#위협흐름']
  },
  {
    logCard: '트래픽 상세 로그',
    title: '트래픽 상세 로그',
    subtitle: '출발지·목적지 IP, 네트워크, 게이트웨이, DNS, 시간 정보 제공',
    modules: [
      { label: 'IP 정보', content: '출발지 IP와 목적지 IP를 개별 항목으로 로그에 기록합니다.' },
      { label: '네트워크 정보', content: '서브넷 기반 네트워크, 게이트웨이, DNS 서버 정보를 함께 표시합니다.' },
      { label: '트래픽 시간', content: '트래픽 발생 시간을 한국 시간(KST) 기준으로 기록·표시합니다.' }
    ],
    tags: ['#IP추적', '#네트워크정보', '#트래픽시간']
  },
  {
    logCard: '융합 데이터베이스 구축',
    title: '융합 데이터베이스 구축',
    subtitle: 'MongoDB 저장 후 Neo4j 그래프 DB로 융합하여 위협 관계망 분석',
    modules: [
      { label: 'MongoDB', content: 'BGP 아카이브 트래픽 데이터를 수집·저장하는 1차 저장소입니다.' },
      { label: 'Neo4j', content: '수집 데이터를 그래프 관계로 변환하여 위협 노드 간 연결을 분석합니다.' },
      { label: '프로세스 제어', content: 'Start·Stop·Restart 버튼으로 수집 및 융합 프로세스를 실시간으로 제어합니다.' }
    ],
    tags: ['#MongoDB', '#Neo4j', '#융합DB']
  }
];

export default osintBottomCards;
