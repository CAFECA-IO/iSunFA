import React from 'react';
import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { ILocale } from '@/interfaces/locale';
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

const getStaticPropsFunction = async ({ locale }: ILocale) => ({
  props: {
    ...(await serverSideTranslations(locale, [
      'common',
      'journal',
      'kyc',
      'project',
      'report_401',
      'salary',
      'setting',
      'terms',
    ])),
  },
});

export const getStaticProps = getStaticPropsFunction;

export default VoucherDetailPage;
