// project import
import CyberObjectInfo from './CyberObjectInfo';
import ExtInt from './ExtInt';
import OsintFusion from './OsintDataFusion';
import target from './IntelligentCyberTargets';
import ActiveResponse from './ActiveResponse';
import { DashboardOutlined } from '@ant-design/icons';

// ==============================|| MENU ITEMS ||============================== //

// 대시보드 단일 항목
const step0 = {
  id: 'group-step0',
  title: '네트워크 토폴로지 가시화 및 표적 분석 기술',
  url: '/dashboard/default',
  type: 'group'
};

// 1단계: 사이버 객체 정보 가시화 + OSINT 및 수집 데이터 융합
const step1 = {
  id: 'group-step1',
  type: 'group',
  children: [
  {
      id: 'osint-data-fusion',
      title: OsintFusion.title,
      type: 'collapse',
      url: '/dashboard/default?view=0',
      icon: OsintFusion.children[0]?.icon,
      children: OsintFusion.children
    },
    {
      id: 'cyber-object-info',
      title: CyberObjectInfo.title,
      type: 'collapse',
      url: '/dashboard/default?view=1',
      icon: CyberObjectInfo.children[0]?.icon,
      children: CyberObjectInfo.children
    }
  ]
};

// 2단계: 내외부 네트워크 가시화기 + 지능형 사이버 표적 식별기 + 사이버 능동 대응 방책 분석기
const step2 = {
  id: 'group-step2',
  type: 'group',
  children: [
    {
      id: 'ext-int-network',
      title: ExtInt.title,
      type: 'collapse',
      url: '/dashboard/default?view=2',
      icon: ExtInt.children[0]?.icon,
      children: ExtInt.children
    },
    {
      id: 'intelligent-cyber-targets',
      title: target.title,
      type: 'collapse',
      icon: target.children[0]?.icon,
      children: target.children
    },
    {
      id: 'active-response',
      title: ActiveResponse.title,
      type: 'collapse',
      icon: ActiveResponse.children[0]?.icon,
      children: ActiveResponse.children
    }
  ]
};

const menuItems = {
  items: [step0, step1, step2]
};

export default menuItems;
