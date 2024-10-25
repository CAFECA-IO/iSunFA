import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { GetServerSideProps } from 'next';

// import { ILocale } from '@/interfaces/locale';
import { useTranslation } from 'next-i18next';
import Layout from '@/components/beta/layout/layout';
import { ISUNFA_ROUTE } from '@/constants/url';
import FinancialNewsPageBody from '@/components/beta/latest_news_page/financial_news_page_body';

interface FinancialNewsPageProps {
  newsId: string;
}

const FinancialNewsPage = ({ newsId }: FinancialNewsPageProps) => {
  const { t } = useTranslation(['common']);

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('common:LATEST_NEWS_PAGE.FINANCIAL_NEWS')}</title>
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
        pageTitle={t('common:LATEST_NEWS_PAGE.FINANCIAL_NEWS')}
        goBackUrl={ISUNFA_ROUTE.LATEST_NEWS_PAGE}
      >
        <FinancialNewsPageBody newsId={newsId} />
      </Layout>
    </>
  );
};

// export const getServerSideProps = async ({ locale }: ILocale) => {
//   return {
//     props: {
//       ...(await serverSideTranslations(locale as string, [
//         'common',
//         'report_401',
//         'journal',
//         'kyc',
//         'project',
//         'setting',
//         'terms',
//         'salary',
//         'asset',
//       ])),
//     },
//   };
// };

export const getServerSideProps: GetServerSideProps = async ({ params, locale }) => {
  if (!params || !params.newsId || typeof params.newsId !== 'string') {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      newsId: params.newsId,
      ...(await serverSideTranslations(locale as string, [
        'common',
        'report_401',
        'journal',
        'kyc',
        'project',
        'setting',
        'terms',
        'salary',
        'asset',
      ])),
    },
  };
};

export default FinancialNewsPage;
