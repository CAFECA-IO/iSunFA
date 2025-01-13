import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/beta/layout/layout';
import InvoicePageBody from '@/components/beta/invoice_page/invoice_page_body';
import { IUserOwnedTeam, TPlanType, TPaymentStatus } from '@/interfaces/subscription';
import { ISUNFA_ROUTE } from '@/constants/url';

const FAKE_TEAM_DATA: IUserOwnedTeam = {
  id: 3,
  name: 'Team B',
  plan: TPlanType.ENTERPRISE,
  enableAutoRenewal: false,
  nextRenewalTimestamp: 0,
  expiredTimestamp: 1630406400000,
  paymentStatus: TPaymentStatus.PAID,
};

// ToDo: (20250113 - Liz) 定義 invoice 假資料

const InvoicePage = () => {
  const { t } = useTranslation(['subscriptions']);
  const router = useRouter();
  const { teamId, invoiceId } = router.query;
  const teamIdString = teamId ? (Array.isArray(teamId) ? teamId[0] : teamId) : '';
  const invoiceIdString = invoiceId ? (Array.isArray(invoiceId) ? invoiceId[0] : invoiceId) : '';

  // Deprecated: (20250113 - Liz)
  // eslint-disable-next-line no-console
  console.log('teamIdString:', teamIdString, 'invoiceIdString:', invoiceIdString);

  // ToDo: (20250113 - Liz) 先暫時使用假資料
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [team, setTeam] = useState<IUserOwnedTeam>(FAKE_TEAM_DATA);

  // ToDo: (20250113 - Liz) 呼叫 API 利用 teamIdString 取得 team 的資料，並且設定到 team state
  // setTeam(teamData);

  // Info: (20250113 - Liz) 呼叫 API 利用 invoiceIdString 取得 invoice 的資料，並且設定到 invoice state

  // ToDo: (20250113 - Liz) 如果 team 資料不存在，顯示錯誤頁面
  // 參考:
  //   if (!teamIdString) {
  //     return (
  //       <Layout isDashboard={false} pageTitle={'Plan for Personal'}>
  //         <h1 className="text-red-500">{t('subscriptions:ERROR.TEAM_ID_NOT_FOUND')}</h1>
  //       </Layout>
  //     );
  //   }

  // ToDo: (20250113 - Liz) 如果 invoiceIdString 資料不存在，顯示錯誤頁面

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('subscriptions:INVOICE_PAGE.META_TITLE')}</title>
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
        pageTitle={`${t('subscriptions:INVOICE_PAGE.PAGE_TITLE')} # ${invoiceIdString}`}
        goBackUrl={ISUNFA_ROUTE.SUBSCRIPTIONS}
      >
        <InvoicePageBody team={FAKE_TEAM_DATA} />
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

export default InvoicePage;
