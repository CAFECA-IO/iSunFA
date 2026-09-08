import { FC } from "react";
import { numberWithCommas } from "@/lib/utils/common";
import { RowItem } from "@/interfaces/salary_calculator";

interface IResultBlockProps {
  backgroundColor: string;
  rowItems: RowItem[];
}

/**
 * Info: (20260907 - Julian) `data-payslip-amount` 是「這一格是數值」的標記。
 *
 * 薪資單上的顯示／隱藏切換靠它：根元素帶上 `data-values-hidden` 之後，
 * `globals.css` 的一條規則會把所有帶這個標記的後代模糊掉。
 *
 * 為什麼用一個屬性 + 一條 CSS，而不是把 `isHidden` 一路傳下來、
 * 在每個元素上掛 `blur-sm`：下載 PNG 時要拿到**沒有模糊**的畫面，
 * 而拔掉根元素上的一個屬性是一次 DOM 操作、確定性的；
 * 逐一改幾十個元素的 class（或改 React state 再等重繪）都不是。
 * 見 `pay_slip_download.ts`。
 */
const ResultBlock: FC<IResultBlockProps> = ({ backgroundColor, rowItems }) => {
  // Info: (20250708 - Julian) 項目總計：取出 rowItems 的最後一個項目
  const totalItem = rowItems.slice(-1)[0];
  const displayTotalRowItem = totalItem && (
    <div className="flex items-center justify-between">
      <p className="text-text-neutral-secondary text-xs">{totalItem.label}</p>
      <p
        data-payslip-amount
        className="text-text-neutral-primary text-lg font-bold"
      >
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
        item.label.includes("率") ||
        item.label.toLocaleLowerCase().includes("ate");

      // Info: (20250722 - Julian) 判斷是否為粗體字
      const isBold =
        item.label.toLocaleLowerCase().includes("total") ||
        item.label.toLocaleLowerCase().includes("總");

      const formattedValue = isPercentage
        ? `${(item.value * 100).toFixed(2)}%`
        : `NT ${numberWithCommas(item.value)}`;

      return (
        <div
          key={item.label}
          className={`flex items-center justify-between ${isBold ? "font-bold" : "font-normal"}`}
        >
          <p>{item.label}:</p>
          <p data-payslip-amount>{formattedValue}</p>
        </div>
      );
    });

  return (
    <div
      className={`flex flex-col rounded-xl p-4 text-gray-700 ${backgroundColor}`}
    >
      {/* Info: (20250708 - Julian) 項目 */}
      <div className="text-text-neutral-secondary flex flex-1 flex-col gap-2.5 text-xs font-medium">
        {displayRowItems}
      </div>
      {/* Info: (20250708 - Julian) 分界線 */}
      <hr className="my-4 border-black/10" />
      {/* Info: (20250708 - Julian) 總計 */}
      {displayTotalRowItem}
    </div>
  );
};

export default ResultBlock;
