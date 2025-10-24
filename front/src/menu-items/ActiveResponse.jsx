// assets
import {
  FileExclamationOutlined,
  AimOutlined
} from '@ant-design/icons';

// icons
const icons = {
  FileExclamationOutlined,
  AimOutlined
};

// ==============================|| MENU ITEMS - INTERNAL NETWORK ||============================== //

const internalNetwork = {
  id: 'ActiveResponse',
  title: '사이버 능동 대응 방책 분석기 ',
  type: 'group',
  children: [
    {
      id: 'ThreatAnalysis',
      title: '위험 노출도 및 공격 가능도 측정',
      type: 'item',
      icon: icons.FileExclamationOutlined,
      url: '/ActiveResponse/responseeffectvisualization',
      onClick: 'openTreatAnalysisPopup'
    },
    {
      id: 'ResponseEffectvisualization',
      title: '능동 대응책 대응 효과/경로 가시화',
      type: 'item',
      url: '/ActiveResponse/responseeffectvisualization',
      icon: icons.AimOutlined
    }
  ]
};

export default internalNetwork;