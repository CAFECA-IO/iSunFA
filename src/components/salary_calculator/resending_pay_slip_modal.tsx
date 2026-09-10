"use client";

import { FC } from "react";

import { useTranslation } from "@/i18n/i18n_context";
import { AlertTriangle, X } from "lucide-react";
import {
  DELIVERY_FAILURE_I18N_KEY,
  useSalaryPaySlipDelivery,
} from "@/hooks/use_salary_pay_slip_delivery";
import SendingAnimation from "@/components/salary_calculator/sending_animation";
import { usePaySlipToast } from "@/contexts/pay_slip_toast_context";

interface IResendingPaySlipModalProps {
  accountBookId: string;
  /** Info: (20260904 - Julian) 要重寄的是哪一筆薪資紀錄 */
  recordId: string;
  monthName: string;
  /** Info: (20260904 - Julian) 上一次寄到哪 —— 由最近一筆 delivery 提供，不是寫死的文案 */
  sentToName: string;
  /**
   * Info: (20260908 - Julian) 成功吐司要用的員工姓名。
   *
   * 這個彈窗原本不需要它（確認畫面只講「上次寄給誰」），
   * 而吐司要說的是「這次寄給誰」—— 那是姓名 ＋ 信箱。
   */
  employeeName: string;
  modalVisibleHandler: () => void;
  onResent?: () => void;
}

/**
 * Info: (20260904 - Julian) 重新寄送的確認彈窗。
 *
 * ## 上一版做了什麼
 *
 * `console.log("Reset Pay Slip")` + `setTimeout(3000)` 假裝在寄，
 * 然後把成功狀態寫進一個 `useEffect`，裡面掛著一個 ToDo：
 * 「原本的實作依賴 `src/contexts/modal_context`，那個模組已經不存在」。
 * 也就是說重寄從來沒有真的寄過，而畫面會顯示成功。
 *
 * ## 為什麼成功訊息留在同一個彈窗裡
 *
 * 不去重建那個已經不存在的全域 modal context。成功、失敗、進行中都是
 * 這一次操作的三種結果，讓它們留在使用者按下按鈕的那個框裡，
 * 比彈出第二層彈窗少一個要維護的東西 —— 而那正是原本壞掉的地方。
 *
 * ## 重寄是合法的，不需要問資料庫
 *
 * 同一筆薪資紀錄可以有多列 delivery（計畫書 §2.3）。補寄、改了信箱再寄、
 * 對方說沒收到，都是真實情境。這個彈窗問的是「你確定嗎」，不是「可不可以」。
 */
const ResendingPaySlipModal: FC<IResendingPaySlipModalProps> = ({
  accountBookId,
  recordId,
  monthName,
  sentToName,
  employeeName,
  modalVisibleHandler,
  onResent = undefined,
}) => {
  const { t } = useTranslation();
  const { isSending, failure, deliver } =
    useSalaryPaySlipDelivery(accountBookId);
  const { notifySent } = usePaySlipToast();

  const resendPaySlip = async () => {
    const delivered = await deliver(recordId);
    if (!delivered) return;

    /**
     * Info: (20260908 - Julian) 成功改成吐司 ＋ 關窗，不再用彈窗內的成功畫面。
     *
     * ## 為什麼改
     *
     * 20260908 為第一次寄出加了吐司之後，同一個動作在兩條路徑上有兩種回饋。
     * 而實測時撞到的正是這件事：**已經寄過一次的紀錄會走這一條**
     * （`lastSentAt !== null` 的那個分支），於是使用者以為吐司沒有生效。
     *
     * ## 原本的理由已經不成立
     *
     * 那時候寫的是「不去重建那個已經不存在的全域 modal context，
     * 讓成功留在使用者按下按鈕的那個框裡」。現在通知不需要重建任何東西 ——
     * `PaySlipToastProvider` 掛在 `SalaryCalculatorShell` 上，
     * 而吐司比彈窗內的成功畫面多兩件事：它在彈窗關掉之後還在，
     * 而且它說得出**這次寄到哪個信箱**（重寄最常見的原因就是上次寄錯）。
     */
    notifySent({
      employeeName,
      employeeEmail: sentToName,
      monthLabel: monthName,
      isResend: true,
    });

    onResent?.();
    modalVisibleHandler();
  };

  /**
   * Info: (20260908 - Julian) 與寄出彈窗用**同一個**動畫（`SendingAnimation`）。
   *
   * 重寄與第一次寄出是同一件事（同一支端點、同一段等待），
   * 兩邊各用一種載入指示只會讓使用者以為發生了不同的事。
   */
  const loadingContent = (
    <div className="flex flex-1 flex-col items-center justify-center gap-1 py-6">
      <SendingAnimation size={160} />
      <p className="text-card-text-secondary text-sm font-medium">
        {t("calculator.sending_pay_slip_modal.sending")}
      </p>
    </div>
  );

  const confirmContent = (
    <>
      {/* Info: (20250723 - Julian) Modal Content */}
      <div className="text-card-text-secondary px-5 py-2">
        {t("calculator.message.re_send_pay_slip_content_1")}
        <span className="font-bold">
          {t("calculator.message.re_send_pay_slip_content_bold_1", {
            month: monthName,
          })}
        </span>
        {t("calculator.message.re_send_pay_slip_content_2")}
        <span className="font-bold">
          {t("calculator.message.re_send_pay_slip_content_bold_2", {
            name: sentToName,
          })}
        </span>
        {t("calculator.message.re_send_pay_slip_content_3")}
      </div>

      {failure && (
        <div className="mx-5 mb-1 flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2.5 ring-1 ring-rose-200">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-600" />
          <p className="text-sm font-medium text-rose-700">
            {t(DELIVERY_FAILURE_I18N_KEY[failure])}
          </p>
        </div>
      )}

      {/* Info: (20250723 - Julian) Buttons */}
      <div className="grid grid-cols-2 gap-3 px-5 py-4">
        <button
          type="button"
          className="text-text-neutral-secondary ring-stroke-neutral-quaternary hover:bg-surface-hover flex h-11 w-full items-center justify-center rounded-xl text-sm font-semibold ring-1 transition-colors"
          onClick={modalVisibleHandler}
        >
          {t("calculator.message.re_send_pay_slip_cancel_btn")}
        </button>
        <button
          type="button"
          className="flex h-11 w-full items-center justify-center rounded-xl bg-orange-600 text-sm font-bold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          onClick={resendPaySlip}
        >
          {t("calculator.message.re_send_pay_slip_submit_btn")}
        </button>
      </div>
    </>
  );

  /**
   * Info: (20260904 - Julian) 三態的判斷順序：寄送中 → 已成功 → 確認。
   * `sent` 只在真的落地一列之後才有值，所以「顯示成功」與「後端寫了一列」
   * 是同一件事，不是兩個各自為政的旗標（上一版的 `resendSuccess` 是後者）。
   */
  /**
   * Info: (20260908 - Julian) 只有兩種內容了：確認與寄送中。
   *
   * 成功不再是這個彈窗的一種狀態 —— 成功的時候它已經關掉了，
   * 而使用者看到的是吐司（見 `resendPaySlip`）。
   */
  const modalContent = isSending ? loadingContent : confirmContent;

  return (
    <div className="font-barlow fixed inset-0 z-70 flex items-center justify-center bg-black/50">
      <div className="bg-surface-neutral-surface-lv2 relative flex min-h-[200px] w-[90vw] flex-col rounded-2xl md:w-[350px]">
        {/* Info: (20250723 - Julian) Modal Header */}
        <div className="relative flex items-start justify-center px-10 py-4">
          <h2 className="text-card-text-primary text-lg font-bold">
            {t("calculator.message.re_send_pay_slip_title")}
          </h2>
          <button
            type="button"
            onClick={modalVisibleHandler}
            className="absolute right-5"
            aria-label={t("common.close")}
          >
            <X size={24} />
          </button>
        </div>
        {modalContent}
      </div>
    </div>
  );
};

export default ResendingPaySlipModal;
