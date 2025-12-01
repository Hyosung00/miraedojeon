// assets
import { DashboardOutlined, FundOutlined } from '@ant-design/icons';

// icons
const icons = {
  DashboardOutlined,
  FundOutlined
};

// ==============================|| MENU ITEMS - DASHBOARD ||============================== //

const dashboard = {
  id: 'group-dashboard',
  title: '사이버 객체 정보 가시화',
  type: 'group',
  children: [
    {
      id: 'dashboard',
      title: '내외부망 가시화 및 표적분석',
      type: 'item',
      url: '/dashboard/default',
      icon: icons.DashboardOutlined,
      breadcrumbs: false
    },
    { // 사이버 3계층 멀티레이어 가시화
      id: 'MultilayerVisualization',
      title: '사이버 3계층 멀티레이어 가시화',
      type: 'item',
      url: '/CyberObjectInfo/MultilayerVisualization',
      icon: icons.FundOutlined
    }
  ]
};

export default dashboard;
