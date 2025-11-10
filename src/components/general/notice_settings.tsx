import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import { FaCodepen } from 'react-icons/fa';
import { CgShoppingBag } from 'react-icons/cg';
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
  const { t } = useTranslation(['settings']);
  const { toastHandler } = useModalContext();
  const { trigger: updateUserSettingAPI } = APIHandler<IUserSetting>(APIName.USER_SETTING_UPDATE);

  const initialSettings = useMemo(
    () => ({
      systemNotification: userSetting?.notificationSetting.systemNotification ?? false,
      updateAndSubscriptionNotification:
        userSetting?.notificationSetting.updateAndSubscriptionNotification ?? false,
      emailNotification: userSetting?.notificationSetting.emailNotification ?? false,
    }),
    [userSetting]
  );

  const [notificationSettings, setNotificationSettings] = useState(initialSettings);

  useEffect(() => {
    setNotificationSettings(initialSettings);
  }, [initialSettings]);

  const updateUserSettings = useCallback(
    async (updatedSettings: typeof notificationSettings) => {
      if (!userSetting) return;

      try {
        const { success } = await updateUserSettingAPI({
          params: { userId: userSetting.userId },
          body: {
            ...userSetting,
            notificationSetting: updatedSettings,
          },
        });

        if (!success) {
          toastHandler({
            id: ToastId.USER_SETTING_UPDATE_ERROR,
            type: ToastType.ERROR,
            content: t('settings:USER.UPDATE_ERROR'),
            closeable: true,
          });
          setNotificationSettings(initialSettings); // Info: (20250108 - Tzuhan) 設定失敗，switch 還原回原本狀態，提示錯誤資訊
        }
      } catch (error) {
        (error as Error).message += ' (from updateUserSettings)';
        setNotificationSettings(initialSettings); // Info: (20250108 - Tzuhan) 設定失敗，switch 還原回原本狀態，提示錯誤資訊
        toastHandler({
          id: ToastId.USER_SETTING_UPDATE_ERROR,
          type: ToastType.ERROR,
          content: t('settings:USER.UPDATE_ERROR'),
          closeable: true,
        });
      }
    },
    [toastHandler, t, updateUserSettingAPI, userSetting, initialSettings]
  );

  const handleToggle = (key: keyof typeof notificationSettings) => {
    const updatedSettings = { ...notificationSettings, [key]: !notificationSettings[key] };
    // Info: (20250108 - Tzuhan) switch 切換為目標狀態，不需提示訊息
    setNotificationSettings(updatedSettings);
    updateUserSettings(updatedSettings);
  };

  const settings = [
    {
      key: 'systemNotification',
      icon: <FaCodepen size={16} className="text-icon-surface-single-color-primary" />,
      label: t('settings:NORMAL.SYSTEM_NOTIFICATION'),
    },
    {
      key: 'updateAndSubscriptionNotification',
      icon: <CgShoppingBag size={16} className="text-icon-surface-single-color-primary" />,
      label: t('settings:NORMAL.UPDATES_N_SUBSCRIPTION_NOTIFICATION'),
    },
    {
      key: 'emailNotification',
      icon: <FiSend size={16} className="text-icon-surface-single-color-primary" />,
      label: t('settings:NORMAL.EMAIL_NOTIFICATION'),
    },
  ];

  return (
    <main className="flex flex-col gap-40px">
      <section className="flex items-center gap-lv-4">
        <div className="flex items-center gap-lv-2">
          <Image src="/icons/ringing_bell.svg" width={16} height={16} alt="notice_icon" />
          <span className="text-sm font-medium text-divider-text-lv-2">
            {t('settings:NORMAL.NOTICE_SETTINGS')}
          </span>
        </div>
        <hr className="flex-auto border-t border-divider-stroke-lv-4" />
      </section>

      <section className="flex flex-col gap-lv-5">
        {settings.map(({ key, icon, label }) => (
          <div key={key} className="flex items-center gap-16px">
            <p className="flex flex-auto items-center gap-8px text-base font-medium text-switch-text-primary tablet:flex-none">
              {typeof icon === 'string' ? (
                <Image src={icon} width={16} height={16} alt={`${key}_icon`} />
              ) : (
                icon
              )}
              <span>{label}</span>
            </p>
            <Toggle
              id={`${key}-toggle`}
              initialToggleState={notificationSettings[key as keyof typeof notificationSettings]}
              getToggledState={() => handleToggle(key as keyof typeof notificationSettings)}
              toggleStateFromParent={notificationSettings[key as keyof typeof notificationSettings]}
            />
          </div>
        ))}
      </section>
    </main>
  );
};

export default NoticeSettings;
