import React from 'react';
import Image from 'next/image';
import { RoleName } from '@/constants/role';
import { IRole } from '@/interfaces/role';
import { useTranslation } from 'react-i18next';

interface RoleCardsProps {
  roleList: IRole[];
  showingRole: string;
  setShowingRole: React.Dispatch<React.SetStateAction<string>>;
  setSelectedRoleId: React.Dispatch<React.SetStateAction<number>>;
}

interface CardProps {
  roleId: number;
  roleName: string;
  imageSrc: string;
  showingRole: string;
  setShowingRole: React.Dispatch<React.SetStateAction<string>>;
  setSelectedRoleId: React.Dispatch<React.SetStateAction<number>>;
}

// Info: (20241007 - Liz) 每個角色對應的圖片
const ROLES_IMAGE = [
  {
    roleName: RoleName.BOOKKEEPER,
    imageSrc: '/images/bookkeeper.png',
  },
  {
    roleName: RoleName.EDUCATIONAL_TRIAL_VERSION,
    imageSrc: '/images/educational_trial.png',
  },
  {
    roleName: RoleName.ACCOUNTANT,
    imageSrc: '/images/accountant.png',
  },
];

// Info: (20241007 - Liz) 卡片元件
const Card = ({
  roleName,
  roleId,
  imageSrc,
  showingRole,
  setShowingRole,
  setSelectedRoleId,
}: CardProps) => {
  const { t } = useTranslation('dashboard');
  const translatedRoleName = t(`dashboard:ROLE.${roleName.toUpperCase().replace(/ /g, '_')}`);

  const isRoleSelected = showingRole === roleName;

  const handleClick = () => {
    setShowingRole(roleName);
    setSelectedRoleId(roleId);
  };

  const isDisabled = roleName === RoleName.ACCOUNTANT;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      className={`relative flex h-120px w-240px skew-x-20 items-center rounded-sm text-text-neutral-primary shadow-Dropshadow_XS disabled:opacity-50 screen1280:w-360px ${isRoleSelected ? 'border-2 border-stroke-brand-primary bg-surface-brand-primary-30' : 'bg-surface-neutral-surface-lv2 hover:bg-surface-brand-primary-10'}`}
    >
      <p
        className={`-skew-x-20 pl-110px text-center font-bold screen1280:w-300px screen1280:pl-100px ${roleName === RoleName.EDUCATIONAL_TRIAL_VERSION ? 'pl-100px laptop:text-lg screen1280:text-28px' : 'laptop:text-xl screen1280:text-32px'}`}
      >
        {translatedRoleName}
      </p>
      <Image
        src={imageSrc}
        alt="role_image"
        width={48}
        height={48}
        className={`absolute -left-50px -top-30px w-160px -skew-x-20 rounded-full ${showingRole === roleName ? 'border-4 border-stroke-brand-primary' : ''}`}
      />
    </button>
  );
};

const RoleCards = ({
  roleList,
  showingRole,
  setShowingRole,
  setSelectedRoleId,
}: RoleCardsProps) => {
  return (
    <div className="flex justify-center gap-80px">
      {roleList.map((role) => {
        const imageSrc =
          ROLES_IMAGE.find((rolesImage) => rolesImage.roleName === role.name)?.imageSrc ?? '';

        return (
          <Card
            key={role.id}
            roleId={role.id}
            roleName={role.name}
            imageSrc={imageSrc}
            showingRole={showingRole}
            setShowingRole={setShowingRole}
            setSelectedRoleId={setSelectedRoleId}
          />
        );
      })}
    </div>
  );
};

export default RoleCards;
