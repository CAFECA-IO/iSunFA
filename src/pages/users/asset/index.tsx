import React from 'react';
import Head from 'next/head';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import AssetListPageBody from '@/components/asset/asset_list_page_body';
import Layout from '@/components/beta/layout/layout';

const AssetListPage = () => {
  const { t } = useTranslation('common');

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('asset:ASSET.ASSET_LIST_PAGE_TITLE')} - iSunFA</title>
      </Head>

      <Layout isDashboard={false} pageTitle={t('asset:ASSET.ASSET_LIST_PAGE_TITLE')}>
        <AssetListPageBody />
      </Layout>
    </>
  );
};

const getStaticPropsFunction = async ({ locale }: ILocale) => ({
  props: {
    ...(await serverSideTranslations(locale, ['common', 'asset'])),
    locale,
  },
});

export const getStaticProps = getStaticPropsFunction;

export default AssetListPage;
