import Head from 'next/head';
import { useTranslation } from "@/i18n/i18n_context";
import EmployeeListPageBody from '@/components/salary_calculator/employee_list_page_body';

export default function EmployeeListPage() {
  const { t } = useTranslation();

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>iSunFA - {t('calculator.employee_list.main_title')}</title>
      </Head>

      <EmployeeListPageBody />
    </>
  );
};
