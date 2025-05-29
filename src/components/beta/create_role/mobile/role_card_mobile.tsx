import { Dispatch, SetStateAction } from 'react';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import { RoleName, ROLES_IMAGE } from '@/constants/role';
import { cn } from '@/lib/utils/common';

interface RoleCardMobileProps {
  uncreatedRole: RoleName;
  displayedRole: RoleName | undefined;
  setDisplayedRole: Dispatch<SetStateAction<RoleName | undefined>>;
}

const RoleCardMobile = ({
  uncreatedRole,
  displayedRole,
  setDisplayedRole,
}: RoleCardMobileProps) => {
  const { t } = useTranslation('dashboard');
  const isRoleSelected = displayedRole === uncreatedRole;
  const imageSrc = ROLES_IMAGE[uncreatedRole];
  const isAccountingFirms = uncreatedRole === RoleName.ACCOUNTING_FIRMS; // Info: (20250328 - Liz) 會計事務所角色的樣式特殊處理

  const handleClick = () => {
    setDisplayedRole(uncreatedRole);
  };

  return (
    <main className="px-60px pb-56px pt-36px tablet:hidden">
      <div className="skew-x-20 rounded-sm bg-surface-neutral-surface-lv2 shadow-Dropshadow_XS">
        <button
          type="button"
          onClick={handleClick}
          className={cn(
            'relative flex h-60px w-160px items-center rounded-xs text-text-neutral-primary disabled:pointer-events-none disabled:opacity-50 screen1280:w-360px',
            {
              'border-2 border-stroke-brand-primary bg-surface-brand-primary-30': isRoleSelected,
              'hover:bg-surface-brand-primary-10': !isRoleSelected,
            }
          )}
        >
          <span
            className={cn(
              '-skew-x-20 pl-40px text-center font-bold screen1280:w-300px screen1280:pl-100px',
              {
                'pl-100px laptop:text-lg screen1280:text-28px': isAccountingFirms,
                'laptop:text-xl screen1280:text-32px': !isAccountingFirms,
              }
            )}
          >
            {t(`dashboard:ROLE.${uncreatedRole}`)}
          </span>
          <Image
            src={imageSrc}
            alt="role_image"
            width={48}
            height={48}
            className={cn('absolute -left-50px -top-10px w-80px -skew-x-20 rounded-full', {
              'border-4 border-stroke-brand-primary': displayedRole === uncreatedRole,
            })}
          />
        </button>
      </div>
    </main>
  );
};

export default RoleCardMobile;
