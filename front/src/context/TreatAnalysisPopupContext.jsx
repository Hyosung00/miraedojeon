import React, { createContext, useContext, useState } from 'react';

const TreatAnalysisPopupContext = createContext();

export const useTreatAnalysisPopup = () => useContext(TreatAnalysisPopupContext);

export function TreatAnalysisPopupProvider({ children }) {
  const [open, setOpen] = useState(false);
  
  return (
    <TreatAnalysisPopupContext.Provider value={{ open, setOpen }}>
      {children}
    </TreatAnalysisPopupContext.Provider>
  );
}
