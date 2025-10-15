// 헤더 타이틀 매핑 객체
// 라우트 경로별로 헤더에 출력할 텍스트를 지정합니다.

const headerTitles = {
  "/": "Home",
  "/dashboard/default": "대시보드",
  "/CyberObjectInfo/MultilayerVisualization": "사이버 3계층 멀티레이어 가시화",
  "/Osint&DataFusion/GeoIP": "OSINT 정보 수집",
  "/Osint&Data Fusion/FusionDB": "융합 데이터베이스 구축",
  "/external-network/TimeSeriesVisualization": "시계열 기반 이상탐지",
  "/internal-network/internaltopology": "내부망 기본맵 가시화",
  "/internal-network/externaltopology": "외부망 토폴로지",
  "/target/targetIdentification": "네트워크 구조 분석 및 표적 식별",
  "/target/priorityVisualization": "핵심 표적 점수 분석",
  "/target/targetDashboard": "후보/핵심 표적 상세 가시화",
  "/ActiveResponse/threatanalysis": "위험 노출도 및 공격 가능도 측정",
  "/ActiveResponse/responseeffectvisualization": "능동 대응책 대응 효과/경로 가시화",
};

export default headerTitles;
