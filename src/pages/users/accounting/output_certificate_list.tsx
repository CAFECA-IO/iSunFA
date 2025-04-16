import React from 'react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import Head from 'next/head';
import OutputCertificateListBody from '@/components/certificate/output_certificate_list_body';
import Layout from '@/components/beta/layout/layout';

const CertificateListPage: React.FC = () => {
  const { t } = useTranslation('certificate');

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('certificate:TITLE.LIST')} - iSunFA</title>
      </Head>

      <Layout
        isDashboard={false}
        pageTitle={t('certificate:OUTPUT_CERTIFICATE.OUTPUT_CERTIFICATE')}
      >
        <OutputCertificateListBody />
      </Layout>
    </>
  );
};

export const getServerSideProps = async ({ locale }: ILocale) => {
  return {
    props: {
      ...(await serverSideTranslations(locale as string, [
        'layout',
        'common',
        'certificate',
        'filter_section_type',
        'date_picker',
        'search',
        'dashboard',
      ])),
    },
  };
};

export default CertificateListPage;
