import React from 'react';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import { FiSend } from 'react-icons/fi';
import Toggle from '@/components/toggle/toggle';

interface NoticeSettingsProps {}

const NoticeSettings: React.FC<NoticeSettingsProps> = () => {
  const { t } = useTranslation(['setting', 'common']);

  const [enableSystemNotifications, setEnableSystemNotifications] = React.useState(false);
  const [enableUpdatesNotifications, setEnableUpdatesNotifications] = React.useState(false);
  const [enableEmailNotifications, setEnableEmailNotifications] = React.useState(false);

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
