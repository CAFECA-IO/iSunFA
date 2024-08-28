import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { ILocale } from '@/interfaces/locale';
import NavBar from '@/components/nav_bar/nav_bar';
import SalarySidebar from '@/components/salary_sidebar/salary_sidebar';
import SalaryRecordForm from '@/components/salary_record_form/salary_record_form';
import SalaryStepper from '@/components/salary_stepper/salary_stepper';

const SalaryBookkeepingPage = () => {
  const { t } = useTranslation('common');

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('salary:SALARY.SALARY_ISUNFA')}</title>
      </Head>

      <div className="font-barlow">
        <div className="">
          <NavBar />
        </div>

        {/* Info: (20240715 - Julian) Body */}
        <div>
          {/* Info: (20240715 - Julian) Sidebar */}
          <div className="">
            <SalarySidebar />
          </div>

          <main className="flex min-h-100vh bg-surface-neutral-main-background">
            <div className="mb-100px mt-120px flex-1 px-16px md:mb-60px md:ml-80px md:px-80px">
              <div className="flex w-full flex-col">
                {/* Info: (20240715 - Julian) Title */}
                <div className="flex flex-col gap-16px">
                  <h1 className="text-base font-semibold text-text-neutral-secondary md:text-4xl">
                    Salary Record
                  </h1>
                  <hr className="my-10px bg-divider-stroke-lv-4" />
                </div>
                {/* Info: (20240715 - Julian) Stepper */}
                <div className="mx-auto mt-20px">
                  <SalaryStepper />
                </div>
                <SalaryRecordForm />
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

const getStaticPropsFunction = async ({ locale }: ILocale) => ({
  props: {
    ...(await serverSideTranslations(locale, [
      'common',
      'journal',
      'kyc',
      'project',
      'report_401',
      'salary',
      'setting',
      'terms',
    ])),
  },
});

export const getStaticProps = getStaticPropsFunction;

export default SalaryBookkeepingPage;
