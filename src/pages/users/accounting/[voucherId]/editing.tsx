import React, { useEffect } from 'react';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Layout from '@/components/beta/layout/layout';
import VoucherEditingPageBody from '@/components/voucher/voucher_editing_page_body';
import { APIName } from '@/constants/api_connection';
import { IVoucherDetailForFrontend } from '@/interfaces/voucher';
import APIHandler from '@/lib/utils/api_handler';
import { useUserCtx } from '@/contexts/user_context';
import { FREE_COMPANY_ID } from '@/constants/config';

const VoucherEditingPage: React.FC<{ voucherId: string; isVoucherNo: boolean }> = ({
  voucherId,
  isVoucherNo,
}) => {
  const { t } = useTranslation('common');

  const { selectedCompany } = useUserCtx();

  const companyId = selectedCompany?.id ?? FREE_COMPANY_ID;

  // Info: (20241118 - Julian) 取得 Voucher 資料
  const { trigger: getVoucherData, data: voucherData } = APIHandler<IVoucherDetailForFrontend>(
    APIName.VOUCHER_GET_BY_ID_V2,
    { params: { companyId, voucherId }, query: { isVoucherNo } }
  );

  useEffect(() => {
    // Info: (20241121 - Julian) Get voucher data when companyId is ready
    if (companyId) {
      getVoucherData();
    }
  }, [companyId]);

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>
          {t('journal:EDIT_VOUCHER.PAGE_TITLE')} {voucherId} - iSunFA
        </title>
      </Head>

      <Layout
        isDashboard={false}
        pageTitle={`${t('journal:EDIT_VOUCHER.PAGE_TITLE')} ${voucherId}`}
        goBackUrl={`/users/accounting/${voucherId}`}
      >
        {voucherData ? <VoucherEditingPageBody voucherData={voucherData} /> : <div>Loading...</div>}
      </Layout>
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async ({ params, query, locale }) => {
  if (!params || !params.voucherId || typeof params.voucherId !== 'string') {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      voucherId: params.voucherId,
      isVoucherNo: query?.isVoucherNo === 'true',
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

export default VoucherEditingPage;
