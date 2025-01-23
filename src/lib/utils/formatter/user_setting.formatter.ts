import { IUserSetting } from '@/interfaces/user_setting';
import { UserSetting } from '@prisma/client';
import { userSettingOutputSchema } from '@/lib/utils/zod_schema/user_setting';

export function formatUserSetting(userSetting: UserSetting): IUserSetting {
  const formattedUserSetting = userSettingOutputSchema.safeParse(userSetting);
  if (!formattedUserSetting.success) {
    throw new Error('User setting format failed');
  }
  return formattedUserSetting.data;
}
