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
  id: 'Osint&Data Fusion',
  title: 'OSINT 및 수집 데이터 융합 ',
  type: 'group',
  children: [
    {
      id: 'GeoIP',
      title: 'OSINT 정보 수집',
      type: 'item',
        url: '/Osint&DataFusion/GeoIP',
      icon: icons.RadarChartOutlined
    },
    { // 융합 데이터베이스 구축
      id: 'FusionDB',
      title: '융합 데이터베이스 구축',
      type: 'item',
        url: '/Osint&DataFusion/FusionDB',
      icon: icons.DotChartOutlined
    }
  ]
};

export default externalNetwork;