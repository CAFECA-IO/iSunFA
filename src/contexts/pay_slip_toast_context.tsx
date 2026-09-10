"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  FC,
  ReactNode,
} from "react";
import { useTranslation } from "@/i18n/i18n_context";
import SuccessNotification from "@/components/common/success_notification";

export interface IPaySlipSentInfo {
  employeeName: string;
  employeeEmail: string;
  /** Info: (20260908 - Julian) 呼叫端已經有的顯示字串（「2026 年 9 月」／月份名） */
  monthLabel: string;
  /**
   * Info: (20260908 - Julian) 這一次是重寄，不是第一次寄出。
   *
   * 只影響標題（「已重新寄出」vs「已寄出」）。內容一樣要帶月份、姓名與信箱 ——
   * 重寄最常見的原因正是「上次寄錯信箱」，那時候使用者最需要看到的
   * 就是這次寄去哪。
   */
  isResend?: boolean;
}

interface IPaySlipToastContext {
  notifySent: (info: IPaySlipSentInfo) => void;
}

const PaySlipToastContext = createContext<IPaySlipToastContext | null>(null);

/**
 * Info: (20260908 - Julian) 薪資單寄出成功的吐司通知。
 *
 * ## 為什麼需要它
 *
 * 實測回饋：第一次寄出成功之後彈窗只是關掉，畫面沒有任何變化 ——
 * 使用者不知道到底寄了沒有。`SendingPaySlipModal` 的成功路徑原本是
 * `onSent?.()` 然後 `modalVisibleHandler()`，兩個動作都不會留下痕跡。
 *
 * ## 為什麼是 context，而不是各自持有一份 state
 *
 * `SendingPaySlipModal` 有**三個呼叫端**（薪資紀錄頁、計算機結果區、
 * 薪資單預覽彈窗），而通知必須活在彈窗**之外** —— 彈窗成功之後就卸載了，
 * 掛在它裡面的吐司會跟著消失。
 *
 * 三個呼叫端各自持有 state 的話就是三份實作（而其中預覽彈窗自己也
 * 嵌在另外兩個裡面，關掉它又會帶走一份）。收成一個 provider 之後
 * **三個呼叫端一行都不用改** —— 通知由彈窗自己在成功那一刻發出，
 * 而它本來就已經拿著姓名、信箱與月份。
 *
 * ## 為什麼用既有的 `SuccessNotification`
 *
 * 這個 repo 沒有吐司套件，但 `components/common/success_notification.tsx`
 * 已經有六個呼叫端在用（傳票、日記帳、ESG、分析、訂單管理）。
 * 另外三處（business_monitor、pdf_editor、account_management）各自手寫了
 * 一份，那是既有的分歧 —— 不要再加第四份。
 */
export const PaySlipToastProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { t } = useTranslation();

  /**
   * Info: (20260908 - Julian) 內容與顯示旗標**分開**存。
   *
   * 關閉時只把 `show` 轉 false，內容留著 —— `SuccessNotification` 有退場動畫，
   * 而把內容一起清掉會讓那 100ms 裡的吐司先變成空白框再滑走。
   */
  const [content, setContent] = useState<IPaySlipSentInfo | null>(null);
  const [show, setShow] = useState<boolean>(false);

  const notifySent = useCallback((info: IPaySlipSentInfo) => {
    setContent(info);
    setShow(true);
  }, []);

  const hide = useCallback(() => setShow(false), []);

  // Info: (20260908 - Julian) `SuccessNotification` 的自動關閉 effect 依賴 onClose，值要穩定
  const value = useMemo<IPaySlipToastContext>(
    () => ({ notifySent }),
    [notifySent],
  );

  return (
    <PaySlipToastContext.Provider value={value}>
      {children}
      <SuccessNotification
        show={show}
        title={
          content?.isResend === true
            ? t("calculator.message.re_send_pay_slip_success_title")
            : t("calculator.message.send_pay_slip_success_title")
        }
        /**
         * Info: (20260908 - Julian) 訊息裡帶**收件信箱**，不只是「已寄出」。
         *
         * 計畫書 §10.2 登記的風險：`SalaryCalculatorEmployee` 不是 `User`、
         * 沒有驗證流程 —— 員工檔上的 email 打錯一個字，薪資單就寄給陌生人，
         * 而系統回報「已寄出」。
         *
         * 寄之前的彈窗已經把信箱放大顯示，但那時候使用者在確認「要不要寄」；
         * 寄完之後再看一次，才是他有機會發現「這不是他的信箱」的時刻 ——
         * 而那時候補救還來得及（改員工檔、重寄）。
         */
        message={
          content === null
            ? ""
            : t("calculator.message.send_pay_slip_success_content", {
                month: content.monthLabel,
                name: content.employeeName,
                email: content.employeeEmail,
              })
        }
        onClose={hide}
      />
    </PaySlipToastContext.Provider>
  );
};

/**
 * Info: (20260908 - Julian) 沒有 provider 就**丟例外**，不靜靜地不通知。
 *
 * 靜默 no-op 會重現這次要修的那個缺陷（寄出成功但畫面沒反應），
 * 而它只會再一次由使用者回報。丟例外的時機是彈窗 render 的那一刻
 * （hook 被呼叫時），不是按下寄出之後 —— 所以第一次打開那個彈窗就會發現，
 * 而不是等到有人真的寄出一封薪資單。
 *
 * 三個呼叫端都在 `SalaryCalculatorShell` 之內（三個 page body 都渲染它），
 * 所以正常路徑上不會走到這裡。
 */
export function usePaySlipToast(): IPaySlipToastContext {
  const context = useContext(PaySlipToastContext);
  if (context === null) {
    throw new Error(
      "usePaySlipToast: 必須在 PaySlipToastProvider（SalaryCalculatorShell）之內使用",
    );
  }
  return context;
}
