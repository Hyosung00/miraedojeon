// assets
import {
  AlertOutlined,
  ContactsOutlined,
  DeploymentUnitOutlined
} from '@ant-design/icons';

// icons
const icons = {
  AlertOutlined,
  ContactsOutlined,
  DeploymentUnitOutlined
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
      icon: icons.AlertOutlined
    },
    {
      id: 'internal-topology',
      title: '내부망 기본맵 가시화',
      type: 'item',
      url: '/ExtInt/internaltopology',
      icon: icons.ContactsOutlined
    }
  ]
};

export default internalNetwork;