import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import NewVoucherForm from '@/components/voucher/new_voucher_form';
import Layout from '@/components/beta/layout/layout';
import { ISUNFA_ROUTE } from '@/constants/url';

const AddNewVoucherPage: React.FC = () => {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    if (router.isReady) {
      const ids = router.query.ids as string;
      if (ids) {
        setSelectedIds(ids.split(',').map((id) => parseInt(id, 10)));
      }
    }
  }, [router.isReady, router.query.ids]);

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('journal:ADD_NEW_VOUCHER.PAGE_TITLE')} - iSunFA</title>
      </Head>

      <Layout
        isDashboard={false}
        pageTitle={t('journal:ADD_NEW_VOUCHER.PAGE_TITLE')}
        goBackUrl={ISUNFA_ROUTE.BETA_VOUCHER_LIST}
      >
        <NewVoucherForm selectedCertificateIds={selectedIds} />
      </Layout>
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
      'asset',
    ])),
    locale,
  },
});

export const getStaticProps = getStaticPropsFunction;

export default AddNewVoucherPage;
