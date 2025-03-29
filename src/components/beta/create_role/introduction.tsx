import React, { useState } from 'react';
import Image from 'next/image';
import { FiArrowRight } from 'react-icons/fi';
import { PiFilmStrip } from 'react-icons/pi';
import { RoleName } from '@/constants/role';
import { useTranslation } from 'next-i18next';
import { useUserCtx } from '@/contexts/user_context';
import { useRouter } from 'next/router';
import { ISUNFA_ROUTE } from '@/constants/url';

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
    <section className="flex flex-col gap-40px pl-60px pt-70px">
      <h1 className="text-nowrap text-64px font-bold text-text-neutral-primary">
        {t('dashboard:CREATE_ROLE_PAGE.SELECT_YOUR_ROLE')}
      </h1>
      <p className="w-2/5 text-sm font-semibold text-text-neutral-secondary">
        {t('dashboard:CREATE_ROLE_PAGE.DEFAULT_INTRODUCTION')}
      </p>
    </section>
  );
};

interface BookkeeperIntroProps {
  children: React.ReactNode;
}

// Info: (20250329 - Liz) 記帳士角色介紹
const BookkeeperIntro = ({ children }: BookkeeperIntroProps) => {
  const { t } = useTranslation('dashboard');

  return (
    <section className="flex flex-col gap-40px pl-60px pt-70px">
      <div className="flex items-center gap-24px">
        <h1 className="text-nowrap text-64px font-bold text-text-neutral-primary">
          {t('dashboard:ROLE.BOOKKEEPER')}
        </h1>
        <Image
          src={'/icons/information_desk.svg'}
          alt="information_desk"
          width={30}
          height={30}
        ></Image>
      </div>

      <div className="w-2/5 text-sm font-semibold text-text-neutral-secondary">
        <p>{t('dashboard:CREATE_ROLE_PAGE.BOOKKEEPER_INTRODUCTION')}</p>
        <h3 className="pt-24px text-xl font-bold text-text-neutral-primary">
          {t('dashboard:CREATE_ROLE_PAGE.COMMON_FUNCTIONS')}
        </h3>
        <p>{t('dashboard:CREATE_ROLE_PAGE.COMMON_FUNCTIONS_FOR_BOOKKEEPER')}</p>
      </div>

      {children}
    </section>
  );
};

interface EducationalTrialVersionIntroProps {
  children: React.ReactNode;
}

// Info: (20250329 - Liz) 教育試用版角色介紹
const EducationalTrialVersionIntro = ({ children }: EducationalTrialVersionIntroProps) => {
  const { t } = useTranslation('dashboard');

  return (
    <section className="flex flex-col gap-40px pl-60px pt-70px">
      <div className="flex items-center gap-24px">
        <h1 className="text-nowrap text-64px font-bold text-text-neutral-primary">
          {t('dashboard:ROLE.EDUCATIONAL')}
          <span className="ml-8px text-28px text-text-neutral-tertiary">
            {'(' + t('dashboard:ROLE.TRIAL_VERSION') + ')'}
          </span>
        </h1>
        <Image
          src={'/icons/graduation_cap.svg'}
          alt="graduation_cap"
          width={30}
          height={30}
        ></Image>
      </div>

      <div className="w-2/5 text-sm font-semibold text-text-neutral-secondary">
        <p>{t('dashboard:CREATE_ROLE_PAGE.EDUCATIONAL_TRIAL_VERSION_INTRODUCTION')}</p>
        <h3 className="pt-24px text-xl font-bold text-text-neutral-primary">
          {t('dashboard:CREATE_ROLE_PAGE.COMMON_FUNCTIONS')}
        </h3>
        <p>{t('dashboard:CREATE_ROLE_PAGE.COMMON_FUNCTIONS_FOR_EDUCATIONAL_TRIAL_VERSION')}</p>
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
  return (
    <main className="flex flex-auto">
      {!displayedRole && <DefaultIntro />}
      {displayedRole === RoleName.BOOKKEEPER && (
        <BookkeeperIntro>
          <SetupButtons togglePreviewModal={togglePreviewModal} displayedRole={displayedRole} />
        </BookkeeperIntro>
      )}
      {displayedRole === RoleName.EDUCATIONAL_TRIAL_VERSION && (
        <EducationalTrialVersionIntro>
          <SetupButtons togglePreviewModal={togglePreviewModal} displayedRole={displayedRole} />
        </EducationalTrialVersionIntro>
      )}
    </main>
  );
};

export default Introduction;
