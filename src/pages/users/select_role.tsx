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

interface UserRoleProps {
  name: string;
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

// ToDo: (20241029 - Liz) 這是假資料，之後要改成從 API 拿
// const USER_ROLES: IUserRole[] = [
//   {
//     id: 1,
//     user: {
//       id: 1,
//       name: 'John Doe',
//       email: 'john@gmail.com',
//       imageId: '1',
//       agreementList: ['agreement1', 'agreement2'],
//       createdAt: 1730044800,
//       updatedAt: 1730044800,
//     },
//     role: {
//       id: 1,
//       name: RoleName.BOOKKEEPER,
//       permissions: ['READ', 'WRITE', 'DELETE'],
//       createdAt: 1730044800,
//       updatedAt: 1730044800,
//     },
//     lastLoginAt: 1730044800,
//     createdAt: 1730044800,
//     updatedAt: 1730044800,
//   },
//   {
//     id: 2,
//     user: {
//       id: 1,
//       name: 'John Doe',
//       email: 'jo',
//       imageId: '1',
//       agreementList: ['agreement1', 'agreement2'],
//       createdAt: 1730044800,
//       updatedAt: 1730044800,
//     },
//     role: {
//       id: 2,
//       name: RoleName.EDUCATIONAL_TRIAL_VERSION,
//       permissions: ['READ', 'WRITE'],
//       createdAt: 1730131200,
//       updatedAt: 1730131200,
//     },
//     lastLoginAt: 1730131200,
//     createdAt: 1730131200,
//     updatedAt: 1730131200,
//   },
// ];

const UserRole = ({ name, roleIconSrc, roleIconAlt, avatar, lastLoginAt }: UserRoleProps) => {
  // ToDo: (20241009 - Liz) 選擇 Role 功能
  const handleStart = () => {
    // Deprecated: (20241009 - Liz)
    // eslint-disable-next-line no-console
    console.log('選擇這個 Role 來開始工作');
  };

  return (
    <div className="relative flex h-480px w-280px flex-col items-center justify-between rounded-lg bg-surface-neutral-surface-lv1 p-40px shadow-Dropshadow_S">
      <div className="absolute left-20px top-20px opacity-30">
        <Image src={roleIconSrc} alt={roleIconAlt} width={64} height={64} />
      </div>

      <h2 className="text-32px font-bold text-text-neutral-primary">{name}</h2>

      <Image
        src={avatar}
        alt="user_avatar"
        width={120}
        height={120}
        className="rounded-full"
      ></Image>

      <div className="space-y-16px text-center text-lg font-medium">
        <p className="text-text-neutral-secondary">Last Login Time</p>

        <p className="text-text-neutral-tertiary">{lastLoginAt}</p>
      </div>

      <button
        type="button"
        className="flex items-center gap-8px rounded-xs bg-button-surface-strong-primary px-32px py-14px text-lg font-medium text-button-text-primary-solid hover:bg-button-surface-strong-primary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
        onClick={handleStart}
      >
        <p>Start</p>
        <FiArrowRight size={24} />
      </button>
    </div>
  );
};

const SelectRolePage = () => {
  const { t } = useTranslation(['common']);
  const { signOut, userAuth, getUserRoleList } = useUserCtx();
  const router = useRouter();
  const [userRoleList, setUserRoleList] = useState<IUserRole[]>([]);

  useEffect(() => {
    const fetchUserRoleList = async () => {
      const data = await getUserRoleList();

      if (data && data?.length > 0) {
        setUserRoleList(data);
      } else {
        router.push(ISUNFA_ROUTE.CREATE_ROLE);
      }
    };

    fetchUserRoleList();
  }, [router]);

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
        <title>{t('common:SELECT_ROLE_PAGE.SELECT_ROLE_TITLE')} - iSunFA</title>
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

      <div className="relative h-screen">
        <div className="absolute inset-0 z-0 h-full w-full bg-login_bg bg-cover bg-center bg-no-repeat blur-md"></div>

        <div className="absolute right-0 top-0 z-0 mr-40px mt-40px flex items-center gap-40px text-button-text-secondary">
          <I18n />

          <Link href={ISUNFA_ROUTE.BETA_DASHBOARD}>
            <FiHome size={20} />
          </Link>
        </div>

        <button
          type="button"
          onClick={signOut}
          className="absolute left-0 top-0 z-0 ml-40px mt-40px flex items-center gap-25px text-button-text-secondary"
        >
          <TbLogout size={32} />
          <p className="font-semibold">Log out</p>
        </button>

        {/* // Info: (20241009 - Liz) User Roles */}
        <section className="flex items-center justify-center gap-40px pt-120px">
          {userRoleList.map((userRole) => {
            const roleIcon = USER_ROLES_ICON.find((icon) => icon.id === userRole.role.name);

            return (
              <UserRole
                key={userRole.id}
                name={userRole.role.name}
                roleIconSrc={roleIcon?.roleIconSrc ?? ''}
                roleIconAlt={roleIcon?.roleIconAlt ?? ''}
                avatar={userAuth?.imageId ?? DEFAULT_AVATAR_URL}
                lastLoginAt={userRole.lastLoginAt}
              />
            );
          })}

          <Link
            href={ISUNFA_ROUTE.CREATE_ROLE}
            className="z-1 rounded-lg bg-surface-neutral-surface-lv1 p-18px text-text-neutral-secondary shadow-Dropshadow_S"
          >
            <HiPlus size={64} />
          </Link>
        </section>
      </div>
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

export default SelectRolePage;
