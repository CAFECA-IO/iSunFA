import prisma from '@/client';
import { IUserSetting } from '@/interfaces/user_setting';
import { loggerError } from '@/lib/utils/logger_back';
import { getTimestampNow } from '@/lib/utils/common';
import { DEFAULT_USER_SETTING } from '@/constants/setting';
import { DefaultValue } from '@/constants/default_value';

export async function createUserSetting(userId: number) {
  const nowInSecond = getTimestampNow();
  let userSetting = null;

  try {
    userSetting = await prisma.userSetting.create({
      data: {
        userId,
        countryId: 10000000, // TODO: (20250113 - Shirley) 需要將 country 改為 countryId
        language: DEFAULT_USER_SETTING.LANGUAGE,
        systemNotification: DEFAULT_USER_SETTING.SYSTEM_NOTIFICATION,
        updateAndSubscriptionNotification:
          DEFAULT_USER_SETTING.UPDATE_AND_SUBSCRIPTION_NOTIFICATION,
        emailNotification: DEFAULT_USER_SETTING.EMAIL_NOTIFICATION,
        createdAt: nowInSecond,
        updatedAt: nowInSecond,
      },
    });
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'create user setting in createUserSetting failed',
      errorMessage: (error as Error).message,
    });
  }

  return userSetting;
}

export async function getUserSettingByUserId(userId: number) {
  let userSetting = null;

  try {
    userSetting = await prisma.userSetting.findFirst({
      where: { userId },
    });
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'get user setting in getUserSettingByUserId failed',
      errorMessage: (error as Error).message,
    });
  }

  return userSetting;
}

export async function updateUserSettingById(id: number, data: IUserSetting) {
  let userSetting = null;
  const nowInSecond = getTimestampNow();

  try {
    userSetting = await prisma.userSetting.update({
      where: { id },
      data: {
        firstName: data.personalInfo.firstName,
        lastName: data.personalInfo.lastName,
        countryId: 10000000, // TODO: (20250113 - Shirley) 需要將 country 改為 countryId
        // country: data.personalInfo.country,
        language: data.personalInfo.language,
        phone: data.personalInfo.phone,
        systemNotification: data.notificationSetting.systemNotification,
        updateAndSubscriptionNotification:
          data.notificationSetting.updateAndSubscriptionNotification,
        emailNotification: data.notificationSetting.emailNotification,
        updatedAt: nowInSecond,
      },
    });
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'update user setting in updateUserSettingById failed',
      errorMessage: (error as Error).message,
    });
  }

  return userSetting;
}

export async function deleteUserSettingByIdForTesting(id: number) {
  let userSetting = null;

  try {
    userSetting = await prisma.userSetting.delete({
      where: { id },
    });
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'delete user setting in deleteUserSettingByIdForTesting failed',
      errorMessage: (error as Error).message,
    });
  }

  return userSetting;
}
