import React, { createContext, useContext, useState } from 'react';

const PopupContext = createContext();

export const usePopup = () => useContext(PopupContext);

export function PopupProvider({ children }) {
  const [popups, setPopups] = useState({
    treatAnalysis: false,
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
