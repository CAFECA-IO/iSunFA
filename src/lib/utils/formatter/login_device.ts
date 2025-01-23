import { ILoginDevice } from '@/interfaces/login_device';
import { ISessionData } from '@/interfaces/session';

// Info: (20250112 - Luphia) transfer session data to login device data
export const sessionDataToLoginDevice = (sessionData: ISessionData): ILoginDevice => {
  const loginDevice: ILoginDevice = {
    id: sessionData.deviceId,
    userId: sessionData.userId,
    actionTime: sessionData.actionTime,
    ipAddress: sessionData.ipAddress,
    userAgent: sessionData.userAgent,
    normal: true,
    isCurrent: false,
  };
  return loginDevice;
};
