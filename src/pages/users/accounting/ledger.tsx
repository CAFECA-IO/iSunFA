import React from 'react';
import Head from 'next/head';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import LedgerPageBody from '@/components/ledger/ledger_page_body';
import Layout from '@/components/beta/layout/layout';

const LedgerPage = () => {
  const { t } = useTranslation('common');

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('journal:VOUCHER.LEDGER')} - iSunFA</title>
      </Head>

      {/* Info: (20241017 - Anna) Body */}
      <Layout isDashboard={false} pageTitle={t('journal:VOUCHER.LEDGER')}>
        {/* Info: (20241017 - Anna) 拿掉w-screen */}
        <main className="flex flex-col overflow-y-auto bg-surface-neutral-main-background font-barlow transition-all duration-300 ease-in-out">
          <LedgerPageBody />
        </main>
      </Layout>
    </>
  );
};

const getStaticPropsFunction = async ({ locale }: ILocale) => ({
  props: {
    ...(await serverSideTranslations(locale, ['common', 'journal', 'filter_section_type'])),
    locale,
  },
});

export const getStaticProps = getStaticPropsFunction;

export default LedgerPage;
