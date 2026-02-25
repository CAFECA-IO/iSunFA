import Head from 'next/head';
import { useTranslation } from '@/i18n/i18n_context';
import OperatingMechanismPageBody from '@/components/salary_calculator/operating_mechanism_page_body';
import { CalculatorProvider } from '@/contexts/calculator_context';

export default function OperatingMechanismPage() {
  const { t } = useTranslation();

  return (
    <CalculatorProvider>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>iSunFA - {t('calculator.operating_mechanism.main_title')}</title>
      </Head>

      <OperatingMechanismPageBody />
    </CalculatorProvider>
  );
};
