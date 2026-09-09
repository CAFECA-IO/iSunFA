import { FC, ReactNode } from "react";

/**
 * Info: (20260909 - Julian) 薪資單上的一格數值 —— 遮住的時候顯示 `***`。
 *
 * ## 為什麼真數字還留在 DOM 裡
 *
 * 最直覺的寫法是 `{isHidden ? "***" : value}`。**那會弄壞下載。**
 *
 * `pay_slip_download.ts` 的作法是「截圖前把根元素上的 `data-values-hidden`
 * 拔掉、`finally` 補回去」—— 它成立的唯一前提就是**真數字永遠在 DOM 裡**，
 * 只是被 CSS 遮著。三元運算式會讓真數字根本沒被 render 出來，
 * 於是拔掉屬性也變不出數字，使用者下載到一張整片星號的薪資單。
 *
 * （20260907 已經踩過同一個形狀的坑一次：當時遮罩是 blur，
 * 而解除遮罩接錯了節點，下載到的是一張整片模糊的薪資單。
 * 那種缺陷不會在畫面上出現 —— 畫面永遠是對的，壞的是存出去的那份檔案，
 * 而使用者多半不會打開它確認，等發現時已經寄出去了。）
 *
 * 所以這裡把兩份都 render 出來，讓 CSS 二選一顯示（見 `globals.css`）：
 * 遮住時真數字是 `display: none`，星號是 `display: inline`；
 * 屬性一拔，兩者立刻對調。**對 `pay_slip_download.ts` 而言什麼都沒變。**
 *
 * ## 為什麼是固定三顆星，不是一位數一顆
 *
 * `*******` 會洩漏位數，也就是洩漏數量級 —— 而「這個人的薪水是六位數還是五位數」
 * 正是旁邊那個人最想知道的那一件事。固定長度什麼都不說。
 *
 * ## 附帶的好處：複製不到
 *
 * 前一版用 `filter: blur()`，模糊過的字反白仍然複製得到原文，
 * 所以還得補一條 `user-select: none`。`display: none` 的文字選不到也複製不到，
 * 那條就不需要了。
 *
 * ## 已知代價
 *
 * 切換時欄寬會變一次（`123,456` 與 `***` 不一樣寬），整張單子會抖一下。
 * 這是 20260909 換掉模糊時明知並接受的取捨，理由寫在 `globals.css` 的規則上。
 */

/** Info: (20260909 - Julian) 遮罩字串。長度固定，與被遮的數字位數無關 */
export const PAY_SLIP_MASK = "***";

interface IMaskedAmountProps {
  /** Info: (20260909 - Julian) 已經格式化好的數值字串（呼叫端負責千分位／百分比） */
  value: string;
  /**
   * Info: (20260909 - Julian) 幣別之類的前綴，放在星號**外面**。
   *
   * 遮住時讀作 `NT $***` 而不是 `***` —— 看得出這一格是一筆金額，
   * 而不是一格沒有資料。
   */
  prefix?: ReactNode;
  className?: string;
}

const MaskedAmount: FC<IMaskedAmountProps> = ({
  value,
  prefix = null,
  className = "",
}) => (
  <span data-payslip-amount className={className}>
    {prefix}
    <span data-payslip-real>{value}</span>
    <span data-payslip-mask>{PAY_SLIP_MASK}</span>
  </span>
);

export default MaskedAmount;
