// TargetImage.jsx
// 노드 이미지 경로를 조건에 따라 반환하는 유틸 컴포넌트


const defaultImg = '/logo192.png';

const switchImg = '/image/switch.png';
const workStationImg = '/image/workstation.png';
const serverImg = '/image/server.png';
const routerImg = '/image/router.png';
const firewallImg = '/image/firewall.png';
const laptopImg = '/image/laptop.png';
const printerImg = '/image/printer.png';
const sensorImg = '/image/sensor.png';
const plcImg = '/image/plc.png';

export function getNodeImage(node) {
  // type 값에 따라 이미지 반환
  if (node.type === 'switch') {
    return switchImg;
  } else if (node.type === 'workstation') {
    return workStationImg;
  } else if (node.type === 'server') {
    return serverImg;
  } else if (node.type === 'router') {
    return routerImg;
  } else if (node.type === 'firewall') {
    return firewallImg;
  } else if (node.type === 'laptop') {
    return laptopImg;
  } else if (node.type === 'printer') {
    return printerImg;
  } else if (node.type === 'sensor') {
    return sensorImg;
  } else if (node.type === 'plc') {
    return plcImg;
  } else {
    return defaultImg;
  }
}

export default getNodeImage;
