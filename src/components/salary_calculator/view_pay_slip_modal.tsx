"use client";

import { useRef, useState, FC } from "react";

import { useTranslation } from "@/i18n/i18n_context";
import { X, Download, Send } from "lucide-react";
import PaySlip from "@/components/salary_calculator/pay_slip";
import ResendingPaySlipModal from "@/components/salary_calculator/resending_pay_slip_modal";
import SendingPaySlipModal from "@/components/salary_calculator/sending_pay_slip_modal";
import { useSalaryRecordDeliveries } from "@/hooks/use_salary_pay_slip_delivery";
import { useAuth } from "@/contexts/auth_context";
import { ISalaryCalculatorUI } from "@/interfaces/salary_calculator";
import { timestampToString } from "@/lib/utils/common";
import { downloadNodeAsPng } from "@/lib/utils/pay_slip_download";

interface IViewPaySlipModal {
  monthStr: string;
  yearStr: string;
  paySlipData: ISalaryCalculatorUI;
  modalCloseHandler: () => void;
  sentDate?: number; // Info: (20250725 - Julian) 用於判斷是否為已發送的薪資單
  sentTo?: string; // Info: (20250725 - Julian) 發送對象
  /**
   * Info: (20260831 - Julian) 這張薪資單是誰的。
   *
   * 不給就沿用舊行為（顯示登入者），那是「我的薪資單」頁的情境。
   * 薪資紀錄頁看的是別人的單子，必須把名字與編號傳進來 ——
   * 原本編號寫死 `"123456"`（ToDo 掛在那裡），順手一併解決。
   */
  employeeName?: string;
  employeeNumber?: string;
  /**
   * Info: (20260904 - Julian) 重寄需要的兩個東西。**兩個都給了才會出現重寄按鈕。**
   *
   * 「我收到的薪資單」分頁看的是別人寄來的單子，那裡沒有 `recordId`
   * 也不該有重寄的能力 —— 它不是這本帳的擁有者。用兩個可選 prop 而不是一個
   * `canResend` 布林：能不能重寄不是一個獨立的判斷，
   * 而是「有沒有東西可以拿去重寄」的直接結果。
   */
  accountBookId?: string;
  recordId?: string;
  onResent?: () => void;
  /**
   * Info: (20260904 - Julian) 收件信箱，**只有「還沒寄過」那條路用得到**
   * （重寄不需要它：收件人由伺服器從薪資紀錄推導，前端指定不了）。
   *
   * 呼叫端算好再傳進來，因為它不在薪資紀錄裡 —— `ISalaryRecordDetail.employee`
   * 只有 id / name / number，email 在員工名單那一份資料。
   */
  employeeEmail?: string;
  /**
   * Info: (20260904 - Julian) 為什麼寄不出去（i18n key）。給了就停用寄送按鈕並顯示它。
   *
   * 由呼叫端判斷而不是這裡：兩個成因都只有呼叫端知道 ——
   * 「員工沒填信箱」與「員工已從名單移除」（軟刪之後薪資紀錄仍在，
   * 但伺服器的 `getActiveEmployeeById` 會過濾掉 `deletedAt`，寄送必然回 404）。
   * 兩者的下一步完全不同：一個是去補信箱，一個是那個人已經不在了。
   */
  sendBlockedReason?: string;
}

const ViewPaySlipModal: FC<IViewPaySlipModal> = ({
  monthStr,
  yearStr,
  paySlipData,
  modalCloseHandler,
  sentDate = undefined,
  sentTo = undefined,
  employeeName = undefined,
  employeeNumber = undefined,
  accountBookId = undefined,
  recordId = undefined,
  onResent = undefined,
  employeeEmail = undefined,
  sendBlockedReason = undefined,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const downloadRef = useRef<HTMLDivElement>(null);

  const [isShowSendModal, setIsShowSendModal] = useState<boolean>(false);

  /**
   * Info: (20260904 - Julian) 有沒有能力寄，取決於拿不拿得到 `recordId`。
   *
   * 上一版只看 `sentDate && sentTo` —— 那兩個是**顯示用**的資料，
   * 有它們不代表這個畫面有能力去呼叫寄送 API。假資料時代看不出差別
   * （反正按下去只是 `console.log`），接上真 API 之後就是一顆
   * 按下去必然失敗的按鈕。「我收到的薪資單」分頁正是這種情況。
   */
  const canSend = !!accountBookId && !!recordId;

  /**
   * Info: (20260904 - Julian) 這一筆寄過沒有 —— **問伺服器，不看 props。**
   *
   * 按鈕要寫「寄出」還是「重新寄送」由它決定。同事可能十分鐘前才剛寄過，
   * 而呼叫端手上的清單是更早以前抓的。薪資紀錄頁尤其如此：
   * 那一頁根本不知道任何一筆寄過沒有。
   */
  const { lastSent, isLoading: isLoadingHistory } = useSalaryRecordDeliveries(
    canSend ? (accountBookId ?? null) : null,
    canSend ? (recordId ?? null) : null,
  );

  // Info: (20260904 - Julian) 表頭那行「寄出於 X」：自己查到的優先，其次才是呼叫端傳的
  const sentAt = lastSent?.createdAt ?? sentDate;
  const isSentRecord = !!sentAt && canSend;

  const displayedEmployeeName = employeeName ?? user?.name ?? "-";
  const displayedEmployeeNumber = employeeNumber ?? "-";

  const monthWithI18n = t(
    `date.month_name.${monthStr.toLowerCase().slice(0, 3)}`,
  );

  // Info: (20250725 - Julian) 打開確認用的 Modal
  const sendBtnClickHandler = () => setIsShowSendModal(true);

  // Info: (20250710 - Julian) 下載圖片功能
  const downloadPng = () => {
    if (!downloadRef.current) return;

    /**
     * Info: (20260901 - Julian) 檔名用畫面上顯示的名字。
     *
     * 原本是 `employeeName`（可選的 prop），從薪資紀錄開啟時有值，
     * 但「我的薪資單」不傳它 —— 那條路徑會存成 `undefined_Aug._2026.png`。
     */
    downloadNodeAsPng(
      downloadRef.current,
      `${displayedEmployeeName}_${monthWithI18n}_${yearStr}.png`,
    ).catch((err) => {
      console.error("oops, something went wrong!", err);
    });
  };

  const modalVisibleHandler = () => setIsShowSendModal((prev) => !prev);

  return (
    <div className="font-barlow fixed inset-0 z-70 flex items-center justify-center bg-black/50 p-[16px]">
      <div className="bg-surface-neutral-surface-lv2 relative flex max-h-[80vh] w-[90vw] flex-col rounded-2xl md:w-[670px]">
        {/* Info: (20250725 - Julian) Modal Header */}
        <div className="relative flex shrink-0 items-start justify-center px-[40px] py-[16px]">
          <h2 className="text-card-text-primary text-lg font-bold">
            {isSentRecord
              ? t("calculator.my_pay_slip.pay_slip")
              : t("calculator.my_pay_slip.main_title")}
          </h2>
          <button
            type="button"
            onClick={modalCloseHandler}
            className="absolute right-[20px]"
          >
            <X size={24} />
          </button>
        </div>
        {/* Info: (20250725 - Julian) Modal Body */}
        {/**
         * Info: (20260901 - Julian) 子元素一律 `shrink-0`。
         *
         * 這一格是 flex 欄，子項預設 `flex-shrink: 1`；而 `PaySlip` 的根元素自己帶著
         * `overflow-hidden`，於是自動最小尺寸不生效 ——
         * 它會被壓縮成容器的高度，再用自己的 overflow 把超出的部分裁掉。
         * 結果是 scrollHeight 等於 clientHeight：畫面看起來被切一半，卻捲不動。
         */}
        <div
          id="download-area"
          ref={downloadRef}
          className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto"
        >
          <PaySlip
            employeeName={displayedEmployeeName}
            employeeNumber={displayedEmployeeNumber}
            selectedMonth={monthStr}
            selectedYear={yearStr}
            resultData={paySlipData}
            variant="plain"
            className="shrink-0 px-[40px] py-[24px]"
          />
          {isSentRecord && (
            <div className="flex shrink-0 items-center gap-[8px] px-[40px] text-sm">
              <Send size={16} className="text-text-neutral-tertiary" />
              <p className="text-text-neutral-secondary font-medium">
                {t("calculator.my_pay_slip.sent_on")}:{" "}
                {timestampToString(sentAt).dateWithDash}
              </p>
            </div>
          )}
        </div>
        {/**
         * Info: (20260901 - Julian) 圖示按鈕的容器一定要是 flex。
         *
         * Tailwind preflight 把 `svg` 設成 `display: block`，所以在非 flex 的按鈕裡，
         * 圖示會自成一行靠左貼齊、文字置中在上面。本模組的按鈕樣式統一取自
         * `salary_result_section.tsx` 的那兩顆。
         */}
        <div className="flex shrink-0 items-center gap-[12px] px-[20px] py-[16px]">
          {/* Info: (20250725 - Julian) Download Btn */}
          <button
            type="button"
            onClick={downloadPng}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-600 text-sm font-bold text-white transition-colors hover:bg-orange-700"
          >
            {t("calculator.button.download")} <Download size={20} />
          </button>
          {/**
           * Info: (20260904 - Julian) 一顆按鈕，兩種字。
           *
           * 寄過的寫「重新寄送」並走確認彈窗；沒寄過的寫「寄出薪資單」。
           * 分成兩顆按鈕的話，其中一顆永遠是停用的 —— 而停用的按鈕
           * 使用者得先讀懂才知道不用理它。
           *
           * 只有「還沒寄過」那條路會被 `sendBlockedReason` 擋下：重寄不需要
           * 收件信箱（伺服器自己推導），也不受員工被移除影響 —— 那時它本來就會 404，
           * 而畫面已經有一次成功寄送的紀錄可以顯示。
           */}
          {canSend && (
            <button
              type="button"
              onClick={sendBtnClickHandler}
              disabled={
                isLoadingHistory ||
                (!lastSent && sendBlockedReason !== undefined)
              }
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-bold text-orange-600 ring-1 ring-orange-600 transition-colors hover:bg-orange-50 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:ring-0"
            >
              {lastSent
                ? t("calculator.button.re_send")
                : t("calculator.button.send")}
              <Send size={20} />
            </button>
          )}
        </div>

        {/* Info: (20260904 - Julian) 停用的按鈕一定要說得出為什麼（計畫書 §6.2） */}
        {canSend && !lastSent && sendBlockedReason !== undefined && (
          <p className="text-text-neutral-tertiary shrink-0 px-[20px] pb-[16px] text-xs">
            {t(sendBlockedReason)}
          </p>
        )}
      </div>

      {/**
       * Info: (20260904 - Julian) 寄過的走重寄確認，沒寄過的走寄出確認。
       *
       * 重寄那一支的文案是「您已經將 X 月的薪資單寄送給 Y 了，是否要重新寄送？」——
       * `Y` 取自**最近一次成功寄送**當時的收件信箱，其次才是呼叫端傳進來的
       * （「已寄出」分頁點的是特定一列，那一列的信箱就是它要顯示的）。
       * 兩者都拿不到時不顯示這個彈窗，而不是顯示一個「寄送給 -」的句子。
       */}
      {isShowSendModal && accountBookId && recordId && lastSent && (
        <ResendingPaySlipModal
          accountBookId={accountBookId}
          recordId={recordId}
          monthName={monthWithI18n}
          sentToName={sentTo ?? lastSent.recipientEmail}
          modalVisibleHandler={modalVisibleHandler}
          onResent={onResent}
        />
      )}

      {isShowSendModal && accountBookId && recordId && !lastSent && (
        <SendingPaySlipModal
          accountBookId={accountBookId}
          recordId={recordId}
          employeeName={displayedEmployeeName}
          employeeEmail={employeeEmail ?? ""}
          monthLabel={monthWithI18n}
          modalVisibleHandler={modalVisibleHandler}
          onSent={onResent}
        />
      )}
    </div>
  );
};

export default ViewPaySlipModal;
