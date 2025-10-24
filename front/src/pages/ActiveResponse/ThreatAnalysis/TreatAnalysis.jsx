import React from 'react';
import ConsoleView from '../../Console/ConsoleView';

const TreatAnalysis = ({ open = true, isPopup = false }) => {
  return <ConsoleView type="treatAnalysis" open={open} isPopup={isPopup} />;
};

export default TreatAnalysis;
