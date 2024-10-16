import React from 'react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import Head from 'next/head';
import SideMenu from '@/components/upload_certificate/side_menu';
import Header from '@/components/upload_certificate/header';
import CertificateListBody from '@/components/certificate/certificate_list_body';
// import Layout from '@/components/beta/layout/layout';// ToDo: (20241017 - tzuhan)

const CertificateListPage: React.FC = () => {
  const { t } = useTranslation('certificate');

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('certificate:LIST.TITLE')} - iSunFA</title>
      </Head>
      <div className="flex h-screen">
        {/* Info: (20240919 - tzuhan) Side Menu */}
        <SideMenu />

        {/* Info: (20240919 - tzuhan) Main Content Area */}
        <div className="flex flex-auto flex-col gap-40px overflow-hidden bg-surface-neutral-main-background px-56px py-32px">
          {/* Info: (20240919 - tzuhan) Header */}
          <Header title={t('certificate:LIST.TITLE')} />

          {/* ToDo: (20241017 - tzuhan) <Layout> */}
          <CertificateListBody />
          {/* ToDo: (20241017 - tzuhan) </Layout> */}
        </div>
      </div>
    </>
  );
};

export const getServerSideProps = async ({ locale }: ILocale) => {
  return {
    props: {
      ...(await serverSideTranslations(locale as string, [
        'common',
        'report_401',
        'journal',
        'kyc',
        'project',
        'setting',
        'terms',
        'salary',
        'asset',
        'certificate',
      ])),
    },
  };
};

export default CertificateListPage;
