import { IUserSetting } from '@/interfaces/user_setting';
import {
  createUserSetting,
  deleteUserSettingByIdForTesting,
  getUserSettingByUserId,
  updateUserSettingById,
} from '@/lib/utils/repo/user_setting.repo';
import userSettings from '@/seed_json/user_setting.json';
import { formatUserSetting } from '@/lib/utils/formatter/user_setting.formatter';

describe('User Setting Repository', () => {
  describe('createUserSetting', () => {
    it('should create a new user setting', async () => {
      const testUserId = 1002;
      const userSetting = await createUserSetting(testUserId);
      await deleteUserSettingByIdForTesting(userSetting!.id);
      expect(userSetting).toBeDefined();
      expect(userSetting!.userId).toBe(testUserId);
      expect(userSetting!.language).toBe('English');
      expect(userSetting!.systemNotification).toBe(true);
      expect(userSetting!.updateAndSubscriptionNotification).toBe(true);
      expect(userSetting!.emailNotification).toBe(true);
    });
  });

  describe('getUserSettingByUserId', () => {
    it('should return a user setting by user ID', async () => {
      const userId = 1000;
      const userSetting = await getUserSettingByUserId(userId);
      expect(userSetting).toBeDefined();
      expect(userSetting?.userId).toBe(userSettings[0].userId);
      expect(userSetting?.language).toBe(userSettings[0].language);
      expect(userSetting?.systemNotification).toBe(userSettings[0].systemNotification);
      expect(userSetting?.updateAndSubscriptionNotification).toBe(
        userSettings[0].updateAndSubscriptionNotification
      );
      expect(userSetting?.emailNotification).toBe(userSettings[0].emailNotification);
    });
  });

  describe('updateUserSettingById', () => {
    it('should update a user setting by ID', async () => {
      const id = 1001;
      const userId = 1001;
      const data: IUserSetting = {
        id,
        userId,
        notificationSetting: {
          systemNotification: false,
          updateAndSubscriptionNotification: false,
          emailNotification: false,
        },
        personalInfo: {
          firstName: 'John',
          lastName: 'Doe',
          country: 'US',
          phone: '1234567890',
          language: 'Chinese',
        },
        createdAt: 1635244800,
        updatedAt: 1635244800,
      };
      const getUserSetting = await getUserSettingByUserId(userId);
      const formmatedUserSetting = formatUserSetting(getUserSetting!);
      const userSetting = await updateUserSettingById(id, data);
      await updateUserSettingById(id, formmatedUserSetting);
      expect(userSetting).toBeDefined();
      expect(userSetting!.language).toBe('Chinese');
      expect(userSetting!.systemNotification).toBe(false);
      expect(userSetting!.updateAndSubscriptionNotification).toBe(false);
      expect(userSetting!.emailNotification).toBe(false);
    });
  });
});
