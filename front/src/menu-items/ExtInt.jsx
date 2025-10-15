// assets
import {
  ClusterOutlined,
  NodeIndexOutlined,
  DotChartOutlined
} from '@ant-design/icons';

// icons
const icons = {
  ClusterOutlined,
  NodeIndexOutlined,
  DotChartOutlined
};

// ==============================|| MENU ITEMS - INTERNAL NETWORK ||============================== //

const internalNetwork = {
  id: 'internal-network',
  title: '내외부 네트워크 가시화기',
  type: 'group',
  children: [
    {
      id: 'TimeSeriesAnomalyDetection',
      title: '시계열 기반 이상탐지',
      type: 'item',
      url: '/ExtInt/TimeSeriesVisualization',
      icon: icons.DotChartOutlined
    },
    {
      id: 'internal-topology',
      title: '내부망 기본맵 가시화',
      type: 'item',
      url: '/ExtInt/internaltopology',
      icon: icons.ClusterOutlined
    },    
    {
      id: 'external-topology',
      title: '외부망 토폴로지',
      type: 'item',
      url: '/ExtInt/externaltopology',
      icon: icons.ClusterOutlined
    }
  ]
};

export default internalNetwork;