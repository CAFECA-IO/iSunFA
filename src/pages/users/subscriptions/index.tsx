import Head from 'next/head';
import { useEffect, useState, useCallback } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import { useTranslation } from 'next-i18next';
import Layout from '@/components/beta/layout/layout';
import SubscriptionsPageBody from '@/components/beta/subscriptions_page/subscriptions_page_body';
import { IUserOwnedTeam } from '@/interfaces/subscription';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { IPaginatedData } from '@/interfaces/pagination';
import { SkeletonList } from '@/components/skeleton/skeleton';
import loggerFront from '@/lib/utils/logger_front';
// import { FAKE_OWNED_TEAMS } from '@/lib/services/subscription_service'; // Deprecated: (20250117 - Liz) 測試可以使用:假資料 FAKE_OWNED_TEAMS

const SubscriptionsPage = () => {
  const { t } = useTranslation(['subscriptions']);
  const [isLoading, setIsLoading] = useState(true);
  const [userOwnedTeams, setUserOwnedTeams] = useState<IUserOwnedTeam[] | null>(null);
  // Deprecated: (20250117 - Liz) 測試可以使用:假資料 FAKE_OWNED_TEAMS

  // Info: (20250117 - Liz) 取得使用者擁有的所有團隊 API
  const { trigger: getUserOwnedTeamsAPI } = APIHandler<IPaginatedData<IUserOwnedTeam[]>>(
    APIName.LIST_TEAM_SUBSCRIPTION
  );

  // Info: (20250117 - Liz) 打 API 取得使用者擁有的所有團隊
  const getUserOwnedTeams = useCallback(async () => {
    setIsLoading(true);

    try {
      const { data: ownedTeams, success } = await getUserOwnedTeamsAPI();

      if (success && ownedTeams && ownedTeams.data) {
        setUserOwnedTeams(ownedTeams.data);
      }
    } catch (error) {
      loggerFront.error('取得使用者擁有的所有團隊失敗');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    getUserOwnedTeams();
  }, [getUserOwnedTeams]);

  // Info: (20250117 - Liz) 如果打 API 還在載入中，顯示載入中頁面
  if (isLoading) {
    return (
      <Layout isDashboard={false}>
        <div className="flex items-center justify-center">
          <SkeletonList count={6} />
        </div>
      </Layout>
    );
  }

  // Info: (20250117 - Liz) 如果 userOwnedTeams 資料不存在，顯示錯誤頁面
  if (!userOwnedTeams) {
    return (
      <Layout isDashboard={false} pageTitle={t('subscriptions:ERROR.USER_OWNED_TEAMS_NOT_FOUND')}>
        <h1 className="text-red-500">{t('subscriptions:ERROR.USER_OWNED_TEAMS_NOT_FOUND')}</h1>
      </Layout>
    );
  }

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('subscriptions:SUBSCRIPTIONS_PAGE.META_TITLE')}</title>
        <meta
          name="description"
          content="iSunFA: Blockchain AI Forensic Accounting and Auditing is where simplicity meets accuracy in the realm of financial investigations."
        />
        <meta name="author" content="CAFECA" />
        <meta name="keywords" content="區塊鏈,人工智慧,會計" />

        <meta property="og:title" content="iSunFA" />
        <meta
          property="og:description"
          content="iSunFA: Blockchain AI Forensic Accounting and Auditing is where simplicity meets accuracy in the realm of financial investigations."
        />
      </Head>

      <Layout
        isDashboard={false}
        pageTitle={t('subscriptions:SUBSCRIPTIONS_PAGE.SUBSCRIPTION_PLANS')}
      >
        <SubscriptionsPageBody
          userOwnedTeams={userOwnedTeams}
          getUserOwnedTeams={getUserOwnedTeams}
        />
      </Layout>
    </>
  );
};

export const getServerSideProps = async ({ locale }: ILocale) => {
  return {
    props: {
      ...(await serverSideTranslations(locale as string, [
        'common',
        'layout',
        'dashboard',
        'subscriptions',
      ])),
    },
  };
};

export default SubscriptionsPage;
