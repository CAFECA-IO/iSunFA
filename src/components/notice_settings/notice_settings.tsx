import React, { useEffect, useState } from 'react';
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
  const [isLoading, setIsLoading] = useState(false);
  const { trigger: updateUserSettingAPI } = APIHandler<IUserSetting>(APIName.USER_SETTING_UPDATE);

  const [enableSystemNotifications, setEnableSystemNotifications] = useState(
    userSetting?.notificationSetting.systemNotification ?? false
  );
  const [enableUpdatesNotifications, setEnableUpdatesNotifications] = useState(
    userSetting?.notificationSetting.updateAndSubscriptionNotification ?? false
  );
  const [enableEmailNotifications, setEnableEmailNotifications] = useState(
    userSetting?.notificationSetting.emailNotification ?? false
  );

  const updateUseSetting = async () => {
    if (!userSetting) return;
    setIsLoading(true);
    const { success } = await updateUserSettingAPI({
      params: { userId: userSetting?.userId },
      body: {
        ...userSetting,
        notificationSetting: {
          ...userSetting.notificationSetting,
          systemNotification: enableSystemNotifications,
          updateAndSubscriptionNotification: enableUpdatesNotifications,
          emailNotification: enableEmailNotifications,
        },
        personalInfo: {
          ...userSetting.personalInfo,
        },
      },
    });
    if (success) {
      toastHandler({
        id: ToastId.USER_SETTING_UPDATE_SUCCESS, // ToDo:  (20241114 - tzuhan) 跟設計師確認更新成功或失敗的UI
        type: ToastType.SUCCESS,
        content: t('setting:USER.UPDATE_SUCCESS'),
        closeable: true,
      });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (!isLoading) updateUseSetting();
  }, [isLoading, enableSystemNotifications, enableUpdatesNotifications, enableEmailNotifications]);

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
          id="tax-toggle"
          initialToggleState={enableSystemNotifications}
          getToggledState={() => setEnableSystemNotifications((prev) => !prev)}
          toggleStateFromParent={enableSystemNotifications}
        />
      </div>
      <div className="mb-lv-5 flex items-center space-x-2">
        <p className="flex gap-2">
          <Image src="/icons/bag.svg" width={16} height={16} alt="notice_icon" />
          <span>{t('setting:NORMAL.UPDATES_N_SUBSCRIPTION_NOTIFICATION')}</span>
        </p>
        <Toggle
          id="tax-toggle"
          initialToggleState={enableUpdatesNotifications}
          getToggledState={() => setEnableUpdatesNotifications((prev) => !prev)}
          toggleStateFromParent={enableUpdatesNotifications}
        />
      </div>
      <div className="flex items-center space-x-2">
        <p className="flex items-center gap-2">
          <FiSend size={16} className="text-icon-surface-single-color-primary" />
          <span>{t('setting:NORMAL.EMAIL_NOTIFICATION')}</span>
        </p>
        <Toggle
          id="tax-toggle"
          initialToggleState={enableEmailNotifications}
          getToggledState={() => setEnableEmailNotifications((prev) => !prev)}
          toggleStateFromParent={enableEmailNotifications}
        />
      </div>
    </div>
  );
};

export default NoticeSettings;
