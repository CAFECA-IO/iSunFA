import Head from 'next/head';
import { useState, useEffect } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import { useTranslation } from 'next-i18next';
import Introduction from '@/components/beta/create_role/introduction';
import RoleCard from '@/components/beta/create_role/role_card';
import PreviewModal from '@/components/beta/create_role/preview_modal';
import { useUserCtx } from '@/contexts/user_context';
import { IRole } from '@/interfaces/role';
import { IUserRole } from '@/interfaces/user_role';

const findUniqueRolesOptimized = (systemRoles: IRole[], userRoles: IUserRole[]): IRole[] => {
  const userRoleList = userRoles.map((userRole) => userRole.role);

  const systemRoleIds = new Set(systemRoles.map((role) => role.id));
  const userRoleIds = new Set(userRoleList.map((role) => role.id));

  const uniqueInSystemRoles = systemRoles.filter((role) => !userRoleIds.has(role.id));
  const uniqueInUserRoles = userRoleList.filter((role) => !systemRoleIds.has(role.id));

  return [...uniqueInSystemRoles, ...uniqueInUserRoles];
};

const CreateRolePage = () => {
  const { t } = useTranslation(['dashboard']);
  const { getSystemRoleList, getUserRoleList } = useUserCtx();
  // Info: (20241108 - Liz) 畫面顯示的角色
  const [showingRole, setShowingRole] = useState<string>('');
  // Info: (20241108 - Liz) 使用者選擇的角色 ID
  const [selectedRoleId, setSelectedRoleId] = useState<number>(0);

  const [isPreviewModalVisible, setIsPreviewModalVisible] = useState<boolean>(false);

  const togglePreviewModal = () => {
    setIsPreviewModalVisible((prev) => !prev);
  };

  const [uniqueRoles, setUniqueRoles] = useState<IRole[]>([]);

  useEffect(() => {
    const fetchAndComputeRoles = async () => {
      try {
        const systemRoles = await getSystemRoleList();
        const userRoles = await getUserRoleList();

        // Deprecated: (20241108 - Liz)
        // eslint-disable-next-line no-console
        console.log('systemRoles:', systemRoles, 'userRoles:', userRoles);

        if (systemRoles && userRoles) {
          const unique = findUniqueRolesOptimized(systemRoles, userRoles);
          setUniqueRoles(unique);

          // Deprecated: (20241108 - Liz)
          // eslint-disable-next-line no-console
          console.log('unique:', unique);
        }
      } catch (error) {
        // Deprecated: (20241108 - Liz)
        // eslint-disable-next-line no-console
        console.log('Failed to fetch or compute roles:', error);
      }
    };

    fetchAndComputeRoles();
  }, [getSystemRoleList, getUserRoleList]);

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('dashboard:CREATE_ROLE_PAGE.CREATE_ROLE_TITLE')} - iSunFA</title>
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
          <Introduction
            showingRole={showingRole}
            selectedRoleId={selectedRoleId}
            togglePreviewModal={togglePreviewModal}
          />
        </div>

        <div className="mx-100px mb-40px">
          <RoleCard
            roleList={uniqueRoles}
            showingRole={showingRole}
            setShowingRole={setShowingRole}
            setSelectedRoleId={setSelectedRoleId}
          />
        </div>

        {isPreviewModalVisible && <PreviewModal togglePreviewModal={togglePreviewModal} />}
      </main>
    </>
  );
};

export const getServerSideProps = async ({ locale }: ILocale) => {
  return {
    props: {
      ...(await serverSideTranslations(locale as string, ['dashboard'])),
    },
  };
};

export default CreateRolePage;
