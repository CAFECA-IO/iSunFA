import React, { useState } from 'react';
import Image from 'next/image';
import { FiEye, FiArrowRight } from 'react-icons/fi';
import { RoleName } from '@/constants/role';
import { useTranslation } from 'next-i18next';
import { useUserCtx } from '@/contexts/user_context';
import { useRouter } from 'next/router';
import { ISUNFA_ROUTE } from '@/constants/url';

interface IntroductionProps {
  selectedRoleId: number;
  showingRole: string;
  togglePreviewModal: () => void;
}
interface ButtonsProps {
  selectedRoleId: number;
  togglePreviewModal: () => void;
}
interface BookkeeperIntroductionProps {
  children: React.ReactNode;
}
interface EducationalTrialVersionIntroductionProps {
  children: React.ReactNode;
}

const DefaultIntroduction: React.FC = () => {
  const { t } = useTranslation('dashboard');

  return (
    <section className="relative h-full">
      <div className="flex flex-col gap-40px pl-60px pt-60px">
        <h1 className="text-nowrap text-64px font-bold text-text-neutral-primary">
          {t('dashboard:CREATE_ROLE_PAGE.SELECT_YOUR_ROLE')}
        </h1>
        <p className="w-2/5 text-sm font-semibold text-text-neutral-secondary">
          {t('dashboard:CREATE_ROLE_PAGE.DEFAULT_INTRODUCTION')}
        </p>
      </div>

      <div className="absolute right-0 top-0 z-0 w-600px screen1280:w-800px">
        <Image
          src="/images/bg_select_role.png"
          alt="bg_select_role"
          width={600}
          height={600}
          className="w-full"
        ></Image>
      </div>
    </section>
  );
};

const Buttons = ({ selectedRoleId, togglePreviewModal }: ButtonsProps) => {
  const { t } = useTranslation('dashboard');
  const { createRole, selectRole } = useUserCtx();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateAndSelectRole = async () => {
    setIsLoading(true);

    try {
      const userRole = await createRole(selectedRoleId);

      if (!userRole || !userRole.role || !userRole.role.id) {
        // Deprecated: (20241107 - Liz)
        // eslint-disable-next-line no-console
        console.log('角色建立失敗: 無效的 userRole 或 role ID', userRole);
        return;
      }

      // Info: (20241107 - Liz) 角色建立成功，執行選擇角色的操作
      const res = await selectRole(userRole.role.id);

      // Info: (20241107 - Liz) 檢查選擇角色是否成功，失敗則顯示錯誤訊息
      if (!res) {
        // Deprecated: (20241107 - Liz)
        // eslint-disable-next-line no-console
        console.log('選擇角色失敗 userRole.role.id', userRole.role.id);
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
        <FiEye size={24} />
      </button>

      <button
        type="button"
        className="flex items-center gap-8px rounded-xs bg-button-surface-strong-primary px-32px py-14px text-lg font-medium text-button-text-primary-solid hover:bg-button-surface-strong-primary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
        onClick={handleCreateAndSelectRole}
        disabled={isLoading}
      >
        <p>{t('dashboard:COMMON.START')}</p>
        <FiArrowRight size={24} />
      </button>
    </div>
  );
};

const BookkeeperIntroduction: React.FC<BookkeeperIntroductionProps> = ({ children }) => {
  const { t } = useTranslation('dashboard');

  return (
    <section className="relative h-full">
      <div className="flex flex-col gap-40px pl-60px pt-60px">
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
      </div>

      <div className="absolute right-0 top-0 z-0 w-500px screen1280:w-600px">
        <Image
          src="/images/bg_bookkeeper.png"
          alt="bg_bookkeeper"
          width={600}
          height={600}
          className="w-full"
        ></Image>
      </div>
    </section>
  );
};

const EducationalTrialVersionIntroduction: React.FC<EducationalTrialVersionIntroductionProps> = ({
  children,
}) => {
  const { t } = useTranslation('dashboard');

  return (
    <section className="relative h-full">
      <div className="flex flex-col gap-40px pl-60px pt-60px">
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
      </div>

      <div className="absolute right-0 top-0 z-0 w-500px screen1280:w-600px">
        <Image
          src="/images/bg_educational_trial_version.png"
          alt="bg_educational_trial_version"
          width={600}
          height={600}
          className="w-full"
        ></Image>
      </div>
    </section>
  );
};

const Introduction = ({ selectedRoleId, showingRole, togglePreviewModal }: IntroductionProps) => {
  return (
    <>
      {!showingRole && <DefaultIntroduction />}
      {showingRole === RoleName.BOOKKEEPER && (
        <BookkeeperIntroduction>
          <Buttons togglePreviewModal={togglePreviewModal} selectedRoleId={selectedRoleId} />
        </BookkeeperIntroduction>
      )}
      {showingRole === RoleName.EDUCATIONAL_TRIAL_VERSION && (
        <EducationalTrialVersionIntroduction>
          <Buttons togglePreviewModal={togglePreviewModal} selectedRoleId={selectedRoleId} />
        </EducationalTrialVersionIntroduction>
      )}
    </>
  );
};

export default Introduction;
