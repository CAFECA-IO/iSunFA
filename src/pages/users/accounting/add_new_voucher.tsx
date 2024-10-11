import React, { useState } from 'react';
import Head from 'next/head';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import NewVoucherForm from '@/components/voucher/new_voucher_form';

// Info: (20241009 - Julian) For layout testing, to be removed
enum SidebarState {
  COLLAPSED = 'collapsed',
  OPEN = 'open',
  EXPANDED = 'expanded',
}

const AddNewVoucherPage: React.FC = () => {
  const { t } = useTranslation('common');

  const [sidebarState, setSidebarState] = useState<SidebarState>(SidebarState.OPEN);

  const isSidebarCollapsed = sidebarState === SidebarState.COLLAPSED;
  const isSidebarOpen = sidebarState === SidebarState.OPEN;
  const isSidebarExpanded = sidebarState === SidebarState.EXPANDED;

  const toggleSidebar = () => {
    if (isSidebarCollapsed) {
      setSidebarState(SidebarState.OPEN);
    } else {
      setSidebarState(SidebarState.COLLAPSED);
    }
  };

  const expandSidebar = () => {
    if (isSidebarOpen) {
      setSidebarState(SidebarState.EXPANDED);
    } else {
      setSidebarState(SidebarState.OPEN);
    }
  };

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('journal:ADD_NEW_VOUCHER.PAGE_TITLE')} - iSunFA</title>
      </Head>

      <button type="button" onClick={toggleSidebar} className="absolute top-0 z-60 bg-rose-300">
        Sidebar Toggle
      </button>

      <div className="fixed z-50 flex">
        <div
          className={`${!isSidebarCollapsed ? 'w-280px' : 'w-0'} flex h-screen flex-col items-center justify-center overflow-hidden bg-surface-neutral-surface-lv2 transition-all duration-300 ease-in-out`}
        >
          This is sidebar
          <button type="button" onClick={expandSidebar} className="bg-teal-500">
            Expand Toggle
          </button>
        </div>
        <div
          className={`flex ${isSidebarExpanded ? 'w-280px' : 'w-0'} h-screen items-center justify-center overflow-hidden bg-gray-400 text-white transition-all duration-300 ease-in-out`}
        >
          Expand Area
        </div>
      </div>
      <div
        className={`${isSidebarExpanded ? 'ml-560px' : isSidebarOpen ? 'ml-280px' : 'ml-0'} bg-text-neutral-secondary p-20px text-center text-white transition-all duration-300 ease-in-out`}
      >
        This is header
      </div>

      {/* Info: (20240925 - Julian) Body */}
      <main
        className={`${isSidebarExpanded ? 'pl-560px' : isSidebarOpen ? 'pl-280px' : 'pl-0'} flex w-screen flex-col overflow-y-auto bg-surface-neutral-main-background font-barlow transition-all duration-300 ease-in-out`}
      >
        <NewVoucherForm />
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

export default AddNewVoucherPage;
