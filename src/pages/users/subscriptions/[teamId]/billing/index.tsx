import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/beta/layout/layout';
import BillingPageBody from '@/components/beta/billing_page/billing_page_body';
import { IUserOwnedTeam, TPlanType, TPaymentStatus } from '@/interfaces/subscription';
import { ISUNFA_ROUTE } from '@/constants/url';

const FAKE_TEAM_DATA: IUserOwnedTeam = {
  id: 3,
  name: 'Team B',
  plan: TPlanType.ENTERPRISE,
  enableAutoRenewal: false,
  nextRenewalTimestamp: 1736936488530,
  expiredTimestamp: 1736936488530,
  paymentStatus: TPaymentStatus.UNPAID,
};

const BillingPage = () => {
  const { t } = useTranslation(['subscriptions']);
  const router = useRouter();
  const { teamId } = router.query;
  const teamIdString = teamId ? (Array.isArray(teamId) ? teamId[0] : teamId) : '';
  // Deprecated: (20250113 - Liz)
  // eslint-disable-next-line no-console
  console.log('teamIdString:', teamIdString);

  // ToDo: (20250113 - Liz) 先暫時使用假資料 FAKE_TEAM_DATA
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [team, setTeam] = useState<IUserOwnedTeam | null>(FAKE_TEAM_DATA);

  // ToDo: (20250113 - Liz) 呼叫 API 利用 teamIdString 取得 team 的資料，並且設定到 team state
  // setTeam(teamData);

  // ToDo: (20250113 - Liz) 如果 team 資料不存在，顯示錯誤頁面
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
        pageTitle={`${t('subscriptions:BILLING_PAGE.PAGE_TITLE_PREFIX')} ${team.name} ${t('subscriptions:BILLING_PAGE.PAGE_TITLE_SUFFIX')}`}
        goBackUrl={ISUNFA_ROUTE.SUBSCRIPTIONS}
      >
        <BillingPageBody team={team} />
      </Layout>
    </>
  );
};

export const getServerSideProps = async ({ locale }: ILocale) => {
  return {
    props: {
      ...(await serverSideTranslations(locale as string, ['layout', 'dashboard', 'subscriptions'])),
    },
  };
};

export default BillingPage;
