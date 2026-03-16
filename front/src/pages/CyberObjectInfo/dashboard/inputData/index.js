import osintBottomCards from './osintBottomCards';
import cyberObjectBottomCards from './cyberObjectBottomCards';
import networkBottomCards from './networkBottomCards';
import targetBottomCards from './targetBottomCards';
import activeResponseBottomCards from './activeResponseBottomCards';

const bottomCardsByView = {
  osint: osintBottomCards,
  cyberObject: cyberObjectBottomCards,
  network: networkBottomCards,
  target: targetBottomCards,
  activeResponse: activeResponseBottomCards
};

export default bottomCardsByView;
