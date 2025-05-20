import Head from 'next/head';
import { useState, useEffect } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import { useTranslation } from 'next-i18next';
import Introduction from '@/components/beta/create_role/introduction';
import RoleCards from '@/components/beta/create_role/role_cards';
import PreviewModal from '@/components/beta/create_role/preview_modal';
import { useUserCtx } from '@/contexts/user_context';
import { RoleName } from '@/constants/role';
import { PiArrowUUpLeftBold } from 'react-icons/pi';
import Link from 'next/link';
import Image from 'next/image';
import { ISUNFA_ROUTE } from '@/constants/url';
import LoginAnimation from '@/components/login/login_animation';
import { findUnusedRoles } from '@/lib/utils/role';

const CreateRolePage = () => {
  const { t } = useTranslation(['dashboard']);
  const { getSystemRoleList, getUserRoleList } = useUserCtx();

  // Info: (20241108 - Liz) 畫面顯示的角色
  const [displayedRole, setDisplayedRole] = useState<RoleName | undefined>(undefined);
  const [uncreatedRoles, setUncreatedRoles] = useState<RoleName[]>([]);
  const [isPreviewModalVisible, setIsPreviewModalVisible] = useState<boolean>(false);
  const [isAbleToGoBack, setIsAbleToGoBack] = useState<boolean>(false);
  const [isAnimationShowing, setIsAnimationShowing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const togglePreviewModal = () => setIsPreviewModalVisible((prev) => !prev);

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
          setUncreatedRoles(unusedRoles);
        }

        if (userRoles && userRoles.length > 0) {
          setIsAbleToGoBack(true);
        }
      } catch (error) {
        // Deprecated: (20241108 - Liz)
        // eslint-disable-next-line no-console
        console.log('Failed to fetch or compute roles:', error);
      } finally {
        setIsLoading(false);
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

      {!isAnimationShowing && !isLoading && (
        <main className="relative flex h-screen flex-col overflow-hidden">
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

          {/* Info: (20250206 - Liz) 背景圖片 */}
          {!displayedRole && (
            <Image
              src="/images/select_role_bg.svg"
              alt="default_introduction"
              width={734.92}
              height={356.48}
              className="absolute right-0 top-140px z-0"
            ></Image>
          )}

          {displayedRole === RoleName.INDIVIDUAL && (
            <Image
              src="/images/individual_bg.svg"
              alt="individual"
              width={480.11}
              height={614.51}
              className="absolute right-74px top-30px z-0"
            ></Image>
          )}

          {displayedRole === RoleName.ACCOUNTING_FIRMS && (
            <Image
              src="/images/accounting_firms_bg.svg"
              alt="accounting_firms_bg"
              width={470.026}
              height={617.913}
              className="absolute right-110px top-30px z-0"
            ></Image>
          )}

          {displayedRole === RoleName.ENTERPRISE && (
            <Image
              src="/images/enterprise_bg.svg"
              alt="enterprise_bg"
              width={660}
              height={660}
              className="absolute right-0 top-0 z-0"
            ></Image>
          )}

          {/* Info: (20250206 - Liz) 角色介紹區塊 */}
          <Introduction displayedRole={displayedRole} togglePreviewModal={togglePreviewModal} />

          {/* Info: (20250206 - Liz) 切換角色介紹按鈕 */}
          <RoleCards
            uncreatedRoles={uncreatedRoles}
            displayedRole={displayedRole}
            setDisplayedRole={setDisplayedRole}
          />

          {/* Info: (20250329 - Liz) Modal */}
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
