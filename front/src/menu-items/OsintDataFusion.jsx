// assets
import {
  QuestionOutlined,
  DatabaseOutlined,
  AimOutlined
} from '@ant-design/icons';

// icons
const icons = {
  QuestionOutlined,
  DatabaseOutlined,
  AimOutlined
};

// ==============================|| MENU ITEMS - EXTERNAL NETWORK ||============================== //

const externalNetwork = {
  id: 'Osint&Data Fusion',
  title: 'OSINT 및 수집 데이터 융합기',
  type: 'group',
  children: [
    {
      id: 'FusionDB',
      title: '융합 데이터베이스 구축',
      type: 'item',
      url: '/OsintDataFusion/FusionDB',
      icon: icons.DatabaseOutlined
    },
    {
      id: 'GeoIP',
      title: 'BGP 데이터 수집 및 분석',
      type: 'item',
      url: '/OsintDataFusion/GeoIP',
      icon: icons.QuestionOutlined
    }
  ]
};

export default externalNetwork;