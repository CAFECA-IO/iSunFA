import React, { useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/dist/client/link';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { FiPlusCircle } from 'react-icons/fi';
import { ILocale } from '@/interfaces/locale';
import { useUserCtx } from '@/contexts/user_context';
import { useAccountingCtx } from '@/contexts/accounting_context';
import NavBar from '@/components/nav_bar/nav_bar';
import AccountingSidebar from '@/components/accounting_sidebar/accounting_sidebar';
import JournalListBody from '@/components/journal_list_body/journal_list_body';
import { Button } from '@/components/button/button';
import { ISUNFA_ROUTE } from '@/constants/url';
import { DEFAULT_SKELETON_COUNT_FOR_PAGE } from '@/constants/display';
import { SkeletonList } from '@/components/skeleton/skeleton';

const JournalListPage = () => {
  const { t } = useTranslation('common');
  const { selectedCompany, isAuthLoading } = useUserCtx();
  const { getAccountListHandler } = useAccountingCtx();

  useEffect(() => {
    if (selectedCompany && selectedCompany?.id) {
      getAccountListHandler(selectedCompany.id);
    }
  }, [selectedCompany]);

  const companyName = selectedCompany && selectedCompany.name ? `${selectedCompany.name} -` : '';

  const displayedBody = isAuthLoading ? (
    <div className="flex h-screen w-full items-center justify-center">
      <SkeletonList count={DEFAULT_SKELETON_COUNT_FOR_PAGE} />
    </div>
  ) : (
    // {/* Info: (20240419 - Julian) Overview */}
    <div className="flex h-full w-full bg-surface-neutral-main-background">
      <div className="mt-100px flex-1 md:ml-80px">
        <div className="flex min-h-screen w-full flex-col px-16px py-32px font-barlow md:px-40px">
          {/* Info: (20240417 - Julian) Title */}
          <div className="flex flex-col items-center justify-between gap-10px md:flex-row">
            <h1 className="text-base font-semibold text-text-neutral-secondary md:text-4xl">
              {companyName} {t('JOURNAL.JOURNAL_LIST')}
            </h1>
            <Link href={ISUNFA_ROUTE.ACCOUNTING}>
              <Button type="button" variant="tertiary" className="text-sm md:text-base">
                <FiPlusCircle size={24} />
                <p>{t('JOURNAL.ADD_NEW_JOURNAL')}</p>
              </Button>
            </Link>
          </div>

          {/* Info: (20240417 - Julian) Divider */}
          <hr className="my-20px w-full border-lightGray6" />

          <JournalListBody />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('JOURNAL.JOURNAL_LIST_ISUNFA')}</title>
      </Head>

      <div className="h-screen font-barlow">
        <div className="">
          <NavBar />
        </div>

        <div className="flex w-full flex-1 flex-col overflow-x-hidden">
          {/* Info: (20240419 - Julian) Sidebar */}
          <AccountingSidebar />
          {displayedBody}
        </div>
      </div>
    </>
  );
};

const getStaticPropsFunction = async ({ locale }: ILocale) => ({
  props: {
    ...(await serverSideTranslations(locale, ['common'])),
  },
});

export const getStaticProps = getStaticPropsFunction;

export default JournalListPage;
