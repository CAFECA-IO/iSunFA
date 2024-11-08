import React from 'react';
import Head from 'next/head';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import CounterpartyPageBody from '@/components/counterparty/counterparty_page_body';
import Layout from '@/components/beta/layout/layout';

const CounterpartyPage = () => {
  const { t } = useTranslation(['common', 'setting', 'certificate']);

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('setting:NORMAL.CLIENT_SUPPLIER_SETTING')} - iSunFA</title>
      </Head>

      {/* Info: (20241017 - Anna) Body */}
      <Layout isDashboard={false} pageTitle={t('setting:NORMAL.CLIENT_SUPPLIER_SETTING')}>
        {/* Info: (20241017 - Anna) 拿掉w-screen */}
        <main className="flex flex-col overflow-y-auto bg-surface-neutral-main-background font-barlow transition-all duration-300 ease-in-out">
          <CounterpartyPageBody />
        </main>
      </Layout>
    </>
  );
};

const getStaticPropsFunction = async ({ locale }: ILocale) => ({
  props: {
    ...(await serverSideTranslations(locale, ['setting', 'certificate'])),
    locale,
  },
});

export const getStaticProps = getStaticPropsFunction;

export default CounterpartyPage;
