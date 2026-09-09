import { FC } from "react";
import MaskedAmount from "@/components/salary_calculator/masked_amount";
import { numberWithCommas } from "@/lib/utils/common";
import { RowItem } from "@/interfaces/salary_calculator";

interface IResultBlockProps {
  backgroundColor: string;
  rowItems: RowItem[];
}

/**
 * Info: (20260909 - Julian) 每一格數值都走 `MaskedAmount`，不自己寫遮罩。
 *
 * 顯示／隱藏切換的機制是：根元素帶上 `data-values-hidden` 之後，
 * `globals.css` 的規則會把所有 `data-payslip-real` 換成 `data-payslip-mask`
 * （也就是 `***`）。`MaskedAmount` 是那組屬性唯一的產地。
 *
 * 為什麼用屬性 + CSS，而不是把 `isHidden` 一路傳下來、在每個元素上判斷：
 * 下載 PNG 時要拿到**沒有遮罩**的畫面，而拔掉根元素上的一個屬性是一次
 * 同步、確定的 DOM 操作；改 React state 再等重繪不是。見 `pay_slip_download.ts`。
 *
 * 這也是為什麼真數字要留在 DOM 裡（只是 `display: none`）而不是不 render ——
 * 理由完整寫在 `masked_amount.tsx`。
 */
const ResultBlock: FC<IResultBlockProps> = ({ backgroundColor, rowItems }) => {
  // Info: (20250708 - Julian) 項目總計：取出 rowItems 的最後一個項目
  const totalItem = rowItems.slice(-1)[0];
  const displayTotalRowItem = totalItem && (
    <div className="flex items-center justify-between">
      <p className="text-text-neutral-secondary text-xs">{totalItem.label}</p>
      <MaskedAmount
        prefix="NT $"
        value={numberWithCommas(totalItem.value)}
        className="text-text-neutral-primary text-lg font-bold"
      />
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

      /**
       * Info: (20260909 - Julian) 前綴與數值分開 —— 前綴不進遮罩。
       *
       * 遮住時讀作 `NT ***` 而不是 `***`：看得出這一格是一筆金額，
       * 而不是一格沒有資料。百分比沒有前綴（`12.34%` 整串就是那個值）。
       */
      const valuePrefix = isPercentage ? null : "NT ";
      const formattedValue = isPercentage
        ? `${(item.value * 100).toFixed(2)}%`
        : numberWithCommas(item.value);

      return (
        <div
          key={item.label}
          className={`flex items-center justify-between ${isBold ? "font-bold" : "font-normal"}`}
        >
          <p>{item.label}:</p>
          <MaskedAmount prefix={valuePrefix} value={formattedValue} />
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
