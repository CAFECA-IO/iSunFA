import Head from 'next/head';
import { useState } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import { useTranslation } from 'next-i18next';
import Introduction from '@/components/beta/select_role/introduction';
import RoleCard from '@/components/beta/select_role/role_card';

const SelectRole = () => {
  const { t } = useTranslation(['common', 'kyc']);
  const [role, setRole] = useState<string>('');

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('kyc:SELECT_ROLE.SELECT_ROLE_ISUNFA')}</title>
        <meta
          name="description"
          content="iSunFA: Blockchain AI Forensic Accounting and Auditing is where simplicity meets accuracy in the realm of financial investigations."
        />
        <meta name="author" content="CAFECA" />
        <meta name="keywords" content="區塊鏈,人工智慧,會計" />

        <meta property="og:title" content="iSunFA" />
        <meta
          property="og:description"
          content="iSunFA: Blockchain AI Forensic Accounting and Auditing is where simplicity meets accuracy in the realm of financial investigations."
        />
      </Head>

      <main className="mx-auto flex h-screen w-1280px flex-col justify-center gap-100px overflow-x-hidden">
        <Introduction role={role} />

        <div className="mx-100px mb-40px">
          <RoleCard role={role} setRole={setRole} />
        </div>
      </main>
    </>
  );
};

export const getServerSideProps = async ({ locale }: ILocale) => {
  return {
    props: {
      ...(await serverSideTranslations(locale as string, [
        'common',
        'report_401',
        'journal',
        'kyc',
        'project',
        'setting',
        'terms',
        'salary',
        'asset',
      ])),
    },
  };
};

export default SelectRole;
