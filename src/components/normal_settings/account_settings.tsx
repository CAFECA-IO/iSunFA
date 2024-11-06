import React from 'react';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import { Button } from '@/components/button/button';

interface AccountSettingsProps {}

const AccountSettings: React.FC<AccountSettingsProps> = () => {
  const { t } = useTranslation(['setting', 'common']);
  return (
    <div className="flex flex-col">
      <div id="notice-setting-section" className="mb-lv-7 flex items-center gap-4">
        <hr className="block flex-1 border-divider-stroke-lv-4 md:hidden" />
        <div className="flex items-center gap-2 text-sm text-divider-text-lv-1">
          <Image src="/icons/attribution.svg" width={16} height={16} alt="notice_icon" />
          <p>{t('setting:NORMAL.ACCOUNT_SETTING')}</p>
        </div>
        <hr className="flex-1 border-divider-stroke-lv-4" />
      </div>
      <Button
        id="setting-subscribe"
        type="button"
        variant="linkBorderless"
        className="mb-lv-7 justify-start p-0"
      >
        <p className="flex gap-2">
          <Image src="/icons/currency-dollar-circle.svg" width={16} height={16} alt="notice_icon" />
          <span>{t('setting:NORMAL.SUBSCRIPTION_MANAGEMENT')}</span>
        </p>
      </Button>
      <Button
        id="setting-remove"
        type="button"
        variant="errorBorderless"
        className="justify-start p-0"
      >
        <p className="flex gap-2">
          <Image src="/icons/user-x-02.svg" width={16} height={16} alt="notice_icon" />
          <span>{t('setting:NORMAL.REMOVE_THIS_ACCOUNT')}</span>
        </p>
      </Button>
    </div>
  );
};

export default AccountSettings;
