import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import Layout from '@/components/beta/layout/layout';
import VoucherDetailPageBody from '@/components/voucher/voucher_detail_page_body';
import { ISUNFA_ROUTE } from '@/constants/url';
import { FromWhere } from '@/interfaces/voucher';

const VoucherDetailPage: React.FC<{ voucherId: string }> = ({ voucherId }) => {
  const { t } = useTranslation('common');
  const router = useRouter(); // Info: (20241225 - Anna) 使用 router 獲取查詢參數
  const [goBackUrl, setGoBackUrl] = useState(ISUNFA_ROUTE.VOUCHER_LIST); // Info: (20241225 - Anna) 預設返回 URL 為傳票清單頁
  const [voucherNo, setVoucherNo] = useState<string | undefined>();

  useEffect(() => {
    // Info: (20241225 - Anna) 從 router.query 中獲取篩選條件
    const {
      from = '',
      startDate = '',
      endDate = '',
      labelType = '',
      startAccountNo = '',
      endAccountNo = '',
    } = router.query;

    setVoucherNo(router.query.voucherNo as string);

    // Info: (20241225 - Anna) 檢查 URL 查詢參數是否包含from=ledger
    if (from === FromWhere.LEDGER) {
      const queryString = new URLSearchParams({
        startDate: String(startDate),
        endDate: String(endDate),
        labelType: String(labelType),
        startAccountNo: String(startAccountNo),
        endAccountNo: String(endAccountNo),
      }).toString();
      setGoBackUrl(`${ISUNFA_ROUTE.LEDGER}?${queryString}`);
    }

    // Info: (20250324 - Anna) 檢查 URL 查詢參數是否包含voucher_item
    if (from === FromWhere.VOUCHER_ITEM) {
      const queryString = new URLSearchParams({
        startDate: String(startDate),
        endDate: String(endDate),
        type: String(router.query.type ?? ''),
        keyword: String(router.query.keyword ?? ''),
        page: String(router.query.page ?? '1'),
      }).toString();
      setGoBackUrl(`${ISUNFA_ROUTE.VOUCHER_LIST}?${queryString}`);
    }

    // Info: (20250124 - Julian) 檢查 URL 查詢參數是否包含from=ARandAP
    if (from === FromWhere.ARandAP) {
      setGoBackUrl(`${ISUNFA_ROUTE.PAYABLE_RECEIVABLE_LIST}`);
    }
  }, [router.query]);

  const pageTitle = `${t('journal:VOUCHER_DETAIL_PAGE.TITLE')} ${voucherNo ?? voucherId}`;

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{pageTitle} - iSunFA</title>
      </Head>

      <Layout isDashboard={false} pageTitle={pageTitle} goBackUrl={goBackUrl}>
        <VoucherDetailPageBody voucherId={voucherId} voucherNo={voucherNo} goBackUrl={goBackUrl} />
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
        'settings',
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
