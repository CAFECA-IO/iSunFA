'use client';

import Head from 'next/head';
import { useTranslation } from "@/i18n/i18n_context";
import SalaryCalculatorPageBody from '@/components/salary_calculator/salary_calculator_page_body';
import { CalculatorProvider } from '@/contexts/calculator_context';

export default function SalaryCalculatorPage() {
  const { t } = useTranslation();

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
        <title>iSunFA - {t('calculator.header.main_title')}</title>
      </Head>

      <SalaryCalculatorPageBody />
    </CalculatorProvider>
  );
};
