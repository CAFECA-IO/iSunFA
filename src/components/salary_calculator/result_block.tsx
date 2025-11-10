import React from 'react';
import { numberWithCommas } from '@/lib/utils/common';
import { RowItem } from '@/interfaces/calculator';

interface IResultBlockProps {
  backgroundColor: string;
  rowItems: RowItem[];
}

const ResultBlock: React.FC<IResultBlockProps> = ({ backgroundColor, rowItems }) => {
  // Info: (20250708 - Julian) 項目總計：取出 rowItems 的最後一個項目
  const totalItem = rowItems.slice(-1)[0];
  const displayTotalRowItem = totalItem && (
    <div className="flex items-center justify-between">
      <p className="text-xs text-text-neutral-secondary">{totalItem.label}</p>
      <p className="text-lg font-bold text-text-neutral-primary">
        NT ${numberWithCommas(totalItem.value)}
      </p>
    </div>
  );

  // Info: (20250708 - Julian) 顯示 rowItems 的內容
  const displayRowItems = rowItems
    // Info: (20250708 - Julian) 避免重複顯示總計項目
    .filter((item) => item.label !== totalItem.label)
    .map((item) => {
      // Info: (20250708 - Julian) 判斷是否為百分比
      const isPercentage =
        item.label.includes('率') || item.label.toLocaleLowerCase().includes('ate');

      // Info: (20250722 - Julian) 判斷是否為粗體字
      const isBold =
        item.label.toLocaleLowerCase().includes('total') ||
        item.label.toLocaleLowerCase().includes('總');

      const formattedValue = isPercentage
        ? `${(item.value * 100).toFixed(2)}%`
        : `NT ${numberWithCommas(item.value)}`;

      return (
        <div
          key={item.label}
          className={`flex items-center justify-between ${isBold ? 'font-bold' : 'font-normal'}`}
        >
          <p>{item.label}:</p>
          <p>{formattedValue}</p>
        </div>
      );
    });

  return (
    <div className={`flex flex-col rounded-sm p-12px ${backgroundColor}`}>
      {/* Info: (20250708 - Julian) 項目 */}
      <div className="flex flex-1 flex-col gap-12px text-xs font-normal text-text-neutral-secondary">
        {displayRowItems}
      </div>
      {/* Info: (20250708 - Julian) 分界線 */}
      <hr className="my-12px border-divider-stroke-lv-3" />
      {/* Info: (20250708 - Julian) 總計 */}
      {displayTotalRowItem}
    </div>
  );
};

export default ResultBlock;
