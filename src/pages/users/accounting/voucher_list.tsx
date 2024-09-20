import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import VoucherPageBody from '@/components/voucher/voucher_page_body';

const VoucherListPage = () => {
  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>Voucher List - iSunFA</title>
      </Head>

      <div className="ml-280px w-full bg-text-neutral-secondary p-20px text-center text-white">
        This is header
      </div>

      <div className="fixed flex h-screen w-280px flex-col items-center justify-center bg-surface-neutral-surface-lv2">
        This is sidebar
      </div>

      {/* Info: (20240920 - Julian) Body */}
      <main className="flex w-screen flex-col overflow-y-auto bg-surface-neutral-main-background pl-280px font-barlow">
        <VoucherPageBody />
      </main>
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
    locale,
  },
});

export const getStaticProps = getStaticPropsFunction;

export default VoucherListPage;
