import React from 'react';
import Head from 'next/head';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import CashFlowStatementPageBody from '@/components/cash_flow_statement_report_body/cash_flow_statement_report_body_new';
import Layout from '@/components/beta/layout/layout';

// const BalanceSheetPage = ({ reportId }: { reportId: string }) => {
// Info: (20241016 - Anna) 改為動態搜尋，不使用reportId
const CashFlowPage = () => {
  const { t } = useTranslation('reports');

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('reports:REPORTS.CASH_FLOW_STATEMENT')} - iSunFA</title>
      </Head>
      <Layout isDashboard={false} pageTitle={t('reports:REPORTS.CASH_FLOW_STATEMENT')}>
        {/* Info: (20241017 - Anna) 拿掉w-screen */}
        <main className="flex flex-col overflow-y-auto bg-surface-neutral-main-background font-barlow transition-all duration-300 ease-in-out">
          <CashFlowStatementPageBody />
        </main>
      </Layout>
    </>
  );
};

const getStaticPropsFunction = async ({ locale }: ILocale) => ({
  props: {
    ...(await serverSideTranslations(locale, [
      'layout',
      'common',
      'dashboard, reports',
      'date_picker',
      'reports',
    ])),
    locale,
  },
});

export const getStaticProps = getStaticPropsFunction;

export default CashFlowPage;
