import React, { useEffect, useRef, useState } from 'react';
import { RoleName, IRole } from '@/interfaces/role';
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';
import RoleCard from '@/components/beta/create_role/role_card';
import { toConstantCase } from '@/lib/utils/common';

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

interface RoleCardsProps {
  roleList: IRole[];
  displayedRole: string;
  setDisplayedRole: React.Dispatch<React.SetStateAction<string>>;
  setSelectedRoleId: React.Dispatch<React.SetStateAction<number>>;
}

const RoleCards = ({
  roleList,
  displayedRole,
  setDisplayedRole,
  setSelectedRoleId,
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
          const roleNameToConstantCase = toConstantCase(role.name); // Info: (20250328 - Liz) 將角色名稱轉換為常數格式

          const imageSrc =
            ROLES_IMAGE.find((rolesImage) => rolesImage.roleName === roleNameToConstantCase)
              ?.imageSrc ?? '';

          return (
            <RoleCard
              key={role.id}
              role={role}
              imageSrc={imageSrc}
              displayedRole={displayedRole}
              setDisplayedRole={setDisplayedRole}
              setSelectedRoleId={setSelectedRoleId}
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
