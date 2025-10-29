import { useState } from 'react';
import { FiArrowRight } from 'react-icons/fi';
import { PiFilmStrip } from 'react-icons/pi';
import { useTranslation } from 'next-i18next';
import { useUserCtx } from '@/contexts/user_context';
import { useRouter } from 'next/router';
import { RoleName } from '@/constants/role';
import { ISUNFA_ROUTE } from '@/constants/url';
import loggerFront from '@/lib/utils/logger_front';

interface IntroButtonsProps {
  displayedRole: RoleName | undefined;
  togglePreviewModal: () => void;
}

// Info: (20250329 - Liz) 建立角色按鈕、預覽影片按鈕
const IntroButtons = ({ displayedRole, togglePreviewModal }: IntroButtonsProps) => {
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
        loggerFront.log('角色建立失敗');
        return;
      }

      // Info: (20241107 - Liz) 角色建立成功，執行選擇角色的操作
      const { success: selectSuccess } = await selectRole(userRole.roleName);

      // Info: (20241107 - Liz) 檢查選擇角色是否成功，失敗則顯示錯誤訊息
      if (!selectSuccess) {
        loggerFront.log('選擇角色失敗');
        return;
      }

      // Info: (20241107 - Liz) 選擇角色成功，導向至儀表板
      router.push(ISUNFA_ROUTE.DASHBOARD);
    } catch (error) {
      (error as Error).message += ' (from createAndSelectRole)';
      // Info: (20241029 - Liz) 處理錯誤的邏輯，例如顯示錯誤訊息
      // console.error("發生錯誤:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Info: (20250522 - Liz) Desktop ver */}
      <div className="hidden gap-40px tablet:flex">
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

      {/* Info: (20250522 - Liz) Mobile ver */}
      <div className="flex gap-40px tablet:hidden">
        <button
          type="button"
          className="flex flex-auto items-center justify-center gap-8px rounded-xs border border-button-stroke-secondary px-16px py-8px text-lg font-medium text-button-text-secondary hover:border-button-stroke-primary-hover hover:text-button-text-primary-hover disabled:border-button-stroke-disable disabled:text-button-text-disable"
          onClick={togglePreviewModal}
        >
          <p>{t('dashboard:COMMON.PREVIEW')}</p>
          <PiFilmStrip size={24} />
        </button>

        <button
          type="button"
          className="flex flex-auto items-center justify-center gap-8px rounded-xs bg-button-surface-strong-primary px-16px py-8px text-lg font-medium text-button-text-primary-solid hover:bg-button-surface-strong-primary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
          onClick={createAndSelectRole}
          disabled={isLoading}
        >
          <p>{t('dashboard:COMMON.START')}</p>
          <FiArrowRight size={24} />
        </button>
      </div>
    </>
  );
};

export default IntroButtons;
