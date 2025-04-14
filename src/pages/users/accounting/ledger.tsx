import React from 'react';
import Head from 'next/head';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import LedgerPageBody from '@/components/ledger/ledger_page_body_new';
import Layout from '@/components/beta/layout/layout';
import { useUserCtx } from '@/contexts/user_context';
import { TeamRole } from '@/interfaces/team';

const LedgerPage = () => {
  const { t } = useTranslation('journal');
  const { teamRole } = useUserCtx();

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
        <title>{t('journal:VOUCHER.LEDGER')} - iSunFA</title>
      </Head>

      {/* Info: (20241017 - Anna) Body */}
      <Layout isDashboard={false} pageTitle={t('journal:VOUCHER.LEDGER')}>
        {/* Info: (20241017 - Anna) 拿掉w-screen */}
        <main className="flex flex-col overflow-y-auto bg-surface-neutral-main-background font-barlow transition-all duration-300 ease-in-out">
          <LedgerPageBody />
        </main>
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
      'filter_section_type',
      'search',
      'date_picker',
      'reports',
    ])),
    locale,
  },
});

export const getStaticProps = getStaticPropsFunction;

export default LedgerPage;
