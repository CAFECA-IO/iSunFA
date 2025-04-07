import { createContext, useContext, useState, ReactNode, useMemo } from 'react';

interface DashboardContextProps {
  isSideMenuOpen: boolean;
  toggleSideMenu: () => void;
}

const DashboardContext = createContext<DashboardContextProps | undefined>(undefined);

export const useDashboardCtx = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboardCtx must be used within a DashboardProvider');
  }
  return context;
};

interface DashboardProviderProps {
  children: ReactNode;
}

export const DashboardProvider = ({ children }: DashboardProviderProps) => {
  const [isSideMenuOpen, setIsSideMenuOpen] = useState<boolean>(true);

  const toggleSideMenu = () => {
    setIsSideMenuOpen((prev) => !prev);
  };

  const contextValue = useMemo(() => ({ isSideMenuOpen, toggleSideMenu }), [isSideMenuOpen]);

  return <DashboardContext.Provider value={contextValue}>{children}</DashboardContext.Provider>;
};
