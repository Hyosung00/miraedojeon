import React, { createContext, useContext, useState } from 'react';

const TargetDetailPopupContext = createContext();

export const useTargetDetailPopup = () => useContext(TargetDetailPopupContext);

export function TargetDetailPopupProvider({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <TargetDetailPopupContext.Provider value={{ open, setOpen }}>
      {children}
    </TargetDetailPopupContext.Provider>
  );
}
