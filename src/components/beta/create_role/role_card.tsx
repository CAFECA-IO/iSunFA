import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import { RoleName } from '@/constants/role';

interface RoleCardProps {
  uncreatedRole: RoleName;
  imageSrc: string;
  isDisabled: boolean;
  displayedRole: RoleName | undefined;
  setDisplayedRole: React.Dispatch<React.SetStateAction<RoleName | undefined>>;
}

const RoleCard = ({
  uncreatedRole,
  imageSrc,
  isDisabled,
  displayedRole,
  setDisplayedRole,
}: RoleCardProps) => {
  const { t } = useTranslation('dashboard');
  const isRoleSelected = displayedRole === uncreatedRole;

  const isEnterprise = uncreatedRole === RoleName.ENTERPRISE; // Info: (20250207 - Liz) 因為企業版角色介紹的設計尚未確定，所以暫時將企業版角色的卡片設為不可選擇
  const isEducationalTrialVersion = uncreatedRole === RoleName.EDUCATIONAL_TRIAL_VERSION; // Info: (20250328 - Liz) 樣式特殊

  const handleClick = () => {
    setDisplayedRole(uncreatedRole);
  };

  return (
    <div className="px-60px pb-56px pt-36px">
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled || isEnterprise}
        className={`relative flex h-120px w-240px skew-x-20 items-center rounded-sm text-text-neutral-primary shadow-Dropshadow_XS disabled:pointer-events-none disabled:opacity-50 screen1280:w-360px ${isRoleSelected ? 'border-2 border-stroke-brand-primary bg-surface-brand-primary-30' : 'bg-surface-neutral-surface-lv2 hover:bg-surface-brand-primary-10'}`}
      >
        <p
          className={`-skew-x-20 pl-110px text-center font-bold screen1280:w-300px screen1280:pl-100px ${isEducationalTrialVersion ? 'pl-100px laptop:text-lg screen1280:text-28px' : 'laptop:text-xl screen1280:text-32px'}`}
        >
          {t(`dashboard:ROLE.${uncreatedRole}`)}
        </p>
        <Image
          src={imageSrc}
          alt="role_image"
          width={48}
          height={48}
          className={`absolute -left-50px -top-30px w-160px -skew-x-20 rounded-full ${displayedRole === uncreatedRole ? 'border-4 border-stroke-brand-primary' : ''}`}
        />
      </button>
    </div>
  );
};

export default RoleCard;
