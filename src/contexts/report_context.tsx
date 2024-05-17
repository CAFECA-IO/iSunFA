/* eslint-disable */

import { IGeneratedReportItem, IPendingReportItem } from '@/interfaces/report_item';
import { createContext, useContext, useState } from 'react';

interface IReportContext {}

export interface IReportProvider {
  children: React.ReactNode;
}

const ReportContext = createContext<IReportContext | undefined>(undefined);

// TODO: notification context (20240429 - Shirley)
export const ReportProvider = ({ children }: IReportProvider) => {
  const [pendingReports, setPendingReports] = useState<IPendingReportItem[]>([]);
  const [generatedReports, setGeneratedReports] = useState<IGeneratedReportItem[]>([]);

  /* eslint-disable react/jsx-no-constructed-context-values */
  const value = {};

  return <ReportContext.Provider value={value}></ReportContext.Provider>;
};

export const useReportCtx = () => {
  const context = useContext(ReportContext);
  if (!context) {
    throw new Error('useReportContext must be used within a ReportProvider');
  }

  return context;
};
