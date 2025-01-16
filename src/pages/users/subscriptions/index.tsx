import Head from 'next/head';
import { useState } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import { useTranslation } from 'next-i18next';
import Layout from '@/components/beta/layout/layout';
import SubscriptionsPageBody from '@/components/beta/subscriptions_page/subscriptions_page_body';
import { IUserOwnedTeam, TPlanType, TPaymentStatus } from '@/interfaces/subscription';

// ToDo: (20250102 - Liz) 這邊的資料是假的，之後要改成從 API 拿 userOwnedTeams: IUserOwnedTeam[];
const FAKE_OWNED_TEAMS: IUserOwnedTeam[] = [
  {
    id: 1,
    name: 'Personal',
    plan: TPlanType.BEGINNER,
    enableAutoRenewal: false,
    nextRenewalTimestamp: 1736936488530,
    expiredTimestamp: 1736936488530,
    paymentStatus: TPaymentStatus.FREE,
  },
  {
    id: 2,
    name: 'Team A',
    plan: TPlanType.PROFESSIONAL,
    enableAutoRenewal: true,
    nextRenewalTimestamp: 1736936488530,
    expiredTimestamp: 1736936488530,
    paymentStatus: TPaymentStatus.UNPAID,
  },
  {
    id: 3,
    name: 'Team B',
    plan: TPlanType.ENTERPRISE,
    enableAutoRenewal: false,
    nextRenewalTimestamp: 1736936488530,
    expiredTimestamp: 1736936488530,
    paymentStatus: TPaymentStatus.PAID,
  },
];

const SubscriptionsPage = () => {
  const { t } = useTranslation(['subscriptions']);

  // ToDo: (20250115 - Liz) 先暫時使用假資料 FAKE_TEAM_DATA
  // Deprecated: (20250115 - Liz) remove eslint-disable
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [userOwnedTeams, setUserOwnedTeams] = useState<IUserOwnedTeam[] | null>(FAKE_OWNED_TEAMS);

  // ToDo: (20250115 - Liz) 呼叫 API 取得 userOwnedTeams 的資料，並且設定到 userOwnedTeams state
  // setUserOwnedTeams(ownedTeams);

  // ToDo: (20250115 - Liz) 如果 userOwnedTeams 資料不存在，顯示錯誤頁面
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
        <SubscriptionsPageBody userOwnedTeams={userOwnedTeams} />
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

export default SubscriptionsPage;
