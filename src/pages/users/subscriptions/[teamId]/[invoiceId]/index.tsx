import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import { useTranslation } from 'next-i18next';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/beta/layout/layout';
import InvoicePageBody from '@/components/beta/invoice_page/invoice_page_body';
import { IUserOwnedTeam, TPlanType, ITeamInvoice } from '@/interfaces/subscription';
import { ISUNFA_ROUTE } from '@/constants/url';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { SkeletonList } from '@/components/skeleton/skeleton';

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

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [team, setTeam] = useState<IUserOwnedTeam | null>(null);

  // Deprecated: (20250115 - Liz) remove eslint-disable
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [invoice, setInvoice] = useState<ITeamInvoice | null>(FAKE_INVOICE_DATA);

  // Info: (20250117 - Liz) 取得團隊資料 API
  const { trigger: getTeamDataAPI } = APIHandler<IUserOwnedTeam>(APIName.GET_TEAM_BY_ID);

  useEffect(() => {
    // Info: (20250117 - Liz) 打 API 取得團隊資料
    const getTeamData = async () => {
      if (!teamIdString) return;
      setIsLoading(true);

      try {
        const { data: teamData, success } = await getTeamDataAPI({
          params: { teamId: teamIdString },
        });

        // Deprecated: (20250117 - Liz)
        // eslint-disable-next-line no-console
        console.log('teamData:', teamData);

        if (success && teamData) {
          setTeam(teamData);
        }
      } catch (error) {
        // Deprecated: (20250117 - Liz)
        // eslint-disable-next-line no-console
        console.log('取得團隊資料失敗');
      } finally {
        setIsLoading(false);
      }
    };

    getTeamData();
  }, [teamIdString]);

  // ToDo: (20250113 - Liz) 呼叫 API 利用 invoiceIdString 取得 invoice 的資料，並且設定到 invoice state
  // setInvoice(invoiceData);

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

  // Info: (20250113 - Liz) 如果 invoice 資料不存在，顯示錯誤頁面
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
      ...(await serverSideTranslations(locale as string, [
        'layout',
        'dashboard',
        'subscriptions',
        'common',
      ])),
    },
  };
};

export default InvoicePage;
