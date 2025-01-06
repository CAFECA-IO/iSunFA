import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import { FiSend } from 'react-icons/fi';
import Toggle from '@/components/toggle/toggle';
import APIHandler from '@/lib/utils/api_handler';
import { IUserSetting } from '@/interfaces/user_setting';
import { APIName } from '@/constants/api_connection';
import { ToastType } from '@/interfaces/toastify';
import { ToastId } from '@/constants/toast_id';
import { useModalContext } from '@/contexts/modal_context';

interface NoticeSettingsProps {
  userSetting: IUserSetting | null;
}

const NoticeSettings: React.FC<NoticeSettingsProps> = ({ userSetting }) => {
  const { t } = useTranslation(['setting', 'common']);
  const { toastHandler } = useModalContext();
  const { trigger: updateUserSettingAPI } = APIHandler<IUserSetting>(APIName.USER_SETTING_UPDATE);

  const [notificationSettings, setNotificationSettings] = useState({
    systemNotification: userSetting?.notificationSetting.systemNotification ?? false,
    updateAndSubscriptionNotification:
      userSetting?.notificationSetting.updateAndSubscriptionNotification ?? false,
    emailNotification: userSetting?.notificationSetting.emailNotification ?? false,
  });

  const updateUseSetting = useCallback(
    async (updatedSettings: typeof notificationSettings) => {
      if (!userSetting) return;

      const { success } = await updateUserSettingAPI({
        params: { userId: userSetting?.userId },
        body: {
          ...userSetting,
          notificationSetting: updatedSettings,
          personalInfo: {
            ...userSetting.personalInfo,
          },
        },
      });

      if (!success) {
        toastHandler({
          id: ToastId.USER_SETTING_UPDATE_ERROR,
          type: ToastType.ERROR,
          content: t('setting:USER.UPDATE_ERROR'),
          closeable: true,
        });
      }
    },
    [toastHandler, t, updateUserSettingAPI, userSetting]
  );

  const handleToggle = (key: keyof typeof notificationSettings) => {
    setNotificationSettings((prev) => {
      const updatedSettings = { ...prev, [key]: !prev[key] };
      updateUseSetting(updatedSettings); // 使用最新值更新 API
      return updatedSettings;
    });
  };

  useEffect(() => {
    if (userSetting) {
      setNotificationSettings({
        systemNotification: userSetting.notificationSetting.systemNotification,
        updateAndSubscriptionNotification:
          userSetting.notificationSetting.updateAndSubscriptionNotification,
        emailNotification: userSetting.notificationSetting.emailNotification,
      });
    }
  }, [userSetting]);

  return (
    <div>
      <div id="notice-setting-section" className="mb-lv-7 flex items-center gap-4">
        <hr className="block flex-1 border-divider-stroke-lv-4 md:hidden" />
        <div className="flex items-center gap-2 text-sm text-divider-text-lv-1">
          <Image src="/icons/ringing_bell.svg" width={16} height={16} alt="notice_icon" />
          <p>{t('setting:NORMAL.NOTICE_SETTING')}</p>
        </div>
        <hr className="flex-1 border-divider-stroke-lv-4" />
      </div>
      <div className="mb-lv-5 flex items-center space-x-2">
        <p className="flex gap-2">
          <Image src="/icons/codepen.svg" width={16} height={16} alt="notice_icon" />
          <span>{t('setting:NORMAL.SYSTEM_NOTIFICATION')}</span>
        </p>
        <Toggle
          id="system-notification-toggle"
          initialToggleState={notificationSettings.systemNotification}
          getToggledState={() => handleToggle('systemNotification')}
          toggleStateFromParent={notificationSettings.systemNotification}
        />
      </div>
      <div className="mb-lv-5 flex items-center space-x-2">
        <p className="flex gap-2">
          <Image src="/icons/bag.svg" width={16} height={16} alt="notice_icon" />
          <span>{t('setting:NORMAL.UPDATES_N_SUBSCRIPTION_NOTIFICATION')}</span>
        </p>
        <Toggle
          id="updates-notification-toggle"
          initialToggleState={notificationSettings.updateAndSubscriptionNotification}
          getToggledState={() => handleToggle('updateAndSubscriptionNotification')}
          toggleStateFromParent={notificationSettings.updateAndSubscriptionNotification}
        />
      </div>
      <div className="flex items-center space-x-2">
        <p className="flex items-center gap-2">
          <FiSend size={16} className="text-icon-surface-single-color-primary" />
          <span>{t('setting:NORMAL.EMAIL_NOTIFICATION')}</span>
        </p>
        <Toggle
          id="email-notification-toggle"
          initialToggleState={notificationSettings.emailNotification}
          getToggledState={() => handleToggle('emailNotification')}
          toggleStateFromParent={notificationSettings.emailNotification}
        />
      </div>
    </div>
  );
};

export default NoticeSettings;
