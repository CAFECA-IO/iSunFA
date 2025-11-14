import React from 'react';
import Head from 'next/head';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import SalaryCalculatorPageBody from '@/components/salary_calculator/salary_calculator_page_body';
import StructuredData from '@/components/seo/structured_data';
import { CalculatorProvider } from '@/contexts/calculator_context';

const SalaryCalculatorPage: React.FC = () => {
  const { t } = useTranslation('calculator');

  const pageName = '薪資計算機';
  const pageDesc =
    '快速計算每月薪資、代扣所得稅、勞保、就保、職保、勞退、健保、二代健保補充保費及加班費。適用於全職、兼職與時薪工作者，還能生成薪資條。';

  return (
    <CalculatorProvider>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta content={pageName} property="og:title" />
        <meta content={pageDesc} property="og:description" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>iSunFA - {t('calculator:PAGE.MAIN_TITLE')}</title>

        {/* Info: (20251113 - Julian) Structured Data for SEO */}
        <StructuredData name={pageName} description={pageDesc} />
      </Head>

      <SalaryCalculatorPageBody />
    </CalculatorProvider>
  );
};

const getStaticPropsFunction = async ({ locale }: ILocale) => ({
  props: {
    ...(await serverSideTranslations(locale, ['common', 'calculator', 'date_picker'])),
  },
});

export const getStaticProps = getStaticPropsFunction;

export default SalaryCalculatorPage;
