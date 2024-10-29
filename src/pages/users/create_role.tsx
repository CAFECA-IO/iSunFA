import Head from 'next/head';
import { useState } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import { useTranslation } from 'next-i18next';
import Introduction from '@/components/beta/create_role/introduction';
import RoleCard from '@/components/beta/create_role/role_card';
import PreviewModal from '@/components/beta/create_role/preview_modal';
import { RoleName } from '@/constants/role';

const CreateRolePage = () => {
  const { t } = useTranslation(['common']);
  const [showingRole, setShowingRole] = useState<RoleName | null>(null);
  const [isPreviewModalVisible, setIsPreviewModalVisible] = useState<boolean>(false);

  const togglePreviewModal = () => {
    setIsPreviewModalVisible((prev) => !prev);
  };

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('common:CREATE_ROLE.SELECT_ROLE_ISUNFA')}</title>
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

      <main className="relative h-screen overflow-hidden">
        <div className="h-75%">
          <Introduction showingRole={showingRole} togglePreviewModal={togglePreviewModal} />
        </div>

        <div className="mx-100px mb-40px">
          <RoleCard showingRole={showingRole} setShowingRole={setShowingRole} />
        </div>

        {isPreviewModalVisible && <PreviewModal togglePreviewModal={togglePreviewModal} />}
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

export default CreateRolePage;
