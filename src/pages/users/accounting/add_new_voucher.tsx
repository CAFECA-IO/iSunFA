import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import NewVoucherFormRC2 from '@/components/voucher/new_voucher_form_rc2';
import Layout from '@/components/beta/layout/layout';
import { ISUNFA_ROUTE } from '@/constants/url';
import { useAccountingCtx } from '@/contexts/accounting_context';
import { IInvoiceRC2UI } from '@/interfaces/invoice_rc2';
// import { useUserCtx } from '@/contexts/user_context'; // Deprecated: (20250603 - Liz) 移除檢視者透過 URL 直接進入頁面的權限阻擋
// import { TeamRole } from '@/interfaces/team'; // Deprecated: (20250603 - Liz) 移除檢視者透過 URL 直接進入頁面的權限阻擋

const AddNewVoucherRC2Page: React.FC = () => {
  const { t } = useTranslation('common');
  // const { teamRole } = useUserCtx();

  const [selectedInvoices, setSelectedInvoices] = useState<{
    [id: string]: IInvoiceRC2UI;
  }>({});

  const { clearReverseListHandler } = useAccountingCtx();

  useEffect(() => {
    // Info: (20250305 - Julian) 進入此頁面時，清除 reverseList
    clearReverseListHandler();

    const storedInvoices = localStorage.getItem('selectedInvoices');
    if (storedInvoices) {
      setSelectedInvoices(JSON.parse(storedInvoices));
      localStorage.removeItem('selectedInvoices');
    }
  }, []);

  // Deprecated: (20250603 - Liz) 移除檢視者透過 URL 直接進入頁面的權限阻擋
  // Info: (20250319 - Liz) 拒絕團隊角色 viewer 進入此頁面
  // if (teamRole === TeamRole.VIEWER) {
  //   return (
  //     <div className="flex h-100vh items-center justify-center">
  //       <div className="text-2xl">{t('common:PERMISSION_ERROR.PERMISSION_DENIED_MESSAGE')}</div>
  //     </div>
  //   );
  // }

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
        <NewVoucherFormRC2 selectedData={selectedInvoices} />
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

export default AddNewVoucherRC2Page;
