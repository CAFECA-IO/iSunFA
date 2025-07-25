import React from 'react';
import Head from 'next/head';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import MyPaySlipPageBody from '@/components/salary_calculator/my_pay_slip_page_body';
import { CalculatorProvider } from '@/contexts/calculator_context';

const MyPaySlipPage: React.FC = () => {
  const { t } = useTranslation('calculator');

  return (
    <CalculatorProvider>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>iSunFA - {t('calculator:MY_PAY_SLIP.MAIN_TITLE')}</title>
      </Head>

      <MyPaySlipPageBody />
    </CalculatorProvider>
  );
};

const getStaticPropsFunction = async ({ locale }: ILocale) => ({
  props: {
    ...(await serverSideTranslations(locale, ['common', 'calculator', 'date_picker'])),
  },
});

export const getStaticProps = getStaticPropsFunction;

export default MyPaySlipPage;
