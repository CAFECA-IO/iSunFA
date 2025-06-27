import Head from 'next/head';
import { useState, useEffect } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import { useTranslation } from 'next-i18next';
import Introduction from '@/components/beta/create_role/introduction';
import RoleCards from '@/components/beta/create_role/role_cards';
import RoleCardsMobile from '@/components/beta/create_role/mobile/role_cards_mobile';
import PreviewModal from '@/components/beta/create_role/preview_modal';
import { useUserCtx } from '@/contexts/user_context';
import { RoleName } from '@/constants/role';
import { PiArrowUUpLeftBold } from 'react-icons/pi';
import Link from 'next/link';
import Image from 'next/image';
import { ISUNFA_ROUTE } from '@/constants/url';
import LoginAnimation from '@/components/login/login_animation';
import { findUnusedRoles } from '@/lib/utils/role';
import { useRouter } from 'next/router';
import Loader from '@/components/loader/loader';
import loggerFront from '@/lib/utils/logger_front';

enum RolePageStatus {
  LOADING = 'loading', // Info: (20250522 - Liz) 正在取得角色資料
  SHOW_ANIMATION = 'show-animation', // Info: (20250522 - Liz) 使用者沒角色，要顯示動畫
  READY = 'ready', // Info: (20250522 - Liz) 有未建立的角色，要顯示主畫面
  REDIRECT = 'redirect', // Info: (20250522 - Liz) 所有角色都建立，導向選擇頁面
  ERROR = 'error', // Info: (20250522 - Liz) 抓資料失敗
}

const CreateRolePage = () => {
  const { t } = useTranslation(['dashboard']);
  const { getSystemRoleList, getUserRoleList } = useUserCtx();
  const router = useRouter();
  const [status, setStatus] = useState<RolePageStatus>(RolePageStatus.LOADING); // Info: (20250522 - Liz) 當前頁面狀態

  const [displayedRole, setDisplayedRole] = useState<RoleName | undefined>(undefined); // Info: (20250522 - Liz) 目前畫面顯示的角色(用於介紹)
  const [uncreatedRoles, setUncreatedRoles] = useState<RoleName[]>([]); // Info: (20250522 - Liz) 使用者尚未建立的角色
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [isAbleToGoBack, setIsAbleToGoBack] = useState<boolean>(false); // Info: (20250522 - Liz) 是否能回到選擇角色頁面

  const togglePreviewModal = () => setIsPreviewModalOpen((prev) => !prev);

  useEffect(() => {
    const fetchAndComputeRoles = async () => {
      loggerFront.log('觸發 useEffect, 取得系統角色與使用者角色 (in CreateRolePage)');

      try {
        const systemRoles = await getSystemRoleList();
        const userRoles = await getUserRoleList();

        if (!systemRoles || !userRoles) {
          loggerFront.log('取得系統角色或取得使用者角色尚未成功');
          return;
        }

        // Info: (20250522 - Liz) Case 1: 使用者尚未建立任何角色 => 顯示動畫
        if (userRoles.length === 0) {
          setUncreatedRoles(systemRoles);
          setStatus(RolePageStatus.SHOW_ANIMATION);
          return;
        }

        // Info: (20250522 - Liz) Case 2: 計算尚未建立的角色
        const unusedRoles = findUnusedRoles(systemRoles, userRoles);
        setUncreatedRoles(unusedRoles);

        // Info: (20250522 - Liz) Case 3: 如果所有角色都已建立，自動導向選擇角色頁面
        if (unusedRoles.length === 0) {
          setStatus(RolePageStatus.REDIRECT);
          return;
        }

        // Info: (20250522 - Liz) Case 4: 可顯示返回選擇角色頁面按鈕
        setIsAbleToGoBack(true);
        // Info: (20250523 - Liz) Case 5: 準備顯示角色介紹
        setStatus(RolePageStatus.READY);
      } catch (error) {
        loggerFront.error('Failed to fetch or compute roles:', error);
        setStatus(RolePageStatus.ERROR);
      }
    };

    fetchAndComputeRoles();
  }, [getSystemRoleList, getUserRoleList, router]);

  useEffect(() => {
    if (status === RolePageStatus.REDIRECT) {
      router.push(ISUNFA_ROUTE.SELECT_ROLE);
    }
  }, [router, status]);

  if (status === RolePageStatus.REDIRECT) return null; // Info: (20250523 - Liz) 防止 redirect 前畫面先 render

  if (status === RolePageStatus.LOADING) return <Loader />;

  if (status === RolePageStatus.SHOW_ANIMATION) {
    return <LoginAnimation onFinished={() => setStatus(RolePageStatus.READY)} />;
  }

  if (status === RolePageStatus.ERROR) {
    return <h1>{t('dashboard:CREATE_ROLE_PAGE.ROLE_DATA_NOT_FOUND')}</h1>;
  }

  // Info: (20250522 - Liz) 當 status === RolePageStatus.READY 才會走到這裡
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
            className="absolute right-0 top-140px z-0 hidden tablet:block"
          ></Image>
        )}

        {displayedRole === RoleName.INDIVIDUAL && (
          <Image
            src="/images/individual_bg.svg"
            alt="individual"
            width={480.11}
            height={614.51}
            className="absolute right-74px top-30px z-0 hidden tablet:block"
          ></Image>
        )}

        {displayedRole === RoleName.ACCOUNTING_FIRMS && (
          <Image
            src="/images/accounting_firms_bg.svg"
            alt="accounting_firms_bg"
            width={470.026}
            height={617.913}
            className="absolute right-110px top-30px z-0 hidden tablet:block"
          ></Image>
        )}

        {displayedRole === RoleName.ENTERPRISE && (
          <Image
            src="/images/enterprise_bg.svg"
            alt="enterprise_bg"
            width={660}
            height={660}
            className="absolute right-0 top-0 z-0 hidden tablet:block"
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

        {/* Info: (20250522 - Liz) 切換角色介紹按鈕 - 手機版 */}
        <RoleCardsMobile
          uncreatedRoles={uncreatedRoles}
          displayedRole={displayedRole}
          setDisplayedRole={setDisplayedRole}
        />

        {/* Info: (20250329 - Liz) Modal */}
        {isPreviewModalOpen && (
          <PreviewModal togglePreviewModal={togglePreviewModal} displayedRole={displayedRole} />
        )}
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
