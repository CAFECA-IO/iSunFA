import React, { useState } from 'react';
import Head from 'next/head';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import VoucherListPageBody from '@/components/voucher/voucher_list_page_body';

const VoucherListPage = () => {
  const { t } = useTranslation('common');

  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('journal:VOUCHER.VOUCHER_LIST_PAGE_TITLE')} - iSunFA</title>
      </Head>

      <button
        type="button"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="absolute top-0 bg-rose-300"
      >
        Sidebar Toggle
      </button>

      <div
        className={`${isSidebarOpen ? 'ml-280px' : 'ml-0'} bg-text-neutral-secondary p-20px text-center text-white transition-all duration-300 ease-in-out`}
      >
        This is header
      </div>
      <div
        className={`${isSidebarOpen ? 'w-280px' : 'w-0'} fixed z-50 flex h-screen flex-col items-center justify-center overflow-hidden bg-surface-neutral-surface-lv2 transition-all duration-300 ease-in-out`}
      >
        This is sidebar
      </div>

      {/* Info: (20240920 - Julian) Body */}
      <main
        className={`${isSidebarOpen ? 'pl-280px' : 'pl-0'} flex w-screen flex-col overflow-y-auto bg-surface-neutral-main-background font-barlow transition-all duration-300 ease-in-out`}
      >
        <VoucherListPageBody />
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

export default VoucherListPage;
