import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import Layout from '@/components/beta/layout/layout';
import VoucherDetailPageBody from '@/components/voucher/voucher_detail_page_body';
import { ISUNFA_ROUTE } from '@/constants/url';

const VoucherDetailPage: React.FC<{ voucherId: string }> = ({ voucherId }) => {
  const { t } = useTranslation('common');
  const router = useRouter(); // Info: (20241225 - Anna) 使用 router 獲取查詢參數
  const [goBackUrl, setGoBackUrl] = useState(ISUNFA_ROUTE.VOUCHER_LIST); // Info: (20241225 - Anna) 預設返回 URL 為傳票清單頁

  useEffect(() => {
    // Info: (20241225 - Anna) 從 router.query 中獲取篩選條件
    const from = router.query.from || '';
    // const startDate = router.query.startDate || null;
    // const endDate = router.query.endDate || null;
    // const startAccountNo = router.query.startAccountNo || null;
    // const endAccountNo = router.query.endAccountNo || null;
    // const labelType = router.query.labelType || null;
    // const pageSize = router.query.pageSize || null;

    // Info: (20241225 - Anna) 檢查 URL 查詢參數是否包含from=ledger
    if (from === 'ledger') {
      //  const ledgerUrl = {
      //    pathname: ISUNFA_ROUTE.LEDGER,
      //    query: { startDate, endDate, startAccountNo, endAccountNo, labelType, pageSize },
      //  };
      setGoBackUrl(ISUNFA_ROUTE.LEDGER);
    }
  }, [router.query]);

  const pageTitle = `${t('journal:VOUCHER_DETAIL_PAGE.TITLE')} ${voucherId}`;

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{pageTitle} - iSunFA</title>
      </Head>

      <Layout isDashboard={false} pageTitle={pageTitle} goBackUrl={goBackUrl}>
        <VoucherDetailPageBody voucherId={voucherId} />
      </Layout>
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async ({ params, locale }) => {
  if (!params || !params.voucherId || typeof params.voucherId !== 'string') {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      voucherId: params.voucherId,
      ...(await serverSideTranslations(locale as string, [
        'layout',
        'common',
        'journal',
        'setting',
        'terms',
        'asset',
        'dashboard',
        'date_picker',
        'certificate',
        'filter_section_type',
        'search',
      ])),
    },
  };
};

export default VoucherDetailPage;
