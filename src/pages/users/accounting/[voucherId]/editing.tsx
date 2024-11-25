import React from 'react';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Layout from '@/components/beta/layout/layout';
import VoucherEditingPageBody from '@/components/voucher/voucher_editing_page_body';

const VoucherEditingPage: React.FC<{ voucherId: string }> = ({ voucherId }) => {
  const { t } = useTranslation('common');

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>
          {t('journal:EDIT_VOUCHER.PAGE_TITLE')} {voucherId} - iSunFA
        </title>
      </Head>

      <Layout
        isDashboard={false}
        pageTitle={`${t('journal:EDIT_VOUCHER.PAGE_TITLE')} ${voucherId}`}
        goBackUrl={`/users/accounting/${voucherId}`}
      >
        <VoucherEditingPageBody voucherId={voucherId} />
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
        'layout',
        'common',
        'journal',
        'setting',
        'terms',
        'asset',
        'dashboard',
        'date_picker',
        'filter_section_type',
      ])),
    },
  };
};

export default VoucherEditingPage;
