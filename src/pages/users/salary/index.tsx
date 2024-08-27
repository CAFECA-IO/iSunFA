import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import NavBar from '@/components/nav_bar/nav_bar';
import { useUserCtx } from '@/contexts/user_context';
import { useTranslation } from 'next-i18next';
import SalaryPageBody from '@/components/salary/salary_page_body';

const SalaryHomePage = () => {
  const { t } = useTranslation('common');
  const { isAuthLoading } = useUserCtx();

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('salary:SALARY.SALARY_ISUNFA')}</title>
      </Head>

      <div className="font-barlow">
        <NavBar />

        <SalaryPageBody isAuthLoading={isAuthLoading} />
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

export default SalaryHomePage;
