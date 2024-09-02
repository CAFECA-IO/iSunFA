import React from 'react';
import Image from 'next/image';
import { Button } from '@/components/button/button';
import { useTranslation } from 'next-i18next';

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
      <div className="relative mx-5 flex w-full flex-col items-start rounded-md bg-white pb-6 pt-2 shadow-lg shadow-black/80 sm:w-400px sm:px-3 lg:mx-auto">
        <div className="absolute right-3 top-3">
          <button
            type="button"
            onClick={modalVisibilityHandler}
            className="flex items-center justify-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="30"
              height="30"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                fill="#314362"
                fillRule="evenodd"
                d="M6.296 6.294a1 1 0 011.414 0l4.293 4.293 4.293-4.293a1 1 0 111.414 1.414l-4.293 4.293 4.293 4.293a1 1 0 11-1.414 1.414l-4.293-4.293-4.293 4.293a1 1 0 01-1.414-1.414l4.293-4.293-4.293-4.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              ></path>
            </svg>
          </button>
        </div>
        <div className="mx-auto flex bg-white pb-4 pt-4">
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                fill="none"
                viewBox="0 0 16 16"
              >
                <g clipPath="url(#clip0_137_8118)">
                  <path
                    fill="#4BD394"
                    d="M6 10.78L3.687 8.467a.664.664 0 10-.94.94l2.786 2.786c.26.26.68.26.94 0l7.054-7.053a.664.664 0 10-.94-.94L6 10.78z"
                  ></path>
                </g>
                <defs>
                  <clipPath id="clip0_137_8118">
                    <path fill="#fff" d="M0 0H16V16H0z"></path>
                  </clipPath>
                </defs>
              </svg>
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                fill="none"
                viewBox="0 0 16 16"
              >
                <g clipPath="url(#clip0_137_8118)">
                  <path
                    fill="#4BD394"
                    d="M6 10.78L3.687 8.467a.664.664 0 10-.94.94l2.786 2.786c.26.26.68.26.94 0l7.054-7.053a.664.664 0 10-.94-.94L6 10.78z"
                  ></path>
                </g>
                <defs>
                  <clipPath id="clip0_137_8118">
                    <path fill="#fff" d="M0 0H16V16H0z"></path>
                  </clipPath>
                </defs>
              </svg>
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                fill="none"
                viewBox="0 0 16 16"
              >
                <g clipPath="url(#clip0_137_8118)">
                  <path
                    fill="#4BD394"
                    d="M6 10.78L3.687 8.467a.664.664 0 10-.94.94l2.786 2.786c.26.26.68.26.94 0l7.054-7.053a.664.664 0 10-.94-.94L6 10.78z"
                  ></path>
                </g>
                <defs>
                  <clipPath id="clip0_137_8118">
                    <path fill="#fff" d="M0 0H16V16H0z"></path>
                  </clipPath>
                </defs>
              </svg>
            </div>
          </div>
        </div>
        <div className="flex w-full items-center justify-center px-5 pb-0 pt-6 text-sm font-medium">
          <Button
            variant={'tertiaryOutline'}
            type="button"
            onClick={modalVisibilityHandler}
            className="w-full border border-navyBlue2 px-4 py-2 text-center text-navyBlue2 hover:border-primaryYellow hover:text-primaryYellow lg:w-90px"
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
