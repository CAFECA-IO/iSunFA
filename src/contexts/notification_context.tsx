import { createContext, useContext, useMemo } from 'react';
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

// TODO: (20240429 - Shirley) [Beta] notification context
export const NotificationProvider = ({ children }: INotificationProvider) => {
  const [, /* reportPendingStatus */ setReportPendingStatus, reportPendingStatusRef] =
    useStateRef<boolean>(false);
  const [, /* reportGeneratedStatus */ setReportGeneratedStatus, reportGeneratedStatusRef] =
    useStateRef<boolean>(false);

  const reportPendingStatusHandler = (status: boolean) => {
    setReportPendingStatus(status);
  };

  const reportGeneratedStatusHandler = (status: boolean) => {
    setReportGeneratedStatus(status);
  };

  // TODO: (20240517 - Shirley) [Beta] websocket connection of pending report and generated report
  // Info: (20240830 - Anna) 為了拿掉react/jsx-no-constructed-context-values註解，所以使用useMemo hook
  const value = useMemo(
    () => ({
      reportPendingStatus: reportPendingStatusRef.current,
      reportGeneratedStatus: reportGeneratedStatusRef.current,
      reportPendingStatusHandler,
      reportGeneratedStatusHandler,
    }),
    [
      reportPendingStatusRef.current,
      reportGeneratedStatusRef.current,
      reportPendingStatusHandler,
      reportGeneratedStatusHandler,
    ]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotificationCtx = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }

  return context;
};
