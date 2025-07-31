import React from 'react';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import Layout from '@/components/beta/layout/layout';
import AssetDetailPageBody from '@/components/asset/asset_detail_page_body';
import { ISUNFA_ROUTE } from '@/constants/url';

const AssetDetailPage: React.FC<{ assetId: string }> = ({ assetId }) => {
  const { t } = useTranslation('asset');

  const pageTitle = `${t('asset:ASSET_DETAIL_PAGE.TITLE')} ${assetId}`;

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{pageTitle} - iSunFA</title>
      </Head>

      <Layout isDashboard={false} pageTitle={pageTitle} goBackUrl={ISUNFA_ROUTE.ASSET_LIST}>
        <AssetDetailPageBody assetId={assetId} />
      </Layout>
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async ({ params, locale }) => {
  if (!params || !params.assetId || typeof params.assetId !== 'string') {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      assetId: params.assetId,
      ...(await serverSideTranslations(locale as string, [
        'layout',
        'common',
        'journal',
        'project',
        'settings',
        'terms',
        'asset',
        'dashboard',
        'filter_section_type',
      ])),
    },
  };
};

export default AssetDetailPage;
