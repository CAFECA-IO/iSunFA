"use client";

import { FC } from "react";
import { AlertTriangle, Loader2, Lock, Mail, X } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import {
  DELIVERY_FAILURE_I18N_KEY,
  useSalaryPaySlipDelivery,
} from "@/hooks/use_salary_pay_slip_delivery";

interface ISendingPaySlipModalProps {
  accountBookId: string;
  /** Info: (20260904 - Julian) 要寄的是哪一筆薪資紀錄。沒有它就無從寄起（見 §6.1） */
  recordId: string;
  employeeName: string;
  /** Info: (20260904 - Julian) 員工檔上的信箱。空字串＝沒填，這個彈窗不該被打開 */
  employeeEmail: string;
  /** Info: (20260904 - Julian) 已在地化的月份字串，由呼叫端算好 */
  monthLabel: string;
  modalVisibleHandler: () => void;
  onSent?: () => void;
}

/**
 * Info: (20260904 - Julian) 寄出薪資單的確認彈窗。
 *
 * ## 收件信箱是唯讀的
 *
 * 上一版這裡是一個可編輯的輸入框，預填員工檔上的信箱。改成唯讀是計畫書 D3：
 * **這個欄位的來源是員工檔，要改它就去改員工檔。**
 *
 * 允許當場修改的話，薪資單可以被寄到任意地址，而改掉的那一次不會留在員工檔上 ——
 * 事後查不出當初為什麼寄去那裡。（`SalaryPaySlipDelivery` 仍會記下實際收件信箱，
 * 但那答的是「寄到哪」，答不出「誰改的、為什麼」。）
 *
 * 同一個原則也落在後端：這支端點的 body 是空的，前端連送都送不出去。
 * 唯讀只是把那件事講給使用者聽，不是它的執行者。
 *
 * ## 信箱為什麼放大顯示
 *
 * 計畫書 §10.2 登記的風險：`SalaryCalculatorEmployee` 不是 `User`，沒有驗證流程 ——
 * 員工檔上的 email 打錯一個字，薪資單就寄給陌生人，而系統回報「已寄出」。
 * D3 擋掉了「當場改」，擋不掉「本來就打錯」。唯一的緩解是讓按下去之前的
 * 那個畫面把完整信箱看清楚，所以它用等寬字、獨立一行，不是一行小字。
 */
const SendingPaySlipModal: FC<ISendingPaySlipModalProps> = ({
  accountBookId,
  recordId,
  employeeName,
  employeeEmail,
  monthLabel,
  modalVisibleHandler,
  onSent = undefined,
}) => {
  const { t } = useTranslation();
  const { isSending, failure, deliver } =
    useSalaryPaySlipDelivery(accountBookId);

  const hasEmail = employeeEmail.trim() !== "";

  const sendPaySlip = async () => {
    const delivered = await deliver(recordId);
    // Info: (20260904 - Julian) 失敗就留在原地顯示原因，不關掉 —— 關掉等於把錯誤藏起來
    if (!delivered) return;
    onSent?.();
    modalVisibleHandler();
  };

  return (
    <div className="font-barlow fixed inset-0 z-70 flex items-center justify-center bg-black/50">
      <div className="bg-surface-neutral-surface-lv2 relative flex w-[90vw] flex-col rounded-2xl md:w-[420px]">
        {/* Info: (20250723 - Julian) Modal Header */}
        <div className="relative flex items-start justify-center px-10 py-4">
          <h2 className="text-card-text-primary text-lg font-bold">
            {t("calculator.sending_pay_slip_modal.title")}
          </h2>
          <button
            type="button"
            onClick={modalVisibleHandler}
            className="absolute right-5"
            aria-label={t("common.cancel")}
          >
            <X size={24} />
          </button>
        </div>

        {/* Info: (20250723 - Julian) Modal Content */}
        <div className="flex flex-col gap-2.5 px-5 py-2">
          <p className="text-card-text-secondary text-sm font-normal">
            {t("calculator.sending_pay_slip_modal.content_1")}
            <span className="font-semibold">
              {t("calculator.sending_pay_slip_modal.content_bold_1", {
                month: monthLabel,
              })}
            </span>
            {t("calculator.sending_pay_slip_modal.content_2")}
            <span className="font-semibold">
              {t("calculator.sending_pay_slip_modal.content_bold_2", {
                employeeName,
              })}
            </span>
          </p>

          {/**
           * Info: (20260904 - Julian) 收件信箱：唯讀、放大、獨立一行。
           * 這是使用者在按下去之前唯一能發現「這個信箱打錯了」的機會。
           */}
          <div className="border-input-stroke-input bg-input-surface-input-disable flex flex-col gap-1 rounded-lg border px-3 py-2.5">
            <div className="text-input-text-input-placeholder flex items-center gap-2 text-xs font-medium">
              <Mail size={14} />
              <span>{t("calculator.sending_pay_slip_modal.email")}</span>
              <span className="text-text-neutral-tertiary ml-auto flex items-center gap-1">
                <Lock size={12} />
                {t("calculator.sending_pay_slip_modal.email_from_profile")}
              </span>
            </div>
            <p className="text-text-neutral-primary font-mono text-base font-semibold break-all">
              {hasEmail
                ? employeeEmail
                : t("calculator.sending_pay_slip_modal.email_missing")}
            </p>
          </div>

          {/**
           * Info: (20260904 - Julian) 三種失敗的處置完全不同（改員工資料／找管理員／裝字型），
           * 所以訊息也要不同。收斂成一句「請稍後再試」的話，
           * 前兩種的使用者會一直重試一件永遠不會成功的事。
           */}
          {failure && (
            <div className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2.5 ring-1 ring-rose-200">
              <AlertTriangle
                size={16}
                className="mt-0.5 shrink-0 text-rose-600"
              />
              <p className="text-sm font-medium text-rose-700">
                {t(DELIVERY_FAILURE_I18N_KEY[failure])}
              </p>
            </div>
          )}
        </div>

        {/* Info: (20250723 - Julian) Buttons */}
        <div className="grid grid-cols-2 gap-3 px-5 py-4">
          <button
            type="button"
            className="text-text-neutral-secondary ring-stroke-neutral-quaternary hover:bg-surface-hover flex h-11 w-full items-center justify-center rounded-xl text-sm font-semibold ring-1 transition-colors"
            onClick={modalVisibleHandler}
            disabled={isSending}
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-orange-600 text-sm font-bold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            disabled={!hasEmail || isSending}
            onClick={sendPaySlip}
          >
            {isSending
              ? t("calculator.sending_pay_slip_modal.sending")
              : t("calculator.sending_pay_slip_modal.submit")}
            {isSending && <Loader2 size={16} className="animate-spin" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SendingPaySlipModal;
