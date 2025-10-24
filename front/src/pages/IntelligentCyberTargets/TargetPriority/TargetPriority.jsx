import React from 'react';
import ConsoleView from '../../Console/ConsoleView';

const TargetPriority = ({ open = true, isPopup = false }) => {
  return <ConsoleView type="targetPriority" open={open} isPopup={isPopup} />;
};

export default TargetPriority;
