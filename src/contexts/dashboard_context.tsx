import React, { createContext, useState } from 'react';
import { BOOKMARK_LIST } from '../constants/config';

interface DashboardContextType {
  bookmarkList: string[];
  bookmarkListHandler: (bookmark: string) => void;
}

const initialDashboardContext: DashboardContextType = {
  bookmarkList: [],
  bookmarkListHandler: () => {},
};

export interface IDashboardProvider {
  children: React.ReactNode;
}

export const DashboardContext = createContext<DashboardContextType>(initialDashboardContext);

export const DashboardProvider = ({ children }: IDashboardProvider) => {
  const [bookmarkList, setBookmarkList] = useState<string[]>(BOOKMARK_LIST);

  const bookmarkListHandler = (bookmark: string) => {
    setBookmarkList([...bookmarkList, bookmark]);
  };

  // eslint-disable-next-line react/jsx-no-constructed-context-values
  const value = { bookmarkList, bookmarkListHandler };

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
};

export const useDashboard = () => {
  const context = React.useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};
