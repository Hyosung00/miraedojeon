// 헤더 타이틀 매핑 객체
// 라우트 경로별로 헤더에 출력할 텍스트를 지정합니다.

const headerTitles = {
  "/dashboard/default": "네트워크 토폴로지 가시화 및 표적 분석기",
  "/CyberObjectInfo/MultilayerVisualization": "사이버 3계층 멀티레이어 가시화기",
  "/OsintDataFusion/GeoIP": "외부망 기본맵 가시화기",
  "/OsintDataFusion/FusionDB": "융합 데이터베이스 구축기",
  "/CyberObjectInfo/PDR": "사이버 물리 환경 구조 가시화",
  "/ExtInt/NetworkDataFusion": "네트워크 데이터 융합",
  "/ExtInt/internaltopology": "내부망 네트워크 토폴로지 가시화기",
  "/ExtInt/externaltopology": "외부망 토폴로지 가시화기",
  "/target/TargetIdentification": "네트워크 구조 분석 모듈",
  "/target/priorityVisualization": "핵심 표적 점수 분석기",
  "/target/targetDashboard": "후보/핵심 표적 상세 가시화기",
  "/ActiveResponse/ThreatAnalysis": "위험 노출도 및 공격 가능도 측정기",
  "/ActiveResponse/responseeffectvisualization": "능동 대응책 대응 효과/경로 가시화기",
};

// 라우트 경로별 진행 흐름(flowSteps) 매핑 객체
// Dashboard visualizations의 flowSteps와 동일한 포맷으로 관리합니다.
export const headerFlowSteps = {
  "/OsintDataFusion/FusionDB": [
    "BGP 아카이브 실시간 수집",
    "수집 노드 유형/지역 분포 시각화",
    "융합 데이터베이스 테이블 갱신",
    "Neo4j 트랜잭션 콘솔 모니터링"
  ],
  "/target/TargetIdentification": [
    "네트워크 구조 분석(의존성·파급)",
    "후보/핵심 표적 상세 가시화",
    "핵심 표적 선정",
    "후속 대응 대상 전달"
  ],
  "/target/targetDashboard": [
    "네트워크 구조 분석(의존성·파급)",
    "후보/핵심 표적 상세 가시화",
    "핵심 표적 선정",
    "후속 대응 대상 전달"
  ],
  "/ActiveResponse/ThreatAnalysis": [
    "위협 데이터 파일 로드",
    "노드 위험지표(HRN·NLS·CPS) 계산",
    "공격 가능 경로 도출",
    "위험 노출도·공격 가능도 요약"
  ],
  "/ActiveResponse/responseeffectvisualization": [
    "공격경로·정상연결 분리 분석",
    "고위험 노드·우회 지점 식별",
    "RS 기반 차단 전후 효과 비교",
    "시나리오 우선순위 정책 적용"
  ]
};

export default headerTitles;
