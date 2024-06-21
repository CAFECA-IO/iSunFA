import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import NavBar from '@/components/nav_bar/nav_bar';
import AccountingSidebar from '@/components/accounting_sidebar/accounting_sidebar';
import AddJournalBody from '@/components/add_journal_body/add_journal_body';

const AccountingPage = () => {
  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        {/* TODO: (20240416 - Julian) i18n */}
        <title>Accounting - iSunFA</title>
      </Head>

      <div className="h-screen font-barlow">
        <div className="">
          <NavBar />
        </div>

        <div className="flex w-full flex-1 flex-col overflow-x-hidden">
          {/* Info: (20240416 - Julian) Sidebar */}
          <AccountingSidebar />

          {/* Info: (20240416 - Julian) Main */}
          <AddJournalBody />
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

export default AccountingPage;
