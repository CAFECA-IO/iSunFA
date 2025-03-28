import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';
import { useTranslation } from 'next-i18next';
import { FiHome, FiArrowRight } from 'react-icons/fi';
import { TbLogout } from 'react-icons/tb';
import { HiPlus } from 'react-icons/hi2';
import Image from 'next/image';
import Link from 'next/link';
import I18n from '@/components/i18n/i18n';
import { useUserCtx } from '@/contexts/user_context';
import { ISUNFA_ROUTE } from '@/constants/url';
import { DEFAULT_AVATAR_URL } from '@/constants/display';
import { RoleName } from '@/constants/role';
import { IUserRole } from '@/interfaces/user_role';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { SkeletonList } from '@/components/skeleton/skeleton';
import useOuterClick from '@/lib/hooks/use_outer_click';

interface UserRoleProps {
  roleId: RoleName;
  roleIconSrc: string;
  roleIconAlt: string;
  avatar: string;
  lastLoginAt: number;
}

// Info: (20241029 - Liz) 用來對照 Role 的 Icon
const USER_ROLES_ICON = [
  {
    id: RoleName.BOOKKEEPER,
    roleIconSrc: '/icons/information_desk.svg',
    roleIconAlt: 'information_desk',
  },
  {
    id: RoleName.EDUCATIONAL_TRIAL_VERSION,
    roleIconSrc: '/icons/graduation_cap.svg',
    roleIconAlt: 'graduation_cap',
  },
];

const UserRole = ({ roleId, roleIconSrc, roleIconAlt, avatar, lastLoginAt }: UserRoleProps) => {
  const { t } = useTranslation(['dashboard']);
  const router = useRouter();
  const { selectRole } = useUserCtx();
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectRole = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      // Info: (20241009 - Liz) 呼叫 selectRole 並等待結果
      const data = await selectRole(roleId);

      if (data) {
        // Info: (20241107 - Liz) 選擇角色成功後，導向到儀表板
        router.push(ISUNFA_ROUTE.DASHBOARD);
      }
    } catch (error) {
      // Deprecated: (20241107 - Liz)
      // eslint-disable-next-line no-console
      console.log('handleSelectRole error (選擇角色失敗):', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Info: (20241204 - Liz) 轉換時間戳記為日期格式
  const timeStamps = lastLoginAt * 1000;
  const dateObject = new Date(timeStamps);
  const year = dateObject.getFullYear();
  const month = dateObject.getMonth() + 1;
  const date = dateObject.getDate();
  const hours = dateObject.getHours();
  const minutes = dateObject.getMinutes();
  const seconds = dateObject.getSeconds();
  const lastLoginTime = `${year}/${month}/${date} ${hours}:${minutes}:${seconds}`;

  return (
    <div className="relative flex h-480px w-280px flex-col items-center justify-between rounded-lg bg-surface-neutral-surface-lv1 p-40px shadow-Dropshadow_S">
      <div className="absolute left-20px top-20px opacity-30">
        <Image src={roleIconSrc} alt={roleIconAlt} width={64} height={64} />
      </div>

      <h2 className="text-32px font-bold text-text-neutral-primary">
        {t(`dashboard:ROLE.${roleId.toString().toUpperCase().replace(/\s+/g, '_')}`)}
      </h2>

      <Image
        src={avatar}
        alt="user_avatar"
        width={120}
        height={120}
        className="rounded-full"
      ></Image>

      <div className="space-y-16px text-center">
        <p className="text-xs font-medium leading-5 text-text-neutral-secondary">
          {t('dashboard:LOGIN.LAST_LOGIN_TIME')}
        </p>
        <p className="text-lg font-medium text-text-neutral-tertiary">{lastLoginTime}</p>
      </div>

      <button
        type="button"
        className="flex items-center gap-8px rounded-xs bg-button-surface-strong-primary px-32px py-14px text-lg font-medium text-button-text-primary-solid hover:bg-button-surface-strong-primary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
        onClick={handleSelectRole}
        disabled={isLoading}
      >
        <p>{t('dashboard:COMMON.START')}</p>
        <FiArrowRight size={24} />
      </button>
    </div>
  );
};

const findUnusedRoles = (systemRoles: RoleName[], userRoles: IUserRole[]): RoleName[] => {
  // Info: (20241122 - Liz) 將 userRoles 中的角色 ID 建立為一個 Set
  const userRoleIds = new Set(userRoles.map((userRole) => userRole.roleName));

  // Info: (20241122 - Liz) 從 systemRoles 中篩選出尚未被 userRoles 使用的角色
  return systemRoles.filter((role) => !userRoleIds.has(role));
};

const SelectRolePage = () => {
  const { t } = useTranslation(['dashboard']);
  const { signOut, userAuth, getUserRoleList, getSystemRoleList } = useUserCtx();
  const router = useRouter();
  const [userRoleList, setUserRoleList] = useState<IUserRole[]>([]);
  const [isAbleToCreateRole, setIsAbleToCreateRole] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const initializeRolesData = async () => {
      // Deprecated: (20241122 - Liz)
      // eslint-disable-next-line no-console
      console.log('觸發 useEffect, 取得系統角色與使用者角色 (in SelectRolePage)');

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
        // Deprecated: (20241122 - Liz)
        // eslint-disable-next-line no-console
        console.log('Failed to fetch or compute roles:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeRolesData();
  }, [router]);

  const {
    targetRef: globalRef,
    componentVisible: isMenuVisible,
    setComponentVisible: setIsMenuVisible,
  } = useOuterClick<HTMLDivElement>(false);

  // Info: (20241107 - Liz) 跳轉到建立角色頁面前的 Loading 畫面
  if (userRoleList === null) {
    // 顯示載入指示器，直到完成 `getUserRoleList` 的請求
    return <div>Loading...</div>;
  }

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
            <I18n isMenuVisible={isMenuVisible} setIsMenuVisible={setIsMenuVisible} />
          </div>

          <Link href={ISUNFA_ROUTE.LANDING_PAGE}>
            <FiHome size={22} />
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

        {/* // Info: (20241009 - Liz) User Roles */}
        {isLoading && <SkeletonList count={4} />}
        {!isLoading && (
          <section className="flex items-center justify-center gap-40px">
            {userRoleList.map((userRole) => {
              const roleIcon = USER_ROLES_ICON.find((icon) => icon.id === userRole.roleName);

              return (
                <UserRole
                  key={userRole.id}
                  roleId={userRole.roleName}
                  roleIconSrc={roleIcon?.roleIconSrc ?? ''}
                  roleIconAlt={roleIcon?.roleIconAlt ?? ''}
                  avatar={userAuth?.imageId ?? DEFAULT_AVATAR_URL}
                  lastLoginAt={userRole.lastLoginAt}
                />
              );
            })}

            {isAbleToCreateRole && (
              <Link
                href={ISUNFA_ROUTE.CREATE_ROLE}
                className="z-1 rounded-lg bg-surface-neutral-surface-lv1 p-18px text-text-neutral-secondary shadow-Dropshadow_S"
              >
                <HiPlus size={64} />
              </Link>
            )}
          </section>
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
