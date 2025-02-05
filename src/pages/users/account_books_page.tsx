import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import { useTranslation } from 'next-i18next';
import Layout from '@/components/beta/layout/layout';
import AccountBooksPageBody from '@/components/beta/account_books_page/account_books_page_body';
import { ISUNFA_ROUTE } from '@/constants/url';

const AccountBooksPage = () => {
  const { t } = useTranslation(['dashboard']);

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('dashboard:ACCOUNT_BOOKS_PAGE.PAGE_TITLE')}</title>
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

      <Layout
        isDashboard={false}
        pageTitle={t('dashboard:ACCOUNT_BOOKS_PAGE.PAGE_TITLE')}
        goBackUrl={ISUNFA_ROUTE.DASHBOARD}
      >
        <AccountBooksPageBody />
      </Layout>
    </>
  );
};

export const getServerSideProps = async ({ locale }: ILocale) => {
  return {
    props: {
      ...(await serverSideTranslations(locale as string, [
        'layout',
        'dashboard',
        'company',
        'search',
        'common',
      ])),
    },
  };
};

export default AccountBooksPage;
