export interface IUserSetting {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  country: string;
  phone: string;
  language: string;
  systemNotification: boolean;
  updateAndSubscriptionNotification: boolean;
  emailNotification: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt: number;
}
