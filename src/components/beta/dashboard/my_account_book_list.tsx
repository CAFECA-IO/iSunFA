import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import { useUserCtx } from '@/contexts/user_context';
import { IAccountBookForUser } from '@/interfaces/account_book';
import MyAccountBookItem from '@/components/beta/dashboard/my_account_book_item';

interface MyAccountBookListProps {
  companyAndRoleList: IAccountBookForUser[];
  setAccountBookToSelect: Dispatch<SetStateAction<IAccountBookForUser | undefined>>;
}

const MyAccountBookList = ({
  companyAndRoleList,
  setAccountBookToSelect,
}: MyAccountBookListProps) => {
  const { selectedAccountBook } = useUserCtx();
  const containerRef = useRef<HTMLDivElement>(null);
  const [disabledCards, setDisabledCards] = useState<number[]>([]);

  // Info: (20241216 - Liz) 監聽滾動事件，計算元素是否部分超出容器的左右邊界，得到左右滾動和部分遮蔽的效果
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const updateDisabledCards = () => {
      const newDisabledCards: number[] = [];
      const containerRect = container.getBoundingClientRect();

      Array.from(container.children).forEach((child, index) => {
        const cardRect = child.getBoundingClientRect();
        // Info: (20241216 - Liz) 判斷元素是否部分超出容器的左右邊界
        if (cardRect.left < containerRect.left || cardRect.right > containerRect.right) {
          newDisabledCards.push(index);
        }
      });

      setDisabledCards(newDisabledCards);
    };

    // Info: (20241216 - Liz) 監聽滾動事件
    container.addEventListener('scroll', updateDisabledCards);
    window.addEventListener('resize', updateDisabledCards);

    updateDisabledCards(); // Info: (20241216 - Liz) 初始化計算

    // Info: (20241216 - Liz) 回傳清理函式給 useEffect
    return () => {
      container.removeEventListener('scroll', updateDisabledCards);
      window.removeEventListener('resize', updateDisabledCards);
    };
  }, []);

  // Info: (20241216 - Liz) 當選擇公司後，將滾動條重設到最左側
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (selectedAccountBook) {
      container.scrollTo({ left: 0, behavior: 'smooth' });
    }
  }, [selectedAccountBook]);

  return (
    <div ref={containerRef} className="flex max-w-full gap-24px overflow-x-auto px-1px pb-8px">
      {companyAndRoleList.map((companyAndRole, index) => (
        <MyAccountBookItem
          key={companyAndRole.company.id}
          companyAndRole={companyAndRole}
          setAccountBookToSelect={setAccountBookToSelect}
          isDisabled={disabledCards.includes(index)}
          dataIndex={index}
        />
      ))}
    </div>
  );
};

export default MyAccountBookList;
