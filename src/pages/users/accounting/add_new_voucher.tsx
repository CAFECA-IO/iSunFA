import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import NewVoucherForm from '@/components/voucher/new_voucher_form';
import Layout from '@/components/beta/layout/layout';
import { ISUNFA_ROUTE } from '@/constants/url';
import { ICertificateUI } from '@/interfaces/certificate';

const AddNewVoucherPage: React.FC = () => {
  const { t } = useTranslation('common');
  const [selectedCertificates, setSelectedCertificates] = useState<{
    [id: string]: ICertificateUI;
  }>({});

  useEffect(() => {
    const storedCertificates = localStorage.getItem('selectedCertificates');
    if (storedCertificates) {
      setSelectedCertificates(JSON.parse(storedCertificates));
      localStorage.removeItem('selectedCertificates');
    }
  }, []);

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
        <NewVoucherForm selectedData={selectedCertificates} />
      </Layout>
    </>
  );
};

const getStaticPropsFunction = async ({ locale }: ILocale) => ({
  props: {
    ...(await serverSideTranslations(locale, [
      'common',
      'certificate',
      'journal',
      'salary',
      'setting',
      'terms',
      'asset',
      'dashboard',
    ])),
    locale,
  },
});

export const getStaticProps = getStaticPropsFunction;

export default AddNewVoucherPage;
