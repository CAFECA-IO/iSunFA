import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/beta/layout/layout';
import PaymentPageBody from '@/components/beta/payment_page/payment_page_body';
import { IUserOwnedTeam, TPlanType, TPaymentStatus } from '@/interfaces/subscription';
import { ISUNFA_ROUTE } from '@/constants/url';
import { PLANS } from '@/constants/subscription';

const FAKE_TEAM_DATA: IUserOwnedTeam = {
  id: 1,
  name: 'Personal',
  plan: TPlanType.PROFESSIONAL,
  nextRenewalTimestamp: 1736936488530,
  expiredTimestamp: 1736936488530,
  enableAutoRenewal: true,
  paymentStatus: TPaymentStatus.FREE,
};

const PaymentPage = () => {
  const { t } = useTranslation(['subscriptions']);
  const router = useRouter();
  const { teamId, sp } = router.query;
  const teamIdString = teamId ? (Array.isArray(teamId) ? teamId[0] : teamId) : '';
  const spString = sp ? (Array.isArray(sp) ? sp[0] : sp) : '';
  // Deprecated: (20250102 - Liz)
  // eslint-disable-next-line no-console
  console.log('teamIdString:', teamIdString, 'spString:', spString);

  // Info: (20250114 - Liz) 找出 spString 所對應的 plan 資料
  const planFromUrl = PLANS.find((p) => p.id === spString);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [team, setTeam] = useState<IUserOwnedTeam | null>(FAKE_TEAM_DATA);

  // ToDo: (20250102 - Liz) 呼叫 API 利用 teamIdString 取得 team 的資料，並且設定到 team state
  // setTeam(teamData);
  const getUserOwnedTeam = async () => {};

  // ToDo: (20250102 - Liz) 如果 team 資料不存在，顯示錯誤頁面
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
        pageTitle={t('subscriptions:PAYMENT_PAGE.PAGE_TITLE')}
        goBackUrl={`${ISUNFA_ROUTE.SUBSCRIPTIONS}/${teamIdString}`}
      >
        <PaymentPageBody
          team={FAKE_TEAM_DATA}
          subscriptionPlan={planFromUrl}
          getUserOwnedTeam={getUserOwnedTeam}
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

export default PaymentPage;
