import Head from 'next/head';
import { useState, useEffect } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import { useTranslation } from 'next-i18next';
import Introduction from '@/components/beta/create_role/introduction';
import RoleCards from '@/components/beta/create_role/role_cards';
import PreviewModal from '@/components/beta/create_role/preview_modal';
import { useUserCtx } from '@/contexts/user_context';
import { IRole, RoleName } from '@/interfaces/role';
import { IUserRole } from '@/interfaces/user_role';
import { PiArrowUUpLeftBold } from 'react-icons/pi';
import Link from 'next/link';
import Image from 'next/image';
import { ISUNFA_ROUTE } from '@/constants/url';
import LoginAnimation from '@/components/login/login_animation';
import { toConstantCase } from '@/lib/utils/common';

// Info: (20250328 - Liz) 篩選出尚未被使用的角色
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
  const [displayedRole, setDisplayedRole] = useState<string>('');
  const isRoleDisplayed = !!displayedRole; // Info: (20250328 - Liz) 是否有正在顯示的角色
  const displayedRoleToConstantCase = toConstantCase(displayedRole); // Info: (20250328 - Liz) 將角色名稱轉換為常數格式
  const isBookkeeperDisplayed = displayedRoleToConstantCase === RoleName.BOOKKEEPER;
  const isEducationalTrialVersionDisplayed =
    displayedRoleToConstantCase === RoleName.EDUCATIONAL_TRIAL_VERSION;
  const isEnterpriseDisplayed = displayedRoleToConstantCase === RoleName.ENTERPRISE;

  // Info: (20241108 - Liz) 使用者選擇的角色 ID
  const [selectedRoleId, setSelectedRoleId] = useState<number>(0);
  const [unusedSystemRoles, setUnusedSystemRoles] = useState<IRole[]>([]);
  const [isPreviewModalVisible, setIsPreviewModalVisible] = useState<boolean>(false);
  const [isAbleToGoBack, setIsAbleToGoBack] = useState<boolean>(false);
  const [isAnimationShowing, setIsAnimationShowing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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
          {!isRoleDisplayed && (
            <Image
              src="/images/select_role_bg.svg"
              alt="default_introduction"
              width={734.92}
              height={356.48}
              className="absolute right-0 top-140px z-0"
            ></Image>
          )}

          {isBookkeeperDisplayed && (
            <Image
              src="/images/bookkeeper_bg.svg"
              alt="bookkeeper_introduction"
              width={566}
              height={671}
              className="absolute right-74px top-30px z-0"
            ></Image>
          )}

          {isEducationalTrialVersionDisplayed && (
            <Image
              src="/images/educational_bg.svg"
              alt="educational_trial_version"
              width={446}
              height={545}
              className="absolute right-110px top-30px z-0"
            ></Image>
          )}

          {isEnterpriseDisplayed && (
            // ToDo: (20250206 - Liz) 企業角色的背景圖片尚未設計，有之後再替換
            <Image
              src="/images/educational_bg.svg"
              alt="educational_trial_version"
              width={446}
              height={545}
              className="absolute right-110px top-30px z-0"
            ></Image>
          )}

          {/* Info: (20250206 - Liz) 介紹區塊 */}
          <Introduction
            displayedRole={displayedRole}
            selectedRoleId={selectedRoleId}
            togglePreviewModal={togglePreviewModal}
          />

          {/* Info: (20250206 - Liz) 切換按鈕 */}
          <RoleCards
            roleList={unusedSystemRoles}
            displayedRole={displayedRole}
            setDisplayedRole={setDisplayedRole}
            setSelectedRoleId={setSelectedRoleId}
          />

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
