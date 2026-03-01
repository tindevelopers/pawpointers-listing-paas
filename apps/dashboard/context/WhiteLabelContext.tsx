"use client";

import React, { createContext, useContext } from "react";

type WhiteLabelContextType = {
  branding: {
    logo?: string;
    logoDark?: string;
    favicon?: string;
    companyName?: string;
  };
};

const WhiteLabelContext = createContext<WhiteLabelContextType>({
  branding: {
    companyName: "Pawpointers Dashboard",
    logo: "/images/logo/logo.svg",
    favicon: "/images/logo/logo-icon.svg",
  },
});

export const useWhiteLabel = () => useContext(WhiteLabelContext);

export const WhiteLabelProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <WhiteLabelContext.Provider
      value={{
        branding: {
          companyName: "Pawpointers Dashboard",
          logo: "/images/logo/logo.svg",
          favicon: "/images/logo/logo-icon.svg",
        },
      }}
    >
      {children}
    </WhiteLabelContext.Provider>
  );
};
