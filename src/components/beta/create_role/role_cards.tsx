import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { RoleName } from '@/constants/role';
import { IRole } from '@/interfaces/role';
import { useTranslation } from 'next-i18next';

// Info: (20241007 - Liz) 每個角色對應的圖片
const ROLES_IMAGE = [
  {
    roleName: RoleName.BOOKKEEPER,
    imageSrc: '/images/bookkeeper_image.svg',
  },
  {
    roleName: RoleName.EDUCATIONAL_TRIAL_VERSION,
    imageSrc: '/images/educational_trial_version_image.svg',
  },
  {
    roleName: RoleName.ENTERPRISE,
    imageSrc: '/images/enterprise_image.svg',
  },
];

interface RoleCardProps {
  roleId: number;
  roleName: string;
  imageSrc: string;
  isDisabled: boolean;
  showingRole: string;
  setShowingRole: React.Dispatch<React.SetStateAction<string>>;
  setSelectedRoleId: React.Dispatch<React.SetStateAction<number>>;
}

const RoleCard = ({
  roleName,
  roleId,
  imageSrc,
  isDisabled,
  showingRole,
  setShowingRole,
  setSelectedRoleId,
}: RoleCardProps) => {
  const { t } = useTranslation('dashboard');
  const translatedRoleName = t(`dashboard:ROLE.${roleName.toUpperCase().replace(/ /g, '_')}`);

  const isRoleSelected = showingRole === roleName;

  const handleClick = () => {
    setShowingRole(roleName);
    setSelectedRoleId(roleId);
  };

  const notAvailable = roleName === RoleName.ENTERPRISE; // ToDo: (20250207 - Liz) 因為企業版角色介紹的設計尚未確定，所以暫時將企業版角色的卡片設為不可選擇

  return (
    <div className="px-60px pb-56px pt-36px">
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled || notAvailable}
        className={`relative flex h-120px w-240px skew-x-20 items-center rounded-sm text-text-neutral-primary shadow-Dropshadow_XS disabled:pointer-events-none disabled:opacity-50 screen1280:w-360px ${isRoleSelected ? 'border-2 border-stroke-brand-primary bg-surface-brand-primary-30' : 'bg-surface-neutral-surface-lv2 hover:bg-surface-brand-primary-10'}`}
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
    </div>
  );
};

interface RoleCardsProps {
  roleList: IRole[];
  showingRole: string;
  setShowingRole: React.Dispatch<React.SetStateAction<string>>;
  setSelectedRoleId: React.Dispatch<React.SetStateAction<number>>;
}

const RoleCards = ({
  roleList,
  showingRole,
  setShowingRole,
  setSelectedRoleId,
}: RoleCardsProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [disabledCards, setDisabledCards] = useState<number[]>([]);

  // Info: (20250207 - Liz) 監聽滾動事件，計算元素是否部分超出容器的左右邊界，得到左右滾動和部分遮蔽的效果
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const updateDisabledCards = () => {
      const newDisabledCards: number[] = [];
      const containerRect = container.getBoundingClientRect();

      Array.from(container.children).forEach((child, index) => {
        const cardRect = child.getBoundingClientRect();
        // Info: (20250207 - Liz) 判斷元素是否部分超出容器的左右邊界
        if (cardRect.left < containerRect.left || cardRect.right > containerRect.right) {
          newDisabledCards.push(index);
        }
      });

      setDisabledCards(newDisabledCards);
    };

    // Info: (20250207 - Liz) 監聽滾動事件
    container.addEventListener('scroll', updateDisabledCards);
    window.addEventListener('resize', updateDisabledCards);

    updateDisabledCards(); // Info: (20250207 - Liz) 初始化計算

    // Info: (20250207 - Liz) 回傳清理函式給 useEffect
    return () => {
      container.removeEventListener('scroll', updateDisabledCards);
      window.removeEventListener('resize', updateDisabledCards);
    };
  }, [roleList]);

  return (
    <section
      ref={containerRef}
      className="hide-scrollbar mx-60px flex max-w-full gap-20px overflow-x-auto"
    >
      {roleList.map((role, index) => {
        const imageSrc =
          ROLES_IMAGE.find((rolesImage) => rolesImage.roleName === role.name)?.imageSrc ?? '';

        return (
          <RoleCard
            key={role.id}
            roleId={role.id}
            roleName={role.name}
            imageSrc={imageSrc}
            showingRole={showingRole}
            setShowingRole={setShowingRole}
            setSelectedRoleId={setSelectedRoleId}
            isDisabled={disabledCards.includes(index)}
          />
        );
      })}
    </section>
  );
};

export default RoleCards;
