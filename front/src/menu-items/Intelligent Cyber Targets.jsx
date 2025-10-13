// assets
import {
  GlobalOutlined,
  RadarChartOutlined,
  DotChartOutlined
} from '@ant-design/icons';

// icons
const icons = {
  GlobalOutlined,
  RadarChartOutlined,
  DotChartOutlined
};

// ==============================|| MENU ITEMS - EXTERNAL NETWORK ||============================== //

const externalNetwork = {
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
      url: '/target/targetDashboard',
      icon: icons.DotChartOutlined
    }
  ]
};

export default externalNetwork;