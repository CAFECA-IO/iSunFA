import React from 'react';
import Head from 'next/head';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import Layout from '@/components/beta/layout/layout';
import PayableReceivableVoucherPageBody from '@/components/voucher/payable_receivable_voucher_body';

const APandARListPage: React.FC = () => {
  const { t } = useTranslation('common');

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('journal:VOUCHER.AP_AND_AR_PAGE_TITLE')} - iSunFA</title>
      </Head>

      <Layout isDashboard={false} pageTitle={t('journal:VOUCHER.AP_AND_AR_PAGE_TITLE')}>
        <PayableReceivableVoucherPageBody />
      </Layout>
    </>
  );
};

const getStaticPropsFunction = async ({ locale }: ILocale) => ({
  props: {
    ...(await serverSideTranslations(locale, [
      'layout',
      'common',
      'journal',
      'dashboard',
      'date_picker',
      'filter_section_type',
    ])),
    locale,
  },
});

export const getStaticProps = getStaticPropsFunction;

export default APandARListPage;
