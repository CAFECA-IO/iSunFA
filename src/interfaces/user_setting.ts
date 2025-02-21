import { LocaleKey } from '@/constants/normal_setting';
import { UserSetting } from '@prisma/client';

export interface IUserSetting {
  id: number;
  userId: number;
  personalInfo: IUserPersonalInfo;
  notificationSetting: INotificationSetting;
  createdAt: number;
  updatedAt: number;
}
interface INotificationSetting {
  systemNotification: boolean;
  updateAndSubscriptionNotification: boolean;
  emailNotification: boolean;
}

interface IUserPersonalInfo {
  firstName: string;
  lastName: string;
  country: LocaleKey; // Info: (20241211 - tzuhan) @Murky 可以改用 LocaleKey 嗎？
  language: LocaleKey; // Info: (20241211 - tzuhan) @Murky 可以改用 LocaleKey 嗎？
  // countryCode: string; // Info: (20241211 - tzuhan) @Murky 這裡可以幫提供 countryCode 使用 LocaleKey 嗎？
  phone: string;
}

export type IUserSettingOutputGet = Omit<UserSetting, 'countryId'> & {
  country: LocaleKey;
};
