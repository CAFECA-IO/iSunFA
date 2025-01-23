import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import { useModalContext } from '@/contexts/modal_context';
import { useUserCtx } from '@/contexts/user_context';
import { MessageType } from '@/interfaces/message_modal';
import { ToastId } from '@/constants/toast_id';
import { ToastType } from '@/interfaces/toastify';
import { IUser } from '@/interfaces/user';
import { ISUNFA_ROUTE } from '@/constants/url';
import Link from 'next/link';

interface AccountSettingsProps {}

const AccountSettings: React.FC<AccountSettingsProps> = () => {
  const { t } = useTranslation(['setting', 'common']);
  const { userAuth, deleteAccount, cancelDeleteAccount } = useUserCtx();
  const [user, setUser] = useState<IUser | null>(userAuth);
  const { messageModalVisibilityHandler, messageModalDataHandler, toastHandler } =
    useModalContext();

  const procedureOfCancel = async () => {
    if (!user) return;
    try {
      const { success, data: userData, code } = await cancelDeleteAccount();
      if (success && userData) {
        setUser(userData);
        toastHandler({
          id: ToastId.USER_DELETE_CANCEL,
          type: ToastType.SUCCESS,
          content: t('setting:USER.DELETE_CANCEL_SUCCESS'),
          closeable: true,
        });
      } else throw new Error(code);
    } catch (error) {
      toastHandler({
        id: ToastId.USER_DELETE_ERROR,
        type: ToastType.ERROR,
        content: t('setting:USER.DELETE_ERROR'),
        closeable: true,
      });
    }
  };

  const procedureOfDelete = async () => {
    if (!user) return;
    try {
      messageModalVisibilityHandler();
      const { success, data: userData, code } = await deleteAccount();
      if (success && userData) {
        setUser(userData);
        const calculateRemainDays = (deletedAt: number) => {
          const now = new Date().getTime();
          const days = 3 - Math.floor((now - deletedAt * 1000) / 24 / 60 / 60 / 1000);
          return days;
        };
        const warningContent = (
          <div className="flex justify-between">
            <div className="flex flex-col items-start gap-2">
              <p className="text-text-state-error">
                {t('layout:USER.DELETE_WARNING', {
                  days: calculateRemainDays(userData.deletedAt),
                })}
              </p>
              <p>{t('layout:USER.DELETE_HINT')}</p>
            </div>
            <Link
              href={ISUNFA_ROUTE.GENERAL_SETTING}
              className="text-sm font-bold text-link-text-warning"
            >
              {t('layout:USER.SETTING')}
            </Link>
          </div>
        );
        toastHandler({
          id: ToastId.USER_DELETE_WARNING,
          type: ToastType.WARNING,
          content: warningContent,
          closeable: true,
        });
      } else throw new Error(code);
    } catch (error) {
      toastHandler({
        id: ToastId.USER_DELETE_ERROR,
        type: ToastType.ERROR,
        content: t('setting:USER.DELETE_ERROR'),
        closeable: true,
      });
    }
  };

  const cancelDeleteClickHandler = () => {
    if (!user) return;
    messageModalDataHandler({
      messageType: MessageType.WARNING,
      title: t('setting:USER.DELETE_CANCEL'),
      content: t('setting:USER.DELETE_CANCEL_CONFIRM'),
      backBtnStr: t('common:COMMON.CANCEL'),
      submitBtnStr: t('setting:USER.DELETE_CANCEL_BTN'),
      submitBtnFunction: procedureOfCancel,
    });
    messageModalVisibilityHandler();
  };

  const deleteAccountClickHandler = () => {
    if (!user) return;
    messageModalDataHandler({
      messageType: MessageType.WARNING,
      title: t('setting:ACCOUNT.REMOVE'),
      content: t('setting:ACCOUNT.CONFIRM_REMOVE'),
      backBtnStr: t('common:COMMON.CANCEL'),
      submitBtnStr: t('setting:ACCOUNT.REMOVE_BTN'),
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
      <Link
        id="setting-subscribe"
        href={ISUNFA_ROUTE.SUBSCRIPTIONS}
        className="group mb-lv-7 inline-flex items-center justify-start whitespace-nowrap rounded-xs border-none font-medium text-text-neutral-link hover:text-button-text-primary-hover focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:text-button-text-disable disabled:opacity-100"
      >
        <p className="flex gap-2">
          <Image src="/icons/currency-dollar-circle.svg" width={16} height={16} alt="notice_icon" />
          <span>{t('setting:NORMAL.SUBSCRIPTION_MANAGEMENT')}</span>
        </p>
      </Link>
      {user?.deletedAt ? (
        <button
          id="setting-cancel-remove-account"
          type="button"
          className="group inline-flex items-center justify-start whitespace-nowrap rounded-xs border-none font-medium text-button-text-primary hover:text-button-text-primary-hover focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:text-button-text-disable disabled:opacity-100"
        >
          <p className="flex cursor-pointer gap-2" onClick={cancelDeleteClickHandler}>
            <Image src="/icons/user-x-02.svg" width={16} height={16} alt="notice_icon" />
            <span>{t('setting:USER.DELETE_CANCEL')}</span>
          </p>
        </button>
      ) : (
        <button
          id="setting-remove-account"
          type="button"
          className="group inline-flex items-center justify-start whitespace-nowrap rounded-xs border-none font-medium text-text-state-error hover:text-button-text-primary-hover focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:text-button-text-disable disabled:opacity-100"
        >
          <p className="flex cursor-pointer gap-2" onClick={deleteAccountClickHandler}>
            <Image src="/icons/user-x-02.svg" width={16} height={16} alt="notice_icon" />
            <span>{t('setting:ACCOUNT.REMOVE')}</span>
          </p>
        </button>
      )}
    </div>
  );
};

export default AccountSettings;
