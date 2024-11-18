import React from 'react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import Image from 'next/image';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { useModalContext } from '@/contexts/modal_context';
import { useUserCtx } from '@/contexts/user_context';
import { ISUNFA_ROUTE } from '@/constants/url';
import { MessageType } from '@/interfaces/message_modal';

interface AccountSettingsProps {}

const AccountSettings: React.FC<AccountSettingsProps> = () => {
  const { t } = useTranslation(['setting', 'common']);
  const router = useRouter();
  const { userAuth } = useUserCtx();
  const { trigger: deleteAccountAPI } = APIHandler(APIName.DELETE_ACCOUNT_BY_ID); // ToDo: (20241114 - tzuhan) 後端還未提供刪除 user 的 API，等後端提供後需更新
  const { messageModalVisibilityHandler, messageModalDataHandler } = useModalContext();

  const procedureOfDelete = () => {
    if (!userAuth) return;
    messageModalVisibilityHandler();
    deleteAccountAPI({
      params: {
        userId: userAuth.id,
      },
    });

    router.push(ISUNFA_ROUTE.DASHBOARD);
  };

  const deleteAccountClickHandler = () => {
    if (!userAuth) return;
    messageModalDataHandler({
      messageType: MessageType.WARNING,
      title: t('company:DELETE.TITLE'),
      content: t('company:DELETE.WARNING'),
      backBtnStr: t('common:COMMON.CANCEL'),
      submitBtnStr: t('setting:SETTING.REMOVE'),
      submitBtnFunction: procedureOfDelete,
    });
    messageModalVisibilityHandler();
  };

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
      <button
        id="setting-subscribe"
        type="button"
        className="group mb-lv-7 inline-flex items-center justify-start whitespace-nowrap rounded-xs border-none font-medium text-text-neutral-link hover:text-button-text-primary-hover focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:text-button-text-disable disabled:opacity-100"
        disabled
      >
        <p className="flex gap-2">
          <Image src="/icons/currency-dollar-circle.svg" width={16} height={16} alt="notice_icon" />
          <span>{t('setting:NORMAL.SUBSCRIPTION_MANAGEMENT')}</span>
        </p>
      </button>
      <button
        id="setting-remove-account"
        type="button"
        className="group inline-flex items-center justify-start whitespace-nowrap rounded-xs border-none font-medium text-text-state-error hover:text-button-text-primary-hover focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:text-button-text-disable disabled:opacity-100"
      >
        <p className="flex cursor-pointer gap-2" onClick={deleteAccountClickHandler}>
          <Image src="/icons/user-x-02.svg" width={16} height={16} alt="notice_icon" />
          <span>{t('setting:NORMAL.REMOVE_THIS_ACCOUNT')}</span>
        </p>
      </button>
    </div>
  );
};

export default AccountSettings;
