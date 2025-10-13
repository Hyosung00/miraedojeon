// assets
import {
  GlobalOutlined,
  RadarChartOutlined,
  DotChartOutlined,
  DashboardOutlined,
  ClusterOutlined
} from '@ant-design/icons';

// icons
const icons = {
  GlobalOutlined,
  RadarChartOutlined,
  DotChartOutlined,
  DashboardOutlined,
  ClusterOutlined
};

// ==============================|| MENU ITEMS ||============================== //

const MenuItems = [
  {
    id: 'navigation-group',
    title: 'Navigation Group',
    type: 'group',
    children: [
      {
        id: 'home',
        title: 'Home',
        type: 'item',
        url: '/',
        icon: icons.GlobalOutlined
      }
    ]
  },
  {
    id: 'Osint&Data Fusion',
    title: 'OSINT 및 수집 데이터 융합 ',
    type: 'group',
    children: [
      {
  id: 'geoip',
  title: 'OSINT 정보 수집',
  type: 'item',
  url: '/Osint&Data Fusion/GeoIP',
  icon: icons.RadarChartOutlined
      },
      {
        id: 'external-3d',
        title: '융합 데이터베이스 구축',
        type: 'item',
        url: '/Osint&Data Fusion/FusionDB',
        icon: icons.DotChartOutlined
      }
    ]
  },
  {
    id: 'group-dashboard',
    title: '사이버 객체 정보 가시화',
    type: 'group',
    children: [
      {
        id: 'dashboard',
        title: 'Dashboard',
        type: 'item',
        url: '/dashboard/default',
        icon: icons.DashboardOutlined,
        breadcrumbs: false
      },
      {
        id: 'MultilayerVisualization',
        title: '사이버 3계층 멀티레이어 가시화',
        type: 'item',
        url: '/CyberObjectInfo/MultilayerVisualization',
        icon: icons.DotChartOutlined
      }
    ]
  },
  {
    id: 'internal-network',
    title: '내부망',
    type: 'group',
    children: [
      {
        id: 'TimeSeriesAnomalyDetection',
        title: '시계열 기반 이상탐지',
        type: 'item',
        url: '/external-network/TimeSeriesVisualization',
        icon: icons.DotChartOutlined
      },
      {
        id: 'internal-topology',
        title: '내부망 기본맵 가시화',
        type: 'item',
        url: '/internal-network/internaltopology',
        icon: icons.ClusterOutlined
      },
      {
        id: 'external-topology',
        title: '외부망 토폴로지',
        type: 'item',
        url: '/internal-network/externaltopology',
        icon: icons.ClusterOutlined
      }
    ]
  },
  {
    id: 'target',
    title: '지능형 사이버 표적 식별기',
    type: 'group',
    children: [
      {
        id: 'TargetIdentification',
        title: '네트워크 구조 분석 및 표적 식별',
        type: 'item',
        url: '/target/targetIdentification',
        icon: icons.RadarChartOutlined
      },
      {
        id: 'TargetPriorityVisualization',
        title: '핵심 표적 점수 분석',
        type: 'item',
        url: '/target/priorityVisualization',
        icon: icons.DotChartOutlined
      },
      {
        id: 'Target',
        title: '후보/핵심 표적 상세 가시화',
        type: 'item',
        url: '/target/target',
        icon: icons.DotChartOutlined
      }
    ]
  },
  {
    id: 'ActiveResponse',
    title: '사이버 능동 대응 방책 분석기 ',
    type: 'group',
    children: [
      {
        id: 'ThreatAnalysis',
        title: '위험 노출도 및 공격 가능도 측정',
        type: 'item',
        url: '/ActiveResponse/threatanalysis',
        icon: icons.ClusterOutlined
      },
      {
        id: 'ResponseEffectvisualization',
        title: '능동 대응책 대응 효과/경로 가시화',
        type: 'item',
        url: '/ActiveResponse/responseeffectvisualization',
        icon: icons.ClusterOutlined
      }
    ]
  }
];

export default MenuItems;