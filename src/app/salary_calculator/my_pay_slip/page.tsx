import Head from 'next/head';
import { useTranslation } from '@/i18n/i18n_context';
import MyPaySlipPageBody from '@/components/salary_calculator/my_pay_slip_page_body';
import { CalculatorProvider } from '@/contexts/calculator_context';

export default function MyPaySlipPage() {
  const { t } = useTranslation();

  return (
    <CalculatorProvider>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>iSunFA - {t('calculator.my_pay_slip.main_title')}</title>
      </Head>

      <MyPaySlipPageBody />
    </CalculatorProvider>
  );
};
