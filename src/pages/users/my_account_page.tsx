import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { useUserCtx } from '@/contexts/user_context';
import { IPaginatedData } from '@/interfaces/pagination';
import { useModalContext } from '@/contexts/modal_context';
import { ToastId } from '@/constants/toast_id';
import { ToastType } from '@/interfaces/toastify';
import { ILoginDevice } from '@/interfaces/login_device';
import Layout from '@/components/beta/layout/layout';
import MyAccountPageBody from '@/components/beta/my_account_page/my_account_page_body';

const MyAccountPage: React.FC = () => {
  const { t } = useTranslation(['common', 'team', 'settings']);
  const { toastHandler } = useModalContext();
  const { userAuth } = useUserCtx();
  const [loginDevices, setLoginDevices] = useState<IPaginatedData<ILoginDevice[]> | null>(null);

  const { trigger: listLoginDeviceAPI } = APIHandler<IPaginatedData<ILoginDevice[]>>(
    APIName.LIST_LOGIN_DEVICE
  );

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
    getUserActions();
  }, [userAuth]);

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('team:MY_ACCOUNT_PAGE.PAGE_TITLE')} - iSunFA</title>
      </Head>

      <Layout isDashboard={false} pageTitle={t('team:MY_ACCOUNT_PAGE.PAGE_TITLE')}>
        <MyAccountPageBody loginDevices={loginDevices} />
      </Layout>
    </>
  );
};

const getStaticPropsFunction = async ({ locale }: ILocale) => ({
  props: {
    ...(await serverSideTranslations(locale, [
      'layout',
      'common',
      'journal',
      'settings',
      'asset',
      'dashboard',
      'date_picker',
      'subscriptions',
      'team',
    ])),
    locale,
  },
});

export const getStaticProps = getStaticPropsFunction;

export default MyAccountPage;
