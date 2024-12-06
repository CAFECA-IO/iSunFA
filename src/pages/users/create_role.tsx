import Head from 'next/head';
import { useState, useEffect } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import { useTranslation } from 'next-i18next';
import Introduction from '@/components/beta/create_role/introduction';
import RoleCard from '@/components/beta/create_role/role_cards';
import PreviewModal from '@/components/beta/create_role/preview_modal';
import { useUserCtx } from '@/contexts/user_context';
import { IRole } from '@/interfaces/role';
import { IUserRole } from '@/interfaces/user_role';
import { PiArrowUUpLeftBold } from 'react-icons/pi';
import Link from 'next/link';
import { ISUNFA_ROUTE } from '@/constants/url';
import LoginAnimation from '@/components/login/login_animation';

const findUnusedRoles = (systemRoles: IRole[], userRoles: IUserRole[]): IRole[] => {
  // Info: (20241122 - Liz) 將 userRoles 中的角色 ID 建立為一個 Set
  const userRoleIds = new Set(userRoles.map((userRole) => userRole.role.id));

  // Info: (20241122 - Liz) 從 systemRoles 中篩選出尚未被 userRoles 使用的角色
  return systemRoles.filter((role) => !userRoleIds.has(role.id));
};

const CreateRolePage = () => {
  const { t } = useTranslation(['dashboard']);
  const { getSystemRoleList, getUserRoleList } = useUserCtx();

  // Info: (20241108 - Liz) 畫面顯示的角色
  const [showingRole, setShowingRole] = useState<string>('');
  // Info: (20241108 - Liz) 使用者選擇的角色 ID
  const [selectedRoleId, setSelectedRoleId] = useState<number>(0);
  const [unusedSystemRoles, setUnusedSystemRoles] = useState<IRole[]>([]);
  const [isPreviewModalVisible, setIsPreviewModalVisible] = useState<boolean>(false);
  const [isAbleToGoBack, setIsAbleToGoBack] = useState<boolean>(false);
  const [isAnimationShowing, setIsAnimationShowing] = useState<boolean>(false);

  const togglePreviewModal = () => {
    setIsPreviewModalVisible((prev) => !prev);
  };

  useEffect(() => {
    const fetchAndComputeRoles = async () => {
      // Deprecated: (20241122 - Liz)
      // eslint-disable-next-line no-console
      console.log('觸發 useEffect, 取得系統角色與使用者角色 (in CreateRolePage)');

      try {
        const systemRoles = await getSystemRoleList();
        const userRoles = await getUserRoleList();

        if (!userRoles || userRoles.length === 0) {
          setIsAnimationShowing(true);
        }

        if (systemRoles && userRoles) {
          const unusedRoles = findUnusedRoles(systemRoles, userRoles);
          setUnusedSystemRoles(unusedRoles);
        }

        if (userRoles && userRoles.length > 0) {
          setIsAbleToGoBack(true);
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

      {isAnimationShowing && <LoginAnimation setIsAnimationShowing={setIsAnimationShowing} />}

      {!isAnimationShowing && (
        <main className="relative h-screen overflow-hidden">
          {isAbleToGoBack && (
            <Link
              href={ISUNFA_ROUTE.SELECT_ROLE}
              className="group absolute z-1 ml-40px mt-30px flex items-center gap-8px hover:text-button-text-primary-hover"
            >
              <PiArrowUUpLeftBold
                size={24}
                className="text-button-text-secondary group-hover:text-button-text-primary-hover"
              />
              <p className="text-lg font-semibold text-text-neutral-secondary group-hover:text-button-text-primary-hover">
                {t('dashboard:CREATE_ROLE_PAGE.BACK_TO_SELECT_ROLE_PAGE')}
              </p>
            </Link>
          )}

          <div className="h-75%">
            <Introduction
              showingRole={showingRole}
              selectedRoleId={selectedRoleId}
              togglePreviewModal={togglePreviewModal}
            />
          </div>

          <div className="mx-100px mb-40px">
            <RoleCard
              roleList={unusedSystemRoles}
              showingRole={showingRole}
              setShowingRole={setShowingRole}
              setSelectedRoleId={setSelectedRoleId}
            />
          </div>

          {isPreviewModalVisible && <PreviewModal togglePreviewModal={togglePreviewModal} />}
        </main>
      )}
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
