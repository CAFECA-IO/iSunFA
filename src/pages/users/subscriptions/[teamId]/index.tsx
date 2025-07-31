import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import { useTranslation } from 'next-i18next';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/beta/layout/layout';
import TeamSubscriptionPageBody from '@/components/beta/team_subscription_page/team_subscription_page_body';
import { IUserOwnedTeam } from '@/interfaces/subscription';
import { ISUNFA_ROUTE } from '@/constants/url';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { SkeletonList } from '@/components/skeleton/skeleton';
import loggerFront from '@/lib/utils/logger_front';

const TeamSubscriptionPage = () => {
  const { t } = useTranslation(['subscriptions']);
  const router = useRouter();
  const { teamId } = router.query;
  const teamIdString = teamId ? (Array.isArray(teamId) ? teamId[0] : teamId) : '';
  const [team, setTeam] = useState<IUserOwnedTeam | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Info: (20250117 - Liz) 取得使用者擁有的團隊資料 API (user is the owner of the team)
  const { trigger: getOwnedTeamAPI } = APIHandler<IUserOwnedTeam>(
    APIName.GET_SUBSCRIPTION_BY_TEAM_ID
  );

  // Info: (20250117 - Liz) 打 API 取得使用者擁有的團隊資料
  const getOwnedTeam = useCallback(async () => {
    if (!teamIdString) return;
    setIsLoading(true);

    try {
      const { data: teamData, success } = await getOwnedTeamAPI({
        params: { teamId: teamIdString },
      });

      if (success && teamData) {
        setTeam(teamData);
      }
    } catch (error) {
      loggerFront.log('取得團隊資料失敗');
    } finally {
      setIsLoading(false);
    }
  }, [teamIdString]);

  useEffect(() => {
    getOwnedTeam();
  }, [getOwnedTeam]);

  // Info: (20250117 - Liz) 如果打 API 還在載入中，顯示載入中頁面
  if (isLoading) {
    return (
      <Layout isDashboard={false} goBackUrl={ISUNFA_ROUTE.SUBSCRIPTIONS}>
        <div className="flex items-center justify-center">
          <SkeletonList count={6} />
        </div>
      </Layout>
    );
  }

  // Info: (20250117 - Liz) 如果 team 資料不存在，顯示錯誤頁面
  if (!team) {
    return (
      <Layout
        isDashboard={false}
        pageTitle={t('subscriptions:ERROR.TEAM_DATA_NOT_FOUND')}
        goBackUrl={ISUNFA_ROUTE.SUBSCRIPTIONS}
      >
        <h1 className="text-red-500">{t('subscriptions:ERROR.TEAM_DATA_NOT_FOUND')}</h1>
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
        pageTitle={t('subscriptions:SUBSCRIPTIONS_PAGE.PLAN_FOR') + team.name}
        goBackUrl={ISUNFA_ROUTE.SUBSCRIPTIONS}
      >
        <TeamSubscriptionPageBody team={team} getOwnedTeam={getOwnedTeam} />
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

export default TeamSubscriptionPage;
