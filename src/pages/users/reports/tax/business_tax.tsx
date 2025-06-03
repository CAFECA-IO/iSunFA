import React from 'react';
import Head from 'next/head';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import BusinessTaxPageBody from '@/components/tax_report_body_all/business_tax_report_body_new';
import Layout from '@/components/beta/layout/layout';
// import { useUserCtx } from '@/contexts/user_context'; // Deprecated: (20250603 - Liz) 移除檢視者透過 URL 直接進入頁面的權限阻擋
// import { TeamRole } from '@/interfaces/team'; // Deprecated: (20250603 - Liz) 移除檢視者透過 URL 直接進入頁面的權限阻擋

// const BalanceSheetPage = ({ reportId }: { reportId: string }) => {
// Info: (20241016 - Anna) 改為動態搜尋，不使用reportId
const BusinessTaxPage = () => {
  const { t } = useTranslation('reports');

  // Deprecated: (20250603 - Liz) 移除檢視者透過 URL 直接進入頁面的權限阻擋
  // const { teamRole } = useUserCtx();
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
        <title>{t('reports:REPORTS.REPORT_401')} - iSunFA</title>
      </Head>
      <Layout isDashboard={false} pageTitle={t('reports:REPORTS.REPORT_401')}>
        {/* Info: (20241017 - Anna) 拿掉w-screen */}
        <main className="flex flex-col overflow-y-auto bg-surface-neutral-main-background font-barlow transition-all duration-300 ease-in-out">
          <BusinessTaxPageBody />
        </main>
      </Layout>
    </>
  );
};

const getStaticPropsFunction = async ({ locale }: ILocale) => ({
  props: {
    ...(await serverSideTranslations(locale, ['layout', 'date_picker', 'reports'])),
    locale,
  },
});

export const getStaticProps = getStaticPropsFunction;

export default BusinessTaxPage;
