// assets
import {
  AlertOutlined,
  ContactsOutlined,
  DeploymentUnitOutlined,
  QuestionOutlined
} from '@ant-design/icons';

// icons
const icons = {
  AlertOutlined,
  ContactsOutlined,
  DeploymentUnitOutlined,
  QuestionOutlined
};

// ==============================|| MENU ITEMS - INTERNAL NETWORK ||============================== //

const internalNetwork = {
  id: 'internal-network',
  title: '내외부 네트워크 가시화기',
  type: 'group',
  children: [
    {
      id: 'TimeSeriesAnomalyDetection',
      title: '네트워크 데이터 융합',
      type: 'item',
      url: '/ExtInt/TimeSeriesVisualization',
      icon: icons.AlertOutlined
    },
    {
      id: 'external-topology',
      title: '외부망 기본맵 가시화',
      type: 'item',
      url: '/ExtInt/externaltopology',
      icon: icons.ContactsOutlined
    },
    {
      id: 'internal-topology',
      title: '내부망 네트워크 토폴로지 가시화',
      type: 'item',
      url: '/ExtInt/internaltopology',
      icon: icons.ContactsOutlined
    }
  ]
};

export default internalNetwork;