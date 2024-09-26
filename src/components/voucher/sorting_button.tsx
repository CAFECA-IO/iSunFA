// Info: (20240924 - tzuhan) To Julian, this component is seperated from your VourchList
// Info: (20240920 - Julian) 排序按鈕
import { SortOrder } from '@/constants/sort';
import { BsFillTriangleFill } from 'react-icons/bs';

const SortingButton = ({
  string,
  sortOrder,
  setSortOrder,
}: {
  string: string;
  sortOrder: null | SortOrder;
  setSortOrder: (sortOrder: null | SortOrder) => void;
}) => {
  // Info: (20240920 - Julian) 初始無排序 -> 點擊後變成 ASC -> 再點擊變成 DESC -> 再點擊變回無排序
  const clickHandler = () => {
    switch (sortOrder) {
      case null:
        setSortOrder(SortOrder.ASC);
        break;
      case SortOrder.ASC:
        setSortOrder(SortOrder.DESC);
        break;
      case SortOrder.DESC:
        setSortOrder(null);
        break;
      default:
        setSortOrder(null);
        break;
    }
  };

  return (
    <button
      id={`sorting-button-${string}`}
      type="button"
      onClick={clickHandler}
      className="flex w-full items-center justify-center gap-4px"
    >
      {/* Info: (20240920 - Julian) 如果有選擇排序，則文字變成橙色 */}
      <p className={sortOrder === null ? '' : 'text-text-brand-primary-lv1'}>{string}</p>
      <div className="flex flex-col gap-px">
        {/* Info: (20240920 - Julian) 向上箭頭：如果為升冪排序，則變成橙色 */}
        <BsFillTriangleFill
          size={8}
          className={
            sortOrder === SortOrder.ASC
              ? 'text-text-brand-primary-lv1'
              : 'text-surface-neutral-mute'
          }
        />
        {/* Info: (20240920 - Julian) 向下箭頭：如果為降冪排序，則變成橙色 */}
        <BsFillTriangleFill
          size={8}
          className={`rotate-180 ${sortOrder === SortOrder.DESC ? 'text-text-brand-primary-lv1' : 'text-surface-neutral-mute'}`}
        />
      </div>
    </button>
  );
};

export default SortingButton;
