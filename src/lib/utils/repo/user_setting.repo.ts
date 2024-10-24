import prisma from '@/client';
import { IUserSetting } from '@/interfaces/user_setting';
import { loggerError } from '@/lib/utils/logger_back';
import { getTimestampNow } from '@/lib/utils/common';
import { DEFAULT_USER_SETTING } from '@/constants/setting';

export async function createUserSetting(userId: number) {
  const nowInSecond = getTimestampNow();
  let userSetting = null;

  try {
    userSetting = await prisma.userSetting.create({
      data: {
        userId,
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
    const logError = loggerError(
      0,
      'create user setting in createUserSetting failed',
      error as Error
    );
    logError.error(
      'Prisma related create user setting in createUserSetting in user_setting.repo.ts failed'
    );
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
    const logError = loggerError(
      0,
      'get user setting in getUserSettingByUserId failed',
      error as Error
    );
    logError.error(
      'Prisma related get user setting in getUserSettingByUserId in user_setting.repo.ts failed'
    );
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
        country: data.personalInfo.country,
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
    const logError = loggerError(
      0,
      'update user setting in updateUserSettingById failed',
      error as Error
    );
    logError.error(
      'Prisma related update user setting in updateUserSettingById in user_setting.repo.ts failed'
    );
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
    const logError = loggerError(
      0,
      'delete user setting in deleteUserSettingByIdForTesting failed',
      error as Error
    );
    logError.error(
      'Prisma related delete user setting in deleteUserSettingByIdForTesting in user_setting.repo.ts failed'
    );
  }

  return userSetting;
}
