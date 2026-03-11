// 헤더 타이틀 매핑 객체
// 라우트 경로별로 헤더에 출력할 텍스트를 지정합니다.

const headerTitles = {
  "/dashboard/default": "네트워크 토폴로지 가시화 및 표적 분석기",
  "/CyberObjectInfo/MultilayerVisualization": "사이버 3계층 멀티레이어 가시화기",
  "/OsintDataFusion/GeoIP": "외부망 기본맵 가시화기",
  "/OsintDataFusion/FusionDB": "융합 데이터베이스 구축기",
  "/CyberObjectInfo/PDR": "사이버 물리 환경 구조 가시화",
  "/ExtInt/TimeSeriesVisualization": "네트워크 데이터 융합",
  "/ExtInt/internaltopology": "내부망 네트워크 토폴로지 가시화기",
  "/ExtInt/externaltopology": "외부망 토폴로지 가시화기",
  "/target/targetIdentification": "네트워크 구조 분석 모듈",
  "/target/priorityVisualization": "핵심 표적 점수 분석기",
  "/target/targetDashboard": "후보/핵심 표적 상세 가시화기",
  "/ActiveResponse/threatanalysis": "위험 노출도 및 공격 가능도 측정기",
  "/ActiveResponse/responseeffectvisualization": "능동 대응책 대응 효과/경로 가시화기",
};

export default headerTitles;
