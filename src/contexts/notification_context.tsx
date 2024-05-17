/* eslint-disable */

import { createContext, useContext, useEffect, useState } from 'react';
import useStateRef from 'react-usestateref';

export interface INotificationProvider {
  children: React.ReactNode;
}

interface INotificationContext {
  reportPendingStatus: boolean;
  reportGeneratedStatus: boolean;
  reportPendingStatusHandler: (status: boolean) => void;
  reportGeneratedStatusHandler: (status: boolean) => void;
}

const NotificationContext = createContext<INotificationContext | undefined>(undefined);

// TODO: notification context (20240429 - Shirley)
export const NotificationProvider = ({ children }: INotificationProvider) => {
  const [reportPendingStatus, setReportPendingStatus, reportPendingStatusRef] =
    useStateRef<boolean>(false);
  const [reportGeneratedStatus, setReportGeneratedStatus, reportGeneratedStatusRef] =
    useStateRef<boolean>(false);

  const reportPendingStatusHandler = (status: boolean) => {
    setReportPendingStatus(status);
  };

  const reportGeneratedStatusHandler = (status: boolean) => {
    setReportGeneratedStatus(status);
  };

  // Info: demo
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     setPendingStatus((prev) => !prev);
  //     setGeneratedStatus((prev) => !prev);
  //   }, 10000);

  //   return () => {
  //     clearInterval(interval);
  //   };
  // }, []);

  // TODO: websocket connection of pending report and generated report (20240517 - Shirley)

  /* eslint-disable react/jsx-no-constructed-context-values */
  const value = {
    reportPendingStatus: reportPendingStatusRef.current,
    reportGeneratedStatus: reportGeneratedStatusRef.current,
    reportPendingStatusHandler,
    reportGeneratedStatusHandler,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotificationCtx = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }

  // Deprecated: Debug tool [to be removed](20240517 - Shirley)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g: any =
    typeof globalThis === 'object'
      ? globalThis
      : typeof window === 'object'
        ? window
        : typeof global === 'object'
          ? global
          : null; // Info: Causes an error on the next line

  g.notificationContext = context;
  return context;
};
