import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import { useTranslation } from 'next-i18next';
import Layout from '@/components/beta/layout/layout';
import TodoListPageBody from '@/components/beta/todo_list_page/todo_list_page_body';
import StructuredData from '@/components/seo/structured_data';
import { ISUNFA_ROUTE } from '@/constants/url';

const TodoListPage = () => {
  const { t } = useTranslation(['dashboard']);

  const pageName = '待辦清單';
  const pageDesc = '管理您的待辦事項，提升工作效率，確保重要任務不被遺漏。';

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('dashboard:TODO_LIST_PAGE.TODO_LIST_TITLE')}</title>
        <meta name="description" content={pageDesc} />
        <meta name="author" content="CAFECA" />
        <meta name="keywords" content="區塊鏈,人工智慧,會計" />

        <meta property="og:title" content={pageName} />
        <meta property="og:description" content={pageDesc} />

        {/* Info: (20251113 - Julian) Structured Data for SEO */}
        <StructuredData name={pageName} description={pageDesc} />
      </Head>

      <Layout
        isDashboard={false}
        pageTitle={t('dashboard:TODO_LIST_PAGE.TODO_LIST_TITLE')}
        goBackUrl={ISUNFA_ROUTE.DASHBOARD}
      >
        <TodoListPageBody />
      </Layout>
    </>
  );
};

export const getServerSideProps = async ({ locale }: ILocale) => {
  return {
    props: {
      ...(await serverSideTranslations(locale as string, ['layout', 'dashboard', 'date_picker'])),
    },
  };
};

export default TodoListPage;
