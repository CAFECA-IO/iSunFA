"use client";

import { FC } from "react";

import { useTranslation } from "@/i18n/i18n_context";
import { AlertTriangle, CheckCircle2, Loader2, X } from "lucide-react";
import {
  DELIVERY_FAILURE_I18N_KEY,
  useSalaryPaySlipDelivery,
} from "@/hooks/use_salary_pay_slip_delivery";

interface IResendingPaySlipModalProps {
  accountBookId: string;
  /** Info: (20260904 - Julian) 要重寄的是哪一筆薪資紀錄 */
  recordId: string;
  monthName: string;
  /** Info: (20260904 - Julian) 上一次寄到哪 —— 由最近一筆 delivery 提供，不是寫死的文案 */
  sentToName: string;
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
  modalVisibleHandler,
  onResent = undefined,
}) => {
  const { t } = useTranslation();
  const { isSending, failure, sent, deliver } =
    useSalaryPaySlipDelivery(accountBookId);

  const resendPaySlip = async () => {
    const delivered = await deliver(recordId);
    if (delivered) onResent?.();
  };

  const loadingContent = (
    <div className="flex flex-1 items-center justify-center py-8">
      <Loader2 size={32} className="animate-spin text-orange-600" />
    </div>
  );

  const successContent = (
    <>
      <div className="flex flex-col items-center gap-3 px-5 py-6">
        <CheckCircle2 size={40} className="text-emerald-600" />
        <p className="text-card-text-primary text-base font-bold">
          {t("calculator.message.re_send_pay_slip_success_title")}
        </p>
        <p className="text-card-text-secondary text-center text-sm">
          {t("calculator.message.re_send_pay_slip_success_content")}
        </p>
      </div>
      <div className="px-5 py-4">
        <button
          type="button"
          className="flex h-11 w-full items-center justify-center rounded-xl bg-orange-600 text-sm font-bold text-white transition-colors hover:bg-orange-700"
          onClick={modalVisibleHandler}
        >
          {t("common.close")}
        </button>
      </div>
    </>
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
  let modalContent = confirmContent;
  if (isSending) modalContent = loadingContent;
  else if (sent) modalContent = successContent;

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
