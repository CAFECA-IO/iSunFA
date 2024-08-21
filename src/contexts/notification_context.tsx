import { createContext, useContext } from 'react';
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [reportPendingStatus, setReportPendingStatus, reportPendingStatusRef] =
    useStateRef<boolean>(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [reportGeneratedStatus, setReportGeneratedStatus, reportGeneratedStatusRef] =
    useStateRef<boolean>(false);

  const reportPendingStatusHandler = (status: boolean) => {
    setReportPendingStatus(status);
  };

  const reportGeneratedStatusHandler = (status: boolean) => {
    setReportGeneratedStatus(status);
  };

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

  return context;
};
