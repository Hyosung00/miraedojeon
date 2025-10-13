// assets
import { DashboardOutlined } from '@ant-design/icons';

// icons
const icons = {
  DashboardOutlined
};

// ==============================|| MENU ITEMS - DASHBOARD ||============================== //

const dashboard = {
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
    { // 사이버 3계층 멀티레이어 가시화
      id: 'MultilayerVisualization',
      title: '사이버 3계층 멀티레이어 가시화',
      type: 'item',
      url: '/CyberObjectInfo/MultilayerVisualization',
      icon: icons.DotChartOutlined
    }
  ]
};

export default dashboard;
