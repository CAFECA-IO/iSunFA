import Head from 'next/head';
import React, { useEffect } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import NavBar from '@/components/nav_bar/nav_bar';
import AccountingSidebar from '@/components/accounting_sidebar/accounting_sidebar';
import AddJournalBody from '@/components/add_journal_body/add_journal_body';
import { useUserCtx } from '@/contexts/user_context';
import { useAccountingCtx } from '@/contexts/accounting_context';
import { SkeletonList } from '@/components/skeleton/skeleton';
import { DEFAULT_SKELETON_COUNT_FOR_PAGE } from '@/constants/display';
import { useTranslation } from 'next-i18next';

const AccountingPage = () => {
  const { t } = useTranslation(['common', 'journal']);
  const { isAuthLoading, selectedCompany } = useUserCtx();
  const { getAccountListHandler } = useAccountingCtx();

  useEffect(() => {
    if (selectedCompany) {
      getAccountListHandler(selectedCompany.id);
    }
  }, [selectedCompany]);

  const displayedBody = isAuthLoading ? (
    <div className="flex h-screen w-full items-center justify-center">
      <SkeletonList count={DEFAULT_SKELETON_COUNT_FOR_PAGE} />
    </div>
  ) : (
    <div className="flex w-full flex-1 flex-col overflow-x-hidden">
      {/* Info: (20240416 - Julian) Sidebar */}
      <AccountingSidebar />

      {/* Info: (20240416 - Julian) Main */}
      <AddJournalBody />
    </div>
  );

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('journal:JOURNAL.ACCOUNTING')} - iSunFA</title>
      </Head>

      <div className="h-screen font-barlow">
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
    ...(await serverSideTranslations(locale, ['common', 'journal', 'filter_section_type'])),
  },
});

export const getStaticProps = getStaticPropsFunction;

export default AccountingPage;
