import React, { useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import Head from 'next/head';
import Layout from '@/components/beta/layout/layout';
import UserSettings from '@/components/user_settings/user_settings';
import NoticeSettings from '@/components/notice_settings/notice_settings';
import CompanySettings from '@/components/company_settings/company_settings';
import AccountSettings from '@/components/account_settings/account_settings';
import APIHandler from '@/lib/utils/api_handler';
import { IUserSetting } from '@/interfaces/user_setting';
import { APIName } from '@/constants/api_connection';
import { useUserCtx } from '@/contexts/user_context';
import { IUserActionLog } from '@/interfaces/user_action_log';
import { IPaginatedData } from '@/interfaces/pagination';
import { useModalContext } from '@/contexts/modal_context';
import { ToastId } from '@/constants/toast_id';
import { ToastType } from '@/interfaces/toastify';
import { UserActionLogActionType } from '@/constants/user_action_log';

const GeneralSettingsPage: React.FC = () => {
  const { t } = useTranslation(['setting', 'common']);
  const { toastHandler } = useModalContext();
  const { userAuth } = useUserCtx();
  const [userSetting, setUserSetting] = useState<IUserSetting | null>(null);
  const [userActionLogs, setUserActionLogs] = useState<IPaginatedData<IUserActionLog[]> | null>(
    null
  );

  const { trigger: getUserSettingAPI } = APIHandler<IUserSetting>(APIName.USER_SETTING_GET);
  const { trigger: getUserActionLogAPI } = APIHandler<IPaginatedData<IUserActionLog[]>>(
    APIName.USER_ACTION_LOG_LIST
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
        content: (error as Error).message,
        closeable: true,
      });
    }
  };

  const getUserActions = async () => {
    try {
      const { success, data } = await getUserActionLogAPI({
        params: { userId: userAuth?.id },
        query: { actionType: UserActionLogActionType.LOGIN },
      });
      if (success && data) {
        setUserActionLogs(data);
      }
    } catch (error) {
      toastHandler({
        id: ToastId.USER_SETTING_ERROR,
        type: ToastType.ERROR,
        content: (error as Error).message,
        closeable: true,
      });
    }
  };

  useEffect(() => {
    getUserSetting();
    getUserActions();
  }, []);

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('setting:NORMAL.TITLE')} - iSunFA</title>
      </Head>

      <Layout isDashboard={false} pageTitle={t('setting:NORMAL.TITLE')}>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-lv-7 p-lv-4">
          <UserSettings userSetting={userSetting} userActionLogs={userActionLogs} />
          <NoticeSettings userSetting={userSetting} />
          <CompanySettings />
          <AccountSettings />
        </div>
      </Layout>
    </>
  );
};

export const getServerSideProps = async ({ locale }: ILocale) => {
  return {
    props: {
      ...(await serverSideTranslations(locale as string, ['common', 'setting', 'company'])),
    },
  };
};

export default GeneralSettingsPage;
