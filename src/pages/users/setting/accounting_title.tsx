import Head from 'next/head';
import React from 'react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import NavBar from '@/components/nav_bar/nav_bar';
import { useUserCtx } from '@/contexts/user_context';
import { SkeletonList } from '@/components/skeleton/skeleton';
import { DEFAULT_SKELETON_COUNT_FOR_PAGE } from '@/constants/display';
import { ILocale } from '@/interfaces/locale';
import SettingSidebar from '@/components/setting_sidebar/setting_sidebar';
import AccountingTitlePageBody from '@/components/accounting_title_page_body/accounting_title_page_body';

const AccountingTitlePage = () => {
  const { t } = useTranslation(['common', 'setting']);
  const { isAuthLoading } = useUserCtx();

  const displayedBody = isAuthLoading ? (
    <div className="flex h-screen w-full items-center justify-center bg-surface-neutral-main-background">
      <SkeletonList count={DEFAULT_SKELETON_COUNT_FOR_PAGE} />
    </div>
  ) : (
    <div className="bg-surface-neutral-main-background">
      <div className="flex w-full flex-1 flex-col overflow-x-hidden">
        <SettingSidebar />
      </div>

      <div className="w-full bg-surface-neutral-main-background px-16px pb-100px pt-120px lg:pb-60px lg:pl-300px lg:pr-40px">
        <AccountingTitlePageBody />
      </div>
    </div>
  );

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('setting:SETTING.COMPANY_SETTING')} - iSunFA</title>
        <meta
          name="description"
          content="iSunFA: Blockchain AI Forensic Accounting and Auditing is where simplicity meets accuracy in the realm of financial investigations."
        />
        <meta name="author" content="CAFECA" />
        <meta name="keywords" content="區塊鏈,人工智慧,會計" />

        <meta property="og:title" content="iSunFA" />
        <meta
          property="og:description"
          content="iSunFA: Blockchain AI Forensic Accounting and Auditing is where simplicity meets accuracy in the realm of financial investigations."
        />
      </Head>

      <div className="h-screen bg-surface-neutral-main-background">
        <div className="">
          <NavBar />
        </div>
        {displayedBody}
      </div>
    </>
  );
};

const getStaticPropsFunction = async ({ locale }: ILocale) => ({
  props: {
    ...(await serverSideTranslations(locale, ['common', 'setting', 'search'])),
  },
});

export const getStaticProps = getStaticPropsFunction;

export default AccountingTitlePage;
