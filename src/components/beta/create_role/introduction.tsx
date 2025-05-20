import { ReactNode, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FiArrowRight } from 'react-icons/fi';
import { PiFilmStrip } from 'react-icons/pi';
import { TbHome } from 'react-icons/tb';
import I18n from '@/components/i18n/i18n';
import { RoleName } from '@/constants/role';
import { useTranslation } from 'next-i18next';
import { useUserCtx } from '@/contexts/user_context';
import { useRouter } from 'next/router';
import { ISUNFA_ROUTE } from '@/constants/url';
import useOuterClick from '@/lib/hooks/use_outer_click';

interface SetupButtonsProps {
  displayedRole: RoleName | undefined;
  togglePreviewModal: () => void;
}

// Info: (20250329 - Liz) 建立角色按鈕、預覽影片按鈕
const SetupButtons = ({ displayedRole, togglePreviewModal }: SetupButtonsProps) => {
  const { t } = useTranslation('dashboard');
  const { createRole, selectRole } = useUserCtx();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const createAndSelectRole = async () => {
    if (!displayedRole) return;
    setIsLoading(true);

    try {
      const { success: createSuccess, userRole } = await createRole(displayedRole);

      if (!createSuccess || !userRole) {
        // Deprecated: (20250329 - Liz)
        // eslint-disable-next-line no-console
        console.log('角色建立失敗');
        return;
      }

      // Info: (20241107 - Liz) 角色建立成功，執行選擇角色的操作
      const { success: selectSuccess } = await selectRole(userRole.roleName);

      // Info: (20241107 - Liz) 檢查選擇角色是否成功，失敗則顯示錯誤訊息
      if (!selectSuccess) {
        // Deprecated: (20241107 - Liz)
        // eslint-disable-next-line no-console
        console.log('選擇角色失敗');
        return;
      }

      // Info: (20241107 - Liz) 選擇角色成功，導向至儀表板
      router.push(ISUNFA_ROUTE.DASHBOARD);
    } catch (error) {
      // Info: (20241029 - Liz) 處理錯誤的邏輯，例如顯示錯誤訊息
      // console.error("發生錯誤:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex gap-40px">
      <button
        type="button"
        className="flex items-center gap-8px rounded-xs border border-button-stroke-secondary px-32px py-14px text-lg font-medium text-button-text-secondary hover:border-button-stroke-primary-hover hover:text-button-text-primary-hover disabled:border-button-stroke-disable disabled:text-button-text-disable"
        onClick={togglePreviewModal}
      >
        <p>{t('dashboard:COMMON.PREVIEW')}</p>
        <PiFilmStrip size={24} />
      </button>

      <button
        type="button"
        className="flex items-center gap-8px rounded-xs bg-button-surface-strong-primary px-32px py-14px text-lg font-medium text-button-text-primary-solid hover:bg-button-surface-strong-primary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
        onClick={createAndSelectRole}
        disabled={isLoading}
      >
        <p>{t('dashboard:COMMON.START')}</p>
        <FiArrowRight size={24} />
      </button>
    </div>
  );
};

// Info: (20250329 - Liz) 預設介紹
const DefaultIntro = () => {
  const { t } = useTranslation('dashboard');

  return (
    <>
      {/* Info: (20250520 - Liz) Desktop ver */}
      <section className="hidden flex-col gap-40px pl-60px pt-70px tablet:flex">
        <h1 className="text-nowrap text-64px font-bold text-text-neutral-primary">
          {t('dashboard:CREATE_ROLE_PAGE.SELECT_YOUR_ROLE')}
        </h1>
        <p className="w-2/5 text-sm font-semibold text-text-neutral-secondary">
          {t('dashboard:CREATE_ROLE_PAGE.DEFAULT_INTRODUCTION')}
        </p>
      </section>

      {/* Info: (20250520 - Liz) Mobile ver */}
      <section className="flex flex-col gap-16px tablet:hidden">
        <h1 className="text-nowrap text-2xl font-bold text-text-neutral-primary">
          {t('dashboard:CREATE_ROLE_PAGE.SELECT_YOUR_ROLE')}
        </h1>
        <p className="text-xs leading-5 text-text-neutral-secondary">
          {t('dashboard:CREATE_ROLE_PAGE.DEFAULT_INTRODUCTION')}
        </p>
      </section>
    </>
  );
};

interface IndividualIntroProps {
  children: ReactNode;
}

// Info: (20250423 - Liz) 「個人」角色介紹
const IndividualIntro = ({ children }: IndividualIntroProps) => {
  const { t } = useTranslation('dashboard');

  return (
    <section className="flex flex-col gap-40px border-2 border-violet-500 pl-60px pt-70px">
      <div className="flex items-center gap-24px">
        <h1 className="text-nowrap text-64px font-bold text-text-neutral-primary">
          {t('dashboard:ROLE.INDIVIDUAL')}
        </h1>
        <Image
          src="/icons/information_desk.svg"
          alt="information_desk"
          width={30}
          height={30}
        ></Image>
      </div>

      <div className="w-2/5 text-sm font-semibold text-text-neutral-secondary">
        <p>{t('dashboard:CREATE_ROLE_PAGE.INDIVIDUAL_INTRODUCTION')}</p>
        <h3 className="pt-24px text-xl font-bold text-text-neutral-primary">
          {t('dashboard:CREATE_ROLE_PAGE.COMMON_FUNCTIONS')}
        </h3>
        <p>{t('dashboard:CREATE_ROLE_PAGE.COMMON_FUNCTIONS_FOR_INDIVIDUAL')}</p>
      </div>

      {children}
    </section>
  );
};

interface AccountingFirmsIntroProps {
  children: ReactNode;
}

// Info: (20250423 - Liz) 「事務所團隊」角色介紹
const AccountingFirmsIntro = ({ children }: AccountingFirmsIntroProps) => {
  const { t } = useTranslation('dashboard');

  return (
    <section className="flex flex-col gap-40px border-2 border-violet-400 pl-60px pt-70px">
      <div className="flex items-center gap-24px">
        <h1 className="text-nowrap text-64px font-bold text-text-neutral-primary">
          {t('dashboard:ROLE.ACCOUNTING_FIRMS')}
        </h1>
        <Image
          src="/icons/accounting_firms_icon.svg"
          alt="accounting_firms_icon"
          width={30}
          height={30}
        ></Image>
      </div>

      <div className="w-2/5 text-sm font-semibold text-text-neutral-secondary">
        <p>{t('dashboard:CREATE_ROLE_PAGE.ACCOUNTING_FIRMS_INTRODUCTION')}</p>
        <h3 className="pt-24px text-xl font-bold text-text-neutral-primary">
          {t('dashboard:CREATE_ROLE_PAGE.COMMON_FUNCTIONS')}
        </h3>
        <p>{t('dashboard:CREATE_ROLE_PAGE.COMMON_FUNCTIONS_FOR_ACCOUNTING_FIRMS')}</p>
      </div>

      {children}
    </section>
  );
};

interface EnterpriseIntroProps {
  children: ReactNode;
}

// Info: (20250423 - Liz) 「企業」角色介紹
const EnterpriseIntro = ({ children }: EnterpriseIntroProps) => {
  const { t } = useTranslation('dashboard');

  return (
    <section className="flex flex-col gap-40px border-2 border-violet-400 pl-60px pt-70px">
      <div className="flex items-center gap-24px">
        <h1 className="text-nowrap text-64px font-bold text-text-neutral-primary">
          {t('dashboard:ROLE.ENTERPRISE')}
        </h1>
        <Image
          src="/icons/information_desk.svg"
          alt="information_desk"
          width={30}
          height={30}
        ></Image>
      </div>

      <div className="w-2/5 text-sm font-semibold text-text-neutral-secondary">
        <p>{t('dashboard:CREATE_ROLE_PAGE.ENTERPRISE_INTRODUCTION')}</p>
        <h3 className="pt-24px text-xl font-bold text-text-neutral-primary">
          {t('dashboard:CREATE_ROLE_PAGE.COMMON_FUNCTIONS')}
        </h3>
        <p>{t('dashboard:CREATE_ROLE_PAGE.COMMON_FUNCTIONS_FOR_ENTERPRISE')}</p>
      </div>

      {children}
    </section>
  );
};

interface IntroductionProps {
  displayedRole: RoleName | undefined;
  togglePreviewModal: () => void;
}

const Introduction = ({ displayedRole, togglePreviewModal }: IntroductionProps) => {
  const {
    targetRef: globalRef,
    componentVisible: isMenuVisible,
    setComponentVisible: setIsMenuVisible,
  } = useOuterClick<HTMLDivElement>(false);

  return (
    <main className="flex flex-auto flex-col border-2 border-lime-400 p-16px tablet:p-0">
      <section className="mb-20px flex items-center justify-end gap-12px tablet:hidden">
        <div ref={globalRef}>
          <I18n isMenuVisible={isMenuVisible} setIsMenuVisible={setIsMenuVisible} />
        </div>
        <Link
          href={ISUNFA_ROUTE.LANDING_PAGE}
          className="p-10px text-icon-surface-single-color-primary hover:text-button-text-primary-hover disabled:text-button-text-disable"
        >
          <TbHome size={20} />
        </Link>
      </section>

      {!displayedRole && <DefaultIntro />}
      {displayedRole === RoleName.INDIVIDUAL && (
        <IndividualIntro>
          <SetupButtons togglePreviewModal={togglePreviewModal} displayedRole={displayedRole} />
        </IndividualIntro>
      )}
      {displayedRole === RoleName.ACCOUNTING_FIRMS && (
        <AccountingFirmsIntro>
          <SetupButtons togglePreviewModal={togglePreviewModal} displayedRole={displayedRole} />
        </AccountingFirmsIntro>
      )}

      {displayedRole === RoleName.ENTERPRISE && (
        <EnterpriseIntro>
          <SetupButtons togglePreviewModal={togglePreviewModal} displayedRole={displayedRole} />
        </EnterpriseIntro>
      )}
    </main>
  );
};

export default Introduction;
