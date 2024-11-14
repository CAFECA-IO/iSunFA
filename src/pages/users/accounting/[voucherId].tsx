import React from 'react';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import Layout from '@/components/beta/layout/layout';
import VoucherDetailPageBody from '@/components/voucher/voucher_detail_page_body';
import { ISUNFA_ROUTE } from '@/constants/url';

const VoucherDetailPage: React.FC<{ voucherId: string }> = ({ voucherId }) => {
  const { t } = useTranslation('common');

  const pageTitle = `${t('journal:VOUCHER_DETAIL_PAGE.TITLE')} ${voucherId}`;

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{pageTitle} - iSunFA</title>
      </Head>

      <Layout isDashboard={false} pageTitle={pageTitle} goBackUrl={ISUNFA_ROUTE.VOUCHER_LIST}>
        <VoucherDetailPageBody voucherId={voucherId} />
      </Layout>
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async ({ params, locale }) => {
  if (!params || !params.voucherId || typeof params.voucherId !== 'string') {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      voucherId: params.voucherId,
      ...(await serverSideTranslations(locale as string, [
        'common',
        'journal',
        'project',
        'setting',
        'terms',
        'salary',
        'asset',
        'dashboard',
      ])),
    },
  };
};

export default VoucherDetailPage;
