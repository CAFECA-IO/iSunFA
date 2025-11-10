import React, { useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import Head from 'next/head';
import Layout from '@/components/beta/layout/layout';
import UserSettings from '@/components/general/user_settings/user_settings';
import NoticeSettings from '@/components/general/notice_settings';
import AccountBookSettings from '@/components/general/account_book_settings/account_book_settings';
import AccountSettings from '@/components/general/account_settings/account_settings';
import APIHandler from '@/lib/utils/api_handler';
import { IUserSetting } from '@/interfaces/user_setting';
import { APIName } from '@/constants/api_connection';
import { useUserCtx } from '@/contexts/user_context';
import { IPaginatedData } from '@/interfaces/pagination';
import { useModalContext } from '@/contexts/modal_context';
import { ToastId } from '@/constants/toast_id';
import { ToastType } from '@/interfaces/toastify';
import { ILoginDevice } from '@/interfaces/login_device';

const GeneralSettingsPage: React.FC = () => {
  const { t } = useTranslation(['settings', 'common']);
  const { toastHandler } = useModalContext();
  const { userAuth } = useUserCtx();
  const [userSetting, setUserSetting] = useState<IUserSetting | null>(null);
  const [loginDevices, setLoginDevices] = useState<IPaginatedData<ILoginDevice[]> | null>(null);

  const { trigger: getUserSettingAPI } = APIHandler<IUserSetting>(APIName.USER_SETTING_GET);
  const { trigger: listLoginDeviceAPI } = APIHandler<IPaginatedData<ILoginDevice[]>>(
    APIName.LIST_LOGIN_DEVICE
  );

  const getUserSetting = async () => {
    try {
      const { success, data } = await getUserSettingAPI({ params: { userId: userAuth?.id } });
      if (success && data) {
        setUserSetting(data);
      }
    } catch (error) {
      toastHandler({
        id: ToastId.USER_SETTING_ERROR,
        type: ToastType.ERROR,
        content: t('settings:ERROR.FETCH_DATA', { error }),
        closeable: true,
      });
    }
  };

  const getUserActions = async () => {
    try {
      const { success, data } = await listLoginDeviceAPI({
        params: { userId: userAuth?.id },
      });
      if (success && data) {
        setLoginDevices(data);
      }
    } catch (error) {
      toastHandler({
        id: ToastId.USER_SETTING_ERROR,
        type: ToastType.ERROR,
        content: t('settings:ERROR.FETCH_DATA', { error }),
        closeable: true,
      });
    }
  };

  useEffect(() => {
    if (!userAuth) return;
    getUserSetting();
    getUserActions();
  }, [userAuth]);

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('settings:NORMAL.TITLE')} - iSunFA</title>
      </Head>

      <Layout isDashboard={false} pageTitle={t('settings:NORMAL.TITLE')}>
        <div className="flex flex-col gap-lv-7">
          <UserSettings userSetting={userSetting} loginDevices={loginDevices} />
          <NoticeSettings userSetting={userSetting} />
          <AccountBookSettings />
          <AccountSettings />
        </div>
      </Layout>
    </>
  );
};

export const getServerSideProps = async ({ locale }: ILocale) => {
  return {
    props: {
      ...(await serverSideTranslations(locale as string, [
        'layout',
        'common',
        'settings',
        'account_book',
        'filter_section_type',
        'search',
        'dashboard',
      ])),
    },
  };
};

export default GeneralSettingsPage;
