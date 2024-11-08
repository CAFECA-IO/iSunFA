import React from 'react';
import Head from 'next/head';
import { useTranslation } from 'next-i18next';
import CashFlowStatementPageBody from '@/components/cash_flow_statement_report_body/cash_flow_statement_report_body_new';
import Layout from '@/components/beta/layout/layout';

// const BalanceSheetPage = ({ reportId }: { reportId: string }) => {
// Info: (20241016 - Anna) 改為動態搜尋，不使用reportId
const CashFlowPage = () => {
  const { t } = useTranslation('common');

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('common:PLUGIN.CASH_FLOW_STATEMENT')} - iSunFA</title>
      </Head>
      <Layout isDashboard={false} pageTitle={t('common:PLUGIN.CASH_FLOW_STATEMENT')}>
        {/* Info: (20241017 - Anna) 拿掉w-screen */}
        <main className="flex flex-col overflow-y-auto bg-surface-neutral-main-background font-barlow transition-all duration-300 ease-in-out">
          <CashFlowStatementPageBody />
        </main>
      </Layout>
    </>
  );
};

export default CashFlowPage;
