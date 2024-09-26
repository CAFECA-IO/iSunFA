export interface IUserSetting {
  id: number;
  userId: number;
  personalInfo: IUserPersonalInfo;
  notificationSetting: INotificationSetting;
  createdAt: number;
  updatedAt: number;
  deletedAt: number;
}
interface INotificationSetting {
  systemNotification: boolean;
  updateAndSubscriptionNotification: boolean;
  emailNotification: boolean;
}

interface IUserPersonalInfo {
  firstName: string;
  lastName: string;
  country: string;
  language: string;
  phone: string;
}
