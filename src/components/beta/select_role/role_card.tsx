import React from 'react';
import Image from 'next/image';
import { RoleId } from '@/constants/role';

interface RoleCardProps {
  showingRole: React.SetStateAction<RoleId | null>;
  setShowingRole: React.Dispatch<React.SetStateAction<RoleId | null>>;
}

interface CardProps {
  roleId: RoleId;
  isRoleDisabled: boolean;
  title: string;
  imageSrc: string;
  altText: string;
  showingRole: React.SetStateAction<RoleId | null>;
  setShowingRole: React.Dispatch<React.SetStateAction<RoleId | null>>;
}

// Info: (20241007 - Liz) 每個角色卡片的資訊
const cards: {
  roleId: RoleId;
  isRoleDisabled: boolean;
  title: string;
  imageSrc: string;
  altText: string;
}[] = [
  {
    roleId: RoleId.BOOKKEEPER,
    isRoleDisabled: false,
    title: 'Bookkeeper',
    imageSrc: '/images/bookkeeper.png',
    altText: 'bookkeeper',
  },
  {
    roleId: RoleId.EDUCATIONAL_TRIAL_VERSION,
    isRoleDisabled: false,
    title: 'Educational Trial Version',
    imageSrc: '/images/educational_trial.png',
    altText: 'educational_trial',
  },
  {
    roleId: RoleId.ACCOUNTANT,
    isRoleDisabled: true,
    title: 'Accountant',
    imageSrc: '/images/accountant.png',
    altText: 'accountant',
  },
];

// Info: (20241007 - Liz) 卡片元件
const Card: React.FC<CardProps> = ({
  roleId,
  isRoleDisabled,
  title,
  imageSrc,
  altText,
  showingRole,
  setShowingRole,
}) => {
  const isRoleSelected = showingRole === roleId;

  return (
    <button
      type="button"
      onClick={() => setShowingRole(roleId)}
      disabled={isRoleDisabled}
      className={`relative flex h-120px w-240px skew-x-20 items-center rounded-sm text-text-neutral-primary shadow-Dropshadow_XS disabled:opacity-50 screen1280:w-360px ${isRoleSelected ? 'border-2 border-stroke-brand-primary bg-surface-brand-primary-30' : 'bg-surface-neutral-surface-lv2 hover:bg-surface-brand-primary-10'} ${isRoleDisabled && 'pointer-events-none'}`}
    >
      <p
        className={`-skew-x-20 pl-110px text-center font-bold screen1280:w-300px screen1280:pl-100px ${roleId === RoleId.EDUCATIONAL_TRIAL_VERSION ? 'pl-100px laptop:text-lg screen1280:text-28px' : 'laptop:text-xl screen1280:text-32px'}`}
      >
        {title}
      </p>
      <Image
        src={imageSrc}
        alt={altText}
        width={48}
        height={48}
        className={`absolute -left-50px -top-30px w-160px -skew-x-20 rounded-full ${showingRole === roleId ? 'border-4 border-stroke-brand-primary' : ''}`}
      />
    </button>
  );
};

const RoleCard = ({ showingRole, setShowingRole }: RoleCardProps) => {
  return (
    <div className="flex justify-center gap-80px">
      {cards.map((card) => (
        <Card
          key={card.roleId}
          roleId={card.roleId}
          isRoleDisabled={card.isRoleDisabled}
          title={card.title}
          imageSrc={card.imageSrc}
          altText={card.altText}
          showingRole={showingRole}
          setShowingRole={setShowingRole}
        />
      ))}
    </div>
  );
};

export default RoleCard;
