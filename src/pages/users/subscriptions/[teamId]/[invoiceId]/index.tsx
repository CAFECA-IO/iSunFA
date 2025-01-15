import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/beta/layout/layout';
import InvoicePageBody from '@/components/beta/invoice_page/invoice_page_body';
import { IUserOwnedTeam, TPlanType, TPaymentStatus, ITeamInvoice } from '@/interfaces/subscription';
import { ISUNFA_ROUTE } from '@/constants/url';

const FAKE_TEAM_DATA: IUserOwnedTeam = {
  id: 3,
  name: 'Team B',
  plan: TPlanType.ENTERPRISE,
  enableAutoRenewal: false,
  nextRenewalTimestamp: 1736936488530,
  expiredTimestamp: 1630406400000,
  paymentStatus: TPaymentStatus.PAID,
};

const FAKE_INVOICE_DATA: ITeamInvoice = {
  id: 1,
  teamId: 3,
  status: true,
  issuedTimestamp: 1630406400000,
  dueTimestamp: 1630406400000,
  planId: TPlanType.PROFESSIONAL,
  planStartTimestamp: 1630406400000,
  planEndTimestamp: 1630406400000,
  planQuantity: 1,
  planUnitPrice: 1000,
  planAmount: 1000,
  payer: {
    name: 'John Doe',
    address: '1234 Main St',
    phone: '123-456-7890',
    taxId: '123456789',
  },
  payee: {
    name: 'Jane Doe',
    address: '5678 Elm St',
    phone: '098-765-4321',
    taxId: '987654321',
  },
  subtotal: 0,
  tax: 0,
  total: 0,
  amountDue: 0,
};

const InvoicePage = () => {
  const { t } = useTranslation(['subscriptions']);
  const router = useRouter();
  const { teamId, invoiceId } = router.query;
  const teamIdString = teamId ? (Array.isArray(teamId) ? teamId[0] : teamId) : '';
  const invoiceIdString = invoiceId ? (Array.isArray(invoiceId) ? invoiceId[0] : invoiceId) : '';

  // Deprecated: (20250113 - Liz)
  // eslint-disable-next-line no-console
  console.log('teamIdString:', teamIdString, 'invoiceIdString:', invoiceIdString);

  // ToDo: (20250113 - Liz) 先暫時使用假資料 FAKE_TEAM_DATA 和 FAKE_INVOICE_DATA
  // Deprecate: (20250115 - Liz) remove eslint-disable
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [team, setTeam] = useState<IUserOwnedTeam | null>(FAKE_TEAM_DATA);
  // Deprecate: (20250115 - Liz) remove eslint-disable
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [invoice, setInvoice] = useState<ITeamInvoice | null>(FAKE_INVOICE_DATA);

  // ToDo: (20250113 - Liz) 呼叫 API 利用 teamIdString 取得 team 的資料，並且設定到 team state
  // setTeam(teamData);

  // ToDo: (20250113 - Liz) 呼叫 API 利用 invoiceIdString 取得 invoice 的資料，並且設定到 invoice state
  // setInvoice(invoiceData);

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

  // ToDo: (20250113 - Liz) 如果 invoice 資料不存在，顯示錯誤頁面
  if (!invoice) {
    return (
      <Layout
        isDashboard={false}
        pageTitle={t('subscriptions:ERROR.INVOICE_DATA_NOT_FOUND')}
        goBackUrl={ISUNFA_ROUTE.SUBSCRIPTIONS}
      >
        <h1 className="text-red-500">{t('subscriptions:ERROR.INVOICE_DATA_NOT_FOUND')}</h1>
      </Layout>
    );
  }

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
        <InvoicePageBody invoice={invoice} />
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
