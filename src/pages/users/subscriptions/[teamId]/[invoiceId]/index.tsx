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
import loggerFront from '@/lib/utils/logger_front';

const InvoicePage = () => {
  const { t } = useTranslation(['subscriptions']);
  const router = useRouter();
  const { teamId, invoiceId } = router.query;
  const teamIdString = teamId ? (Array.isArray(teamId) ? teamId[0] : teamId) : '';
  const invoiceIdString = invoiceId ? (Array.isArray(invoiceId) ? invoiceId[0] : invoiceId) : '';
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [team, setTeam] = useState<IUserOwnedTeam | null>(null);
  const [invoice, setInvoice] = useState<ITeamInvoice | null>(null);

  // Info: (20250117 - Liz) 取得使用者擁有的團隊資料 API (user is the owner of the team)
  const { trigger: getOwnedTeamAPI } = APIHandler<IUserOwnedTeam>(
    APIName.GET_SUBSCRIPTION_BY_TEAM_ID
  );
  // Info: (20250117 - Julian) 取得發票資料 API
  const { trigger: getInvoiceDataAPI } = APIHandler<ITeamInvoice>(
    APIName.GET_SUBSCRIPTION_INVOICE_BY_TEAM_ID
  );

  useEffect(() => {
    // Info: (20250117 - Liz) 打 API 取得使用者擁有的團隊資料
    const getOwnedTeam = async () => {
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
    };

    // Info: (20250117 - Julian) 打 API 取得發票資料
    const getInvoiceData = async () => {
      if (!invoiceIdString) return;
      setIsLoading(true);

      try {
        const { data: invoiceData, success } = await getInvoiceDataAPI({
          params: { teamId: teamIdString, invoiceId: invoiceIdString },
        });

        loggerFront.log('invoiceData:', invoiceData);

        if (success && invoiceData) {
          setInvoice(invoiceData);
        }
      } catch (error) {
        loggerFront.error('取得發票資料失敗');
        loggerFront.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    getOwnedTeam();
    getInvoiceData();
  }, [teamIdString, invoiceIdString]);

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
