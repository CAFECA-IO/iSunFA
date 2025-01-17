import { useState, useEffect } from 'react';
import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import Layout from '@/components/beta/layout/layout';
import InvoicePageBody from '@/components/beta/invoice_page/invoice_page_body';
import { IUserOwnedTeam, ITeamInvoice } from '@/interfaces/subscription';
import { ILocale } from '@/interfaces/locale';
import { ISUNFA_ROUTE } from '@/constants/url';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { SkeletonList } from '@/components/skeleton/skeleton';

const InvoicePage = () => {
  const { t } = useTranslation(['subscriptions']);
  const router = useRouter();
  const { teamId, invoiceId } = router.query;
  const teamIdString = teamId ? (Array.isArray(teamId) ? teamId[0] : teamId) : '';
  const invoiceIdString = invoiceId ? (Array.isArray(invoiceId) ? invoiceId[0] : invoiceId) : '';

  const {
    trigger: getTeamById,
    data: teamData,
    error: teamError,
    isLoading: isTeamLoading,
  } = APIHandler<IUserOwnedTeam>(APIName.GET_TEAM_BY_ID);

  const {
    trigger: getInvoiceById,
    data: invoiceData,
    isLoading: isInvoiceLoading,
  } = APIHandler<ITeamInvoice>(APIName.GET_TEAM_INVOICE_BY_ID);

  const [team, setTeam] = useState<IUserOwnedTeam | null>();
  const [invoice, setInvoice] = useState<ITeamInvoice | null>();

  // Info: (20250117 - Julian) 取得 team 和 invoice 的資料
  useEffect(() => {
    if (teamIdString && invoiceIdString) {
      getTeamById({ params: { teamId: teamIdString } });
      getInvoiceById({ params: { teamId: teamIdString, invoiceId: invoiceIdString } });
    }
  }, [teamIdString, invoiceIdString]);

  // Info: (20250117 - Julian) 呼叫 API 利用 teamIdString 取得 team 的資料，並且設定到 team state
  useEffect(() => {
    if (teamData) setTeam(teamData);
  }, [teamData]);

  // Info: (20250117 - Julian) 呼叫 API 利用 invoiceIdString 取得 invoice 的資料，並且設定到 invoice state
  useEffect(() => {
    if (invoiceData) setInvoice(invoiceData);
  }, [invoiceData]);

  // ToDo: (20250113 - Liz) 如果 team 資料不存在，顯示錯誤頁面
  if (!team && teamError) {
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

  // Info: (20250117 - Julian) 顯示頁面內容
  const isShowPageBody =
    !isTeamLoading && !isInvoiceLoading && invoice ? (
      <InvoicePageBody invoice={invoice} />
    ) : (
      <SkeletonList count={5} />
    );

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
        {isShowPageBody}
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
