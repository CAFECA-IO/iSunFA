import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import { useTranslation } from 'next-i18next';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/beta/layout/layout';
import PaymentPageBody from '@/components/beta/payment_page/payment_page_body';
import { IUserOwnedTeam } from '@/interfaces/subscription';
import { ISUNFA_ROUTE } from '@/constants/url';
import { PLANS } from '@/constants/subscription';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { SkeletonList } from '@/components/skeleton/skeleton';
import { useUserCtx } from '@/contexts/user_context';
import loggerFront from '@/lib/utils/logger_front';

const PaymentPage = () => {
  const { t } = useTranslation(['subscriptions']);
  const router = useRouter();
  const { teamId, sp } = router.query;
  const teamIdString = teamId ? (Array.isArray(teamId) ? teamId[0] : teamId) : '';
  const spString = sp ? (Array.isArray(sp) ? sp[0] : sp) : '';

  const { handleBindingResult } = useUserCtx();

  // Info: (20250114 - Liz) 找出 spString 所對應的 plan 資料
  const planFromUrl = PLANS.find((p) => p.id === spString);

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
      loggerFront.error('取得團隊資料失敗');
      loggerFront.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [teamIdString]);

  useEffect(() => {
    getOwnedTeam();
  }, [getOwnedTeam]);

  // Info: (20250321 - Julian) 接收來自第三方金流的訊息
  useEffect(() => {
    const receiveMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data) {
        handleBindingResult(event.data === 'true');
      } else {
        handleBindingResult(null);
      }
    };

    window.addEventListener('message', receiveMessage);

    return () => {
      window.removeEventListener('message', receiveMessage);
    };
  }, []);

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
      <Layout isDashboard={false} goBackUrl={ISUNFA_ROUTE.SUBSCRIPTIONS}>
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
        pageTitle={t('subscriptions:PAYMENT_PAGE.PAGE_TITLE')}
        goBackUrl={`${ISUNFA_ROUTE.SUBSCRIPTIONS}/${teamIdString}`}
      >
        <PaymentPageBody team={team} subscriptionPlan={planFromUrl} getOwnedTeam={getOwnedTeam} />
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

export default PaymentPage;
