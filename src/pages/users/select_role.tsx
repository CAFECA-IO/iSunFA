import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import { useTranslation } from 'next-i18next';
import { TbHome, TbLogout } from 'react-icons/tb';
import { HiPlus } from 'react-icons/hi2';
import Link from 'next/link';
import I18n from '@/components/i18n/i18n';
import { useUserCtx } from '@/contexts/user_context';
import { ISUNFA_ROUTE } from '@/constants/url';
import { IUserRole } from '@/interfaces/user_role';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { SkeletonList } from '@/components/skeleton/skeleton';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { findUnusedRoles } from '@/lib/utils/role';
import UserRole from '@/components/beta/select_role/user_role';
import Loader from '@/components/loader/loader';
import loggerFront from '@/lib/utils/logger_front';

const SelectRolePage = () => {
  const { t } = useTranslation(['dashboard']);
  const { signOut, getUserRoleList, getSystemRoleList } = useUserCtx();
  const router = useRouter();
  const [userRoleList, setUserRoleList] = useState<IUserRole[]>([]);
  const [isAbleToCreateRole, setIsAbleToCreateRole] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const initializeRolesData = async () => {
      loggerFront.log('觸發 useEffect, 取得系統角色與使用者角色 (in SelectRolePage)');

      setIsLoading(true);
      try {
        const userRoles = await getUserRoleList();
        const systemRoles = await getSystemRoleList();

        if (!userRoles || userRoles.length === 0) {
          router.push(ISUNFA_ROUTE.CREATE_ROLE);
          return;
        }

        setUserRoleList(userRoles);

        if (systemRoles && userRoles) {
          const unusedRoles = findUnusedRoles(systemRoles, userRoles);
          setIsAbleToCreateRole(unusedRoles.length > 0);
        }
      } catch (error) {
        loggerFront.error('Failed to fetch or compute roles:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeRolesData();
  }, [router]);

  const {
    targetRef: globalRef,
    componentVisible: isMenuOpen,
    setComponentVisible: setIsMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  // Info: (20250328 - Liz) 如果打 API 還在載入中，顯示載入中頁面
  if (isLoading) return <Loader />;

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('dashboard:SELECT_ROLE_PAGE.SELECT_ROLE_TITLE')} - iSunFA</title>
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

      <div className="relative flex h-screen items-center justify-center">
        <div className="absolute inset-0 z-0 h-full w-full bg-login_bg bg-cover bg-center bg-no-repeat blur-md"></div>

        <div className="absolute right-0 top-0 z-0 mr-40px mt-40px flex items-center gap-40px text-button-text-secondary">
          <div ref={globalRef}>
            <I18n isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
          </div>

          <Link href={ISUNFA_ROUTE.LANDING_PAGE}>
            <TbHome size={20} />
          </Link>
        </div>

        <button
          type="button"
          onClick={signOut}
          className="absolute left-0 top-0 z-0 ml-40px mt-40px flex items-center gap-25px text-button-text-secondary"
        >
          <TbLogout size={32} />
          <p className="font-semibold">{t('dashboard:HEADER.LOGOUT')}</p>
        </button>

        {/* Info: (20241009 - Liz) User Roles */}
        {isLoading && <SkeletonList count={4} />}
        {!isLoading && (
          <main className="hide-scrollbar overflow-x-auto">
            <section className="flex min-w-max items-center gap-40px px-16px py-50px">
              {userRoleList.map((userRole) => (
                <UserRole
                  key={userRole.id}
                  userRole={userRole}
                  lastLoginAt={userRole.lastLoginAt}
                />
              ))}

              {isAbleToCreateRole && (
                <Link
                  href={ISUNFA_ROUTE.CREATE_ROLE}
                  className="z-1 rounded-lg bg-surface-neutral-surface-lv1 p-18px text-text-neutral-secondary shadow-Dropshadow_S"
                >
                  <HiPlus size={64} />
                </Link>
              )}
            </section>
          </main>
        )}
      </div>
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

export default SelectRolePage;
