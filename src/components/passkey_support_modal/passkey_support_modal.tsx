import React from 'react';
import Image from 'next/image';
import { Button } from '@/components/button/button';
import { useTranslation } from 'next-i18next';
import { RxCross2 } from 'react-icons/rx';

interface IPasskeySupportModal {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
}

const PasskeySupportModal = ({ isModalVisible, modalVisibilityHandler }: IPasskeySupportModal) => {
  const { t } = useTranslation([
    'common',
    'project',
    'journal',
    'kyc',
    'report_401',
    'salary',
    'setting',
    'terms',
  ]);

  const isDisplayedPasskeySupportModal = isModalVisible ? (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50 font-barlow">
      <div className="relative mx-5 flex w-full flex-col items-start rounded-md bg-card-surface-primary pb-6 pt-2 shadow-lg shadow-black/80 sm:w-400px sm:px-3 lg:mx-auto">
        <div className="absolute right-3 top-3">
          <button type="button" onClick={modalVisibilityHandler}>
            <RxCross2 size={20} />
          </button>
        </div>
        <div className="mx-auto flex pb-4 pt-4">
          <div className="flex w-full flex-1 flex-col justify-between text-center text-xl font-bold text-card-text-primary">
            <div className="">{t('common:PASSKEY_SUPPORT_MODAL.PASSKEY_SUPPORT_SUMMARY')}</div>
          </div>
        </div>
        <div className="mt-2 flex w-full flex-col justify-center space-y-4">
          <div className="flex items-center gap-3 px-5">
            <div className="flex items-center justify-center">
              <Image src="/icons/android_icon.svg" alt="android_icon" width={20} height={20} />
            </div>
            <div className="flex flex-1 flex-col justify-center text-xs text-tree-text-primary">
              {t('common:PASSKEY_SUPPORT_MODAL.ANDROID')}
            </div>
            <div className="flex items-center justify-center">
              <Image src="/icons/checked_mark.svg" alt="checked_mark" width={20} height={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3 px-5">
            <div className="flex items-center justify-center">
              <Image src="/icons/mac_os_icon.svg" alt="mac_os_icon" width={20} height={20} />
            </div>
            <div className="flex flex-1 flex-col justify-center text-xs text-tree-text-primary">
              {t('common:PASSKEY_SUPPORT_MODAL.MACOS')}
            </div>
            <div className="flex items-center justify-center">
              <Image src="/icons/checked_mark.svg" alt="checked_mark" width={20} height={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3 px-5">
            <div className="flex items-center justify-center">
              <Image src="/icons/ios_icon.svg" alt="ios_icon" width={20} height={20} />
            </div>

            <div className="flex flex-1 flex-col justify-center text-xs text-tree-text-primary">
              {t('common:PASSKEY_SUPPORT_MODAL.IOS')}
            </div>
            <div className="flex items-center justify-center">
              <Image src="/icons/checked_mark.svg" alt="checked_mark" width={20} height={20} />
            </div>
          </div>
        </div>
        <div className="flex w-full items-center justify-center px-5 pb-0 pt-6 text-sm font-medium">
          <Button
            variant={'tertiaryOutline'}
            type="button"
            onClick={modalVisibilityHandler}
            className="w-full lg:w-90px"
          >
            {t('common:PASSKEY_SUPPORT_MODAL.GOT_IT')}
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  return <div>{isDisplayedPasskeySupportModal}</div>;
};

export default PasskeySupportModal;
