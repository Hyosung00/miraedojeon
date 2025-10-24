import React from 'react';
import ConsoleView from '../../Console/ConsoleView';

const TargetIdentification = ({ open = true, isPopup = false }) => {
  return <ConsoleView type="targetIdentification" open={open} isPopup={isPopup} />;
};

export default TargetIdentification;
