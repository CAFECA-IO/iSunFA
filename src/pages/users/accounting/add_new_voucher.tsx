import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import NewVoucherForm from '@/components/voucher/new_voucher_form';
import Layout from '@/components/beta/layout/layout';
import { ISUNFA_ROUTE } from '@/constants/url';
import { IInvoiceRC2InputOrOutputUI } from '@/interfaces/invoice_rc2';
import { useAccountingCtx } from '@/contexts/accounting_context';
import { useUserCtx } from '@/contexts/user_context';
import { TeamRole } from '@/interfaces/team';

const AddNewVoucherPage: React.FC = () => {
  const { t } = useTranslation('common');
  const { teamRole } = useUserCtx();

  const [selectedCertificates, setSelectedCertificates] = useState<{
    [id: string]: IInvoiceRC2InputOrOutputUI;
  }>({});

  const { clearReverseListHandler } = useAccountingCtx();

  useEffect(() => {
    // Info: (20250305 - Julian) 進入此頁面時，清除 reverseList
    clearReverseListHandler();

    const storedCertificates = localStorage.getItem('selectedCertificates');
    if (storedCertificates) {
      setSelectedCertificates(JSON.parse(storedCertificates));
      localStorage.removeItem('selectedCertificates');
    }
  }, []);

  // Info: (20250319 - Liz) 拒絕團隊角色 viewer 進入此頁面
  if (teamRole === TeamRole.VIEWER) {
    return (
      <div className="flex h-100vh items-center justify-center">
        <div className="text-2xl">{t('common:PERMISSION_ERROR.PERMISSION_DENIED_MESSAGE')}</div>
      </div>
    );
  }

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
      'layout',
      'common',
      'journal',
      'salary',
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
    locale,
  },
});

export const getStaticProps = getStaticPropsFunction;

export default AddNewVoucherPage;
