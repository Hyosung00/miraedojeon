import React, { createContext, useContext, useState } from 'react';
import PropTypes from 'prop-types';

const PopupContext = createContext();

export const usePopup = () => useContext(PopupContext);

export function PopupProvider({ children }) {
  const [popups, setPopups] = useState({
    treatAnalysis: false,
    targetIdentification: false,
    targetPriority: false,
    fusionDB: false,
    targetDetail: false,
    osintDetail: false
  });

  const openPopup = (name) => {
    setPopups(prev => ({ ...prev, [name]: true }));
  };

  const closePopup = (name) => {
    setPopups(prev => ({ ...prev, [name]: false }));
  };

  return (
    <PopupContext.Provider value={{ popups, openPopup, closePopup }}>
      {children}
    </PopupContext.Provider>
  );
}

PopupProvider.propTypes = { 
  children: PropTypes.oneOfType([PropTypes.node, PropTypes.arrayOf(PropTypes.node)]) 
};
