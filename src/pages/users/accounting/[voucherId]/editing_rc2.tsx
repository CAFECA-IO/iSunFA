import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Layout from '@/components/beta/layout/layout';
import VoucherEditingPageBody from '@/components/voucher/voucher_editing_page_body_rc2';
import { APIName } from '@/constants/api_connection';
import { IVoucherDetailForFrontend } from '@/interfaces/voucher';
import APIHandler from '@/lib/utils/api_handler';
import { useUserCtx } from '@/contexts/user_context';
import { FREE_ACCOUNT_BOOK_ID } from '@/constants/config';
import { useRouter } from 'next/router';

const VoucherEditingPage: React.FC<{ voucherId: string }> = ({ voucherId }) => {
  const { t } = useTranslation('common');

  const { connectedAccountBook } = useUserCtx();
  const router = useRouter();
  const [voucherNo, setVoucherNo] = useState<string | undefined>();

  const accountBookId = connectedAccountBook?.id ?? FREE_ACCOUNT_BOOK_ID;

  // Info: (20241118 - Julian) 取得 Voucher 資料
  const { trigger: getVoucherData, data: voucherData } = APIHandler<IVoucherDetailForFrontend>(
    APIName.VOUCHER_GET_BY_ID_V2,
    { params: { accountBookId, voucherId } }
  );

  useEffect(() => {
    // Info: (20241121 - Julian) Get voucher data when accountBookId is ready
    if (accountBookId) {
      getVoucherData();
    }
  }, [accountBookId]);

  useEffect(() => {
    if (router.query.voucherNo) {
      setVoucherNo(router.query.voucherNo as string);
    }
  }, [router.query]);

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>
          {t('journal:EDIT_VOUCHER.PAGE_TITLE')} {voucherNo ?? voucherId} - iSunFA
        </title>
      </Head>

      <Layout
        isDashboard={false}
        pageTitle={`${t('journal:EDIT_VOUCHER.PAGE_TITLE')} ${voucherId}`}
        goBackUrl={`/users/accounting/${voucherId}?voucherNo=${voucherNo}`}
      >
        {voucherData ? (
          <VoucherEditingPageBody voucherData={voucherData} voucherNo={voucherNo} />
        ) : (
          <div>Loading...</div>
        )}
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
        'reports',
      ])),
    },
  };
};

export default VoucherEditingPage;
