import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { RoleName } from '@/constants/role';
import { useTranslation } from 'next-i18next';
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';

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
  roleName: RoleName;
  imageSrc: string;
  isDisabled: boolean;
  showingRole: string;
  setShowingRole: React.Dispatch<React.SetStateAction<string>>;
  setSelectedRoleName: React.Dispatch<React.SetStateAction<RoleName>>;
}

const RoleCard = ({
  roleName,
  imageSrc,
  isDisabled,
  showingRole,
  setShowingRole,
  setSelectedRoleName,
}: RoleCardProps) => {
  const { t } = useTranslation('dashboard');
  const translatedRoleName = t(`dashboard:ROLE.${roleName.toUpperCase().replace(/ /g, '_')}`);

  const isRoleSelected = showingRole === roleName;

  const handleClick = () => {
    setShowingRole(roleName);
    setSelectedRoleName(roleName);
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
  roleList: RoleName[];
  showingRole: string;
  setShowingRole: React.Dispatch<React.SetStateAction<string>>;
  setSelectedRoleName: React.Dispatch<React.SetStateAction<RoleName>>;
}

const RoleCards = ({
  roleList,
  showingRole,
  setShowingRole,
  setSelectedRoleName,
}: RoleCardsProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [disabledCards, setDisabledCards] = useState<number[]>([]);
  const [canScrollLeft, setCanScrollLeft] = useState<boolean>(false);
  const [canScrollRight, setCanScrollRight] = useState<boolean>(false);

  // Info: (20250207 - Liz) 監聽滾動事件，計算元素是否部分超出容器的左右邊界，得到左右滾動和部分遮蔽的效果，並且加上左右滾動按鈕可以控制滾動
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const updateScrollState = () => {
      if (!container) return;
      const { scrollLeft, clientWidth, scrollWidth, children } = container;
      const newDisabledCards: number[] = [];

      Array.from(children).forEach((child, index) => {
        const cardLeft = (child as HTMLElement).offsetLeft;
        const cardRight = cardLeft + (child as HTMLElement).offsetWidth;

        if (cardLeft < scrollLeft || cardRight > scrollLeft + clientWidth) {
          newDisabledCards.push(index);
        }
      });

      setDisabledCards(newDisabledCards);
      // Info: (20250207 - Liz) 檢查是否還能繼續向左或向右滾動
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollWidth > clientWidth && scrollLeft + clientWidth < scrollWidth);
    };

    // Info: (20250207 - Liz) 監聽滾動事件
    container.addEventListener('scroll', updateScrollState);
    window.addEventListener('resize', updateScrollState);

    // Info: (20250207 - Liz) 初始化計算
    updateScrollState();

    // Info: (20250207 - Liz) 回傳清理函式給 useEffect
    return () => {
      container.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, []);

  // Info: (20250207 - Liz) 左右滾動控制
  const scroll = (direction: 'left' | 'right') => {
    const container = containerRef.current;
    if (!container) return;

    const scrollAmount = 200;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <main className="relative">
      {/* Info: (20250207 - Liz) 左側按鈕 */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scroll('left')}
          className="absolute left-20px top-1/2 z-10 -translate-y-1/2 rounded-xs bg-button-surface-strong-secondary p-16px text-button-text-invert hover:bg-button-surface-strong-secondary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
        >
          <IoIosArrowBack size={20} />
        </button>
      )}

      {/* Info: (20250207 - Liz) 角色卡片按鈕 */}
      <section
        ref={containerRef}
        className="hide-scrollbar mx-60px flex max-w-fit gap-20px overflow-x-auto"
      >
        {roleList.map((role, index) => {
          const imageSrc =
            ROLES_IMAGE.find((rolesImage) => rolesImage.roleName === role)?.imageSrc ?? '';

          return (
            <RoleCard
              key={role}
              roleName={role}
              imageSrc={imageSrc}
              showingRole={showingRole}
              setShowingRole={setShowingRole}
              setSelectedRoleName={setSelectedRoleName}
              isDisabled={disabledCards.includes(index)}
            />
          );
        })}
      </section>

      {/* Info: (20250207 - Liz) 右側按鈕 */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scroll('right')}
          className="absolute right-20px top-1/2 z-10 -translate-y-1/2 rounded-xs bg-button-surface-strong-secondary p-16px text-button-text-invert hover:bg-button-surface-strong-secondary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
        >
          <IoIosArrowForward size={20} />
        </button>
      )}
    </main>
  );
};

export default RoleCards;
