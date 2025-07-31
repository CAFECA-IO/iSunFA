import React from 'react';
import Head from 'next/head';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import SalaryCalculatorPageBody from '@/components/salary_calculator/salary_calculator_page_body';
import { CalculatorProvider } from '@/contexts/calculator_context';

const SalaryCalculatorPage: React.FC = () => {
  const { t } = useTranslation('calculator');

  return (
    <CalculatorProvider>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>iSunFA - {t('calculator:PAGE.MAIN_TITLE')}</title>
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
