import React from 'react';
import ConsoleView from '../../Console/ConsoleView';

const FusionDB = ({ open = true, isPopup = false }) => {
  return <ConsoleView type="fusionDB" open={open} isPopup={isPopup} />;
};

export default FusionDB;
