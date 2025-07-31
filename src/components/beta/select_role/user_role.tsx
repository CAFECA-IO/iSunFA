import { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { useUserCtx } from '@/contexts/user_context';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { ISUNFA_ROUTE } from '@/constants/url';
import { FiArrowRight } from 'react-icons/fi';
import { IUserRole } from '@/interfaces/user_role';
import { RoleName } from '@/constants/role';
import { DEFAULT_AVATAR_URL } from '@/constants/display';
import loggerFront from '@/lib/utils/logger_front';

// Info: (20250523 - Liz) 每個角色對應的小圖示
const ROLES_ICON: Record<RoleName, string> = {
  [RoleName.INDIVIDUAL]: '/icons/information_desk.svg',
  [RoleName.ACCOUNTING_FIRMS]: '/icons/accounting_firms_icon.svg',
  [RoleName.ENTERPRISE]: '/icons/enterprise_icon.svg',
};

interface UserRoleProps {
  userRole: IUserRole;
  lastLoginAt: number;
}

const UserRole = ({ userRole, lastLoginAt }: UserRoleProps) => {
  const { t } = useTranslation(['dashboard']);
  const router = useRouter();
  const { userAuth, selectRole } = useUserCtx();
  const roleIcon = ROLES_ICON[userRole.roleName];
  const roleIconAlt = `${userRole.roleName} icon`;
  const avatar = userAuth?.imageId ?? DEFAULT_AVATAR_URL;

  const [isLoading, setIsLoading] = useState(false);

  const selectUserRole = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      // Info: (20241009 - Liz) 呼叫 selectRole 並等待結果
      const { success } = await selectRole(userRole.roleName);

      if (!success) {
        loggerFront.log('selectUserRole error (選擇角色失敗):', success);
      }

      // Info: (20241107 - Liz) 選擇角色成功後，導向到儀表板
      router.push(ISUNFA_ROUTE.DASHBOARD);
    } catch (error) {
      loggerFront.error('selectUserRole error (選擇角色失敗):', error);
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
        <Image src={roleIcon} alt={roleIconAlt} width={64} height={64} />
      </div>

      <h2 className="text-32px font-bold text-text-neutral-primary">
        {t(`dashboard:ROLE.${userRole.roleName}`)}
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
        onClick={selectUserRole}
        disabled={isLoading}
      >
        <p>{t('dashboard:COMMON.START')}</p>
        <FiArrowRight size={24} />
      </button>
    </div>
  );
};

export default UserRole;
