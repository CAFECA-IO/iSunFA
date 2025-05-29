import { Dispatch, SetStateAction } from 'react';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import { RoleName, ROLES_IMAGE } from '@/constants/role';
import { cn } from '@/lib/utils/common';

interface RoleCardProps {
  uncreatedRole: RoleName;
  isDisabled: boolean;
  displayedRole: RoleName | undefined;
  setDisplayedRole: Dispatch<SetStateAction<RoleName | undefined>>;
}

const RoleCard = ({
  uncreatedRole,
  isDisabled,
  displayedRole,
  setDisplayedRole,
}: RoleCardProps) => {
  const { t } = useTranslation('dashboard');
  const isRoleSelected = displayedRole === uncreatedRole;
  const imageSrc = ROLES_IMAGE[uncreatedRole];
  const isAccountingFirms = uncreatedRole === RoleName.ACCOUNTING_FIRMS; // Info: (20250328 - Liz) 會計事務所角色的樣式特殊處理

  const handleClick = () => {
    setDisplayedRole(uncreatedRole);
  };

  return (
    <main className="px-60px pb-56px pt-36px">
      <div className="skew-x-20 rounded-sm bg-surface-neutral-surface-lv2 shadow-Dropshadow_XS">
        <button
          type="button"
          onClick={handleClick}
          disabled={isDisabled}
          className={cn(
            'relative flex h-120px w-360px items-center rounded-xs text-text-neutral-primary disabled:pointer-events-none disabled:opacity-50',
            {
              'border-2 border-stroke-brand-primary bg-surface-brand-primary-30': isRoleSelected,
              'hover:bg-surface-brand-primary-10': !isRoleSelected,
            }
          )}
        >
          <span
            className={cn('w-300px -skew-x-20 pl-100px text-center font-bold', {
              'text-28px': isAccountingFirms,
              'text-32px': !isAccountingFirms,
            })}
          >
            {t(`dashboard:ROLE.${uncreatedRole}`)}
          </span>
          <Image
            src={imageSrc}
            alt="role_image"
            width={48}
            height={48}
            className={cn('absolute -left-50px -top-30px w-160px -skew-x-20 rounded-full', {
              'border-4 border-stroke-brand-primary': displayedRole === uncreatedRole,
            })}
          />
        </button>
      </div>
    </main>
  );
};

export default RoleCard;
