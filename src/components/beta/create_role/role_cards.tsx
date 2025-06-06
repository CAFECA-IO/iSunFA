import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import { RoleName } from '@/constants/role';
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';
import RoleCard from '@/components/beta/create_role/role_card';

interface RoleCardsProps {
  uncreatedRoles: RoleName[];
  displayedRole: RoleName | undefined;
  setDisplayedRole: Dispatch<SetStateAction<RoleName | undefined>>;
}

const RoleCards = ({ uncreatedRoles, displayedRole, setDisplayedRole }: RoleCardsProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [disabledCards, setDisabledCards] = useState<number[]>([]);
  const [canScrollLeft, setCanScrollLeft] = useState<boolean>(false);
  const [canScrollRight, setCanScrollRight] = useState<boolean>(false);

  // Info: (20250207 - Liz) 監聽滾動事件，計算元素是否部分超出容器的左右邊界，得到左右滾動和部分遮蔽的效果，並且加上左右滾動按鈕可以控制滾動
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const visualMargin = 60; // Info: (20250422 - Liz) mx-60px 帶來的左右邊距

    const updateScrollState = () => {
      if (!container) return;
      const { scrollLeft, clientWidth, scrollWidth, children } = container;
      const newDisabledCards: number[] = [];

      Array.from(children).forEach((child, index) => {
        const element = child as HTMLElement;
        const cardLeft = element.offsetLeft;
        const cardRight = cardLeft + element.offsetWidth;

        const isPartiallyHidden =
          cardLeft < scrollLeft - visualMargin ||
          cardRight > scrollLeft + clientWidth + visualMargin;

        if (isPartiallyHidden) {
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
    <main className="relative hidden tablet:block">
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
        {uncreatedRoles.map((uncreatedRole, index) => (
          <RoleCard
            key={uncreatedRole}
            uncreatedRole={uncreatedRole}
            displayedRole={displayedRole}
            setDisplayedRole={setDisplayedRole}
            isDisabled={disabledCards.includes(index)}
          />
        ))}
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
