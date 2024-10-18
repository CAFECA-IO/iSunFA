import React from 'react';
import Head from 'next/head';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import APandARPageBody from '@/components/voucher/ap_and_ar_page_body';

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

      <div className="ml-280px bg-text-neutral-secondary p-20px text-center text-white">
        This is header
      </div>

      <div className="fixed flex h-screen w-280px flex-col items-center justify-center bg-surface-neutral-surface-lv2">
        This is sidebar
      </div>

      {/* Info: (20240924 - Julian) Body */}
      <main className="flex w-screen flex-col overflow-y-auto bg-surface-neutral-main-background pl-280px font-barlow">
        <APandARPageBody />
      </main>
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
      'asset',
    ])),
    locale,
  },
});

export const getStaticProps = getStaticPropsFunction;

export default APandARListPage;
