"use client";

import { FC, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CalendarX } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { ISalaryPeriod } from "@/lib/utils/salary_coverage";
import {
  hasMissingPeriods,
  previewMissingPeriods,
} from "@/lib/utils/salary_employee_filter";

/**
 * Info: (20260907 - Julian) 缺薪資紀錄的標示，與它的提示框。
 *
 * ## 為什麼不用原生 `title`
 *
 * 初版把月份塞進 `title="2026/07、2026/06、…"`。實測回報兩個問題，
 * 兩個都是原生 tooltip 的固有行為，不是調參數能解的：
 *
 * - **出不來**：瀏覽器有自己的延遲與「同一次 hover 只顯示一次」規則，
 *   游標在列與列之間移動時經常整段跳過不顯示。
 * - **讀不動**：`title` 只能是一串純文字，換行由瀏覽器決定，
 *   結果斷在頓號後面 —— 看起來像一句被切斷的話，而不是一份清單。
 *
 * 換成自己畫的 div 之後，月份排成格狀、標題與清單分開、數量說得清楚。
 *
 * ## 為什麼用 portal
 *
 * 整頁版的列表是 `DataTable`：外層是 `overflow-hidden` 的卡片、
 * 裡層是 `overflow-x-auto` 的捲動容器，**兩者都會裁切絕對定位的子元素**，
 * 而最後一列的提示框正好被裁掉。掛到 `document.body` 再以 `fixed` 定位，
 * 就與表格的裁切範圍無關。位置因此得用 JS 算 ——
 * 跨過 portal 邊界之後，`group-hover` 這類 CSS 關係不再成立。
 */

// Info: (20260907 - Julian) 提示框的估高／半寬，只用來決定往上開還是往下開、以及夾在視窗內
const TOOLTIP_ESTIMATED_HEIGHT = 180;
const TOOLTIP_HALF_WIDTH = 150;

interface IAnchor {
  x: number;
  y: number;
  /** Info: (20260907 - Julian) true = 下方空間不足，往上開 */
  above: boolean;
}

const anchorOf = (element: HTMLElement): IAnchor => {
  const rect = element.getBoundingClientRect();
  const above =
    window.innerHeight - rect.bottom < TOOLTIP_ESTIMATED_HEIGHT &&
    rect.top > TOOLTIP_ESTIMATED_HEIGHT;

  /**
   * Info: (20260907 - Julian) 水平夾在視窗內。
   *
   * 整頁版這一欄在表格最左邊，置中對齊的提示框有一半會落在視窗外 ——
   * 而 `fixed` 元素超出左邊界時不會產生捲軸，那半邊就是永久看不到。
   */
  const x = Math.min(
    Math.max(rect.left + rect.width / 2, TOOLTIP_HALF_WIDTH + 8),
    window.innerWidth - TOOLTIP_HALF_WIDTH - 8,
  );

  return { x, y: above ? rect.top - 8 : rect.bottom + 8, above };
};

interface ICoverageAlertProps {
  /** Info: (20260907 - Julian) 缺少的月份，由舊到新（`ISalaryCalculatorEmployee.missingPeriods` 的順序） */
  missingPeriods: readonly ISalaryPeriod[];
  /**
   * Info: (20260907 - Julian) 兩種觸發器樣式。
   *
   * - `icon`：整頁版列首的驚嘆號。使用者由上往下掃名單，「這個人有問題」
   *   要在他讀到姓名之前就看得見；放右邊的話那一格在窄螢幕上會被推到
   *   橫向捲軸外，也就是完全看不到。
   * - `badge`：挑人彈窗裡的「缺 N 個月」。那裡沒有表格也沒有列首，
   *   而且使用者當下就在挑人算薪水 —— 帶著數字的標籤比一個圖示有用。
   */
  display: "icon" | "badge";
}

const CoverageAlert: FC<ICoverageAlertProps> = ({
  missingPeriods,
  display,
}) => {
  const { t } = useTranslation();
  const [anchor, setAnchor] = useState<IAnchor | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  /**
   * Info: (20260907 - Julian) 捲動時收起來。
   *
   * 提示框是 `fixed`，觸發器會跟著列表捲走 —— 不收的話，提示框會留在原地
   * 指著另一個人的那一列。`capture` 是因為捲的是表格自己的容器，
   * 而 scroll 事件不冒泡。
   */
  useEffect(() => {
    if (anchor === null) return undefined;

    const close = () => setAnchor(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);

    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [anchor]);

  if (!hasMissingPeriods({ missingPeriods })) return null;

  const open = () => {
    if (triggerRef.current) setAnchor(anchorOf(triggerRef.current));
  };
  const close = () => setAnchor(null);

  const title = t("calculator.employee_list.missing_records_badge", {
    count: missingPeriods.length,
  });

  /**
   * Info: (20260907 - Julian) 截斷規則走共用的 `previewMissingPeriods`。
   *
   * 在這裡自己 `slice` 一次的話，「另有 N 個月」那一行與格子裡的數量
   * 遲早會對不起來 —— 而那種錯誤沒有人會回頭核對。順序沿用資料本身的
   * 由舊到新，取最舊的幾個：那是既有行為，這次搬家不順手改掉它。
   */
  const { shown, restCount } = previewMissingPeriods(missingPeriods);

  const tooltip = anchor !== null && (
    <div
      role="tooltip"
      style={{
        left: anchor.x,
        top: anchor.y,
        transform: anchor.above
          ? "translate(-50%, -100%)"
          : "translate(-50%, 0)",
      }}
      className="pointer-events-none fixed z-100 w-max max-w-[300px] rounded-xl border border-gray-200 bg-white p-3 shadow-lg"
    >
      <p className="text-xs font-bold text-amber-700">{title}</p>

      {/**
       * Info: (20260907 - Julian) 月份排成兩欄的格子，而不是用頓號串成一句。
       *
       * 原生 `title` 的折行結果是「…2026/03、\n2026/02…」—— 斷在頓號後面，
       * 讀起來像一句被切斷的話。格狀之後每一個月份是一個可以單獨看的項目，
       * 而且對齊，掃過去就知道缺的是不是連續的幾個月。
       */}
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {shown.map((period) => (
          <span
            key={`${period.year}-${period.month}`}
            className="rounded-md bg-amber-50 px-2 py-1 text-center text-xs font-medium text-amber-800"
          >
            {t("calculator.records.pay_period_value", {
              year: period.year,
              month: period.month,
            })}
          </span>
        ))}
      </div>

      {/**
       * Info: (20260907 - Julian) 只列得出一部分的時候要說出來。
       *
       * 缺 32 個月而清單上只有 6 個時，不說的話使用者會以為那 6 個就是全部
       * —— 上面的數字與下面的清單對不起來，而他多半會信清單。
       */}
      {restCount > 0 && (
        <p className="mt-2 text-[11px] text-gray-400">
          {t("calculator.employee_list.missing_records_rest", {
            count: restCount,
          })}
        </p>
      )}
    </div>
  );

  const triggerStyle =
    display === "icon"
      ? "flex size-6 items-center justify-center rounded-md hover:bg-amber-50"
      : "flex shrink-0 items-center gap-[4px] rounded-md bg-amber-50 px-[6px] py-[2px] text-sm font-medium text-amber-600";

  return (
    <>
      {/**
       * Info: (20260907 - Julian) 觸發器是 `<button>` 而不是 `<span>`。
       *
       * 它是這份資訊唯一的入口，而鍵盤使用者到不了一個 span ——
       * `onFocus` 掛在按鈕上才進得了 tab 順序。按下去不做事
       * （提示框是唯一的行為），所以沒有 onClick。
       */}
      <button
        type="button"
        ref={triggerRef}
        aria-label={title}
        onMouseEnter={open}
        onMouseLeave={close}
        onFocus={open}
        onBlur={close}
        className={`cursor-help transition-colors focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none ${triggerStyle}`}
      >
        {display === "icon" ? (
          <AlertTriangle size={18} className="text-amber-500" />
        ) : (
          <>
            <CalendarX size={14} className="shrink-0" />
            {title}
          </>
        )}
      </button>

      {/**
       * Info: (20260907 - Julian) SSR 時沒有 document，`createPortal` 會炸。
       * 這個元件是 `"use client"`，但 Next 仍然會在伺服器上跑一次首次渲染。
       */}
      {typeof document !== "undefined" && tooltip
        ? createPortal(tooltip, document.body)
        : null}
    </>
  );
};

export default CoverageAlert;
