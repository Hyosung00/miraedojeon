// assets
import { DashboardOutlined, FundOutlined, AimOutlined } from '@ant-design/icons';

// icons
const icons = {
  DashboardOutlined,
  FundOutlined,
  AimOutlined
};

// ==============================|| MENU ITEMS - DASHBOARD ||============================== //

const dashboard = {
  id: 'group-dashboard',
  title: '사이버 객체 정보 가시화',
  type: 'group',
  children: [
    {
      id: 'PDR',
      title: '사이버 물리 환경 구조 가시화',
      type: 'item',
      url: '/CyberObjectInfo/PDR',
      icon: icons.AimOutlined
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
