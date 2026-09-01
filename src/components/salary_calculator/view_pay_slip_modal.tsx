"use client";

import { useRef, useState, FC } from "react";

import { useTranslation } from "@/i18n/i18n_context";
import { X, Download, Send } from "lucide-react";
import PaySlip from "@/components/salary_calculator/pay_slip";
import ResendingPaySlipModal from "@/components/salary_calculator/resending_pay_slip_modal";
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
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const downloadRef = useRef<HTMLDivElement>(null);

  const [isShowModal, setIsShowModal] = useState<boolean>(false);

  const isSentRecord = !!sentDate && !!sentTo;

  const displayedEmployeeName = employeeName ?? user?.name ?? "-";
  const displayedEmployeeNumber = employeeNumber ?? "-";

  // const formattedMonth = monthStr.length > 3 ? `${monthStr.slice(0, 3)}.` : monthStr;
  const monthWithI18n = t(
    `date.month_name.${monthStr.toLowerCase().slice(0, 3)}`,
  );

  // Info: (20250725 - Julian) 打開確認用的 Modal
  const resendBtnClickHandler = () => setIsShowModal(true);

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

  const modalVisibleHandler = () => setIsShowModal((prev) => !prev);

  return (
    <div className="font-barlow fixed inset-0 z-70 flex items-center justify-center bg-black/50 p-[16px]">
      {/**
       * Info: (20260901 - Julian) `max-h-[90vh]` + 內層 `flex-1 min-h-0` 取代原本寫死的
       * `h-[600px]`：寫死高度在視窗比 Modal 矮的時候會讓整張卡片溢出畫面，
       * 而外層是 `fixed inset-0`，頁面本身不會捲，於是溢出的部分永遠看不到。
       */}
      <div className="bg-surface-neutral-surface-lv2 relative flex max-h-[90vh] w-[90vw] flex-col rounded-2xl md:w-[670px]">
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
         * 這一格是 flex 欄，子項預設 `flex-shrink: 1`；而 PaySlip 自己帶著
         * `overflow-hidden`（pay_slip.tsx:231），於是自動最小尺寸不生效 ——
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
            className="shrink-0 px-[40px] py-[24px]"
          />
          {isSentRecord && (
            <div className="flex shrink-0 items-center gap-[8px] px-[40px] text-sm">
              <Send size={16} className="text-text-neutral-tertiary" />
              <p className="text-text-neutral-secondary font-medium">
                {t("calculator.my_pay_slip.sent_on")}:{" "}
                {timestampToString(sentDate).dateWithDash}
              </p>
            </div>
          )}
        </div>
        {/**
         * Info: (20260901 - Julian) 這兩顆按鈕原本只有 `w-full`，沒有任何樣式。
         *
         * Tailwind 的 preflight 把 `svg` 設成 `display: block`，所以圖示會自成一行
         * 靠左貼齊，文字則置中在上面 —— 那就是截圖裡看到的破版。
         * 樣式取自 `salary_result_section.tsx` 的兩顆主要按鈕，維持同一套詞彙。
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
          {/* Info: (20250725 - Julian) Resend Btn */}
          {isSentRecord && (
            <button
              type="button"
              onClick={resendBtnClickHandler}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-bold text-orange-600 ring-1 ring-orange-600 transition-colors hover:bg-orange-50"
            >
              {t("calculator.button.re_send")} <Send size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Info: (20250725 - Julian) Resend Confirmation Modal */}
      {isShowModal && (
        <ResendingPaySlipModal
          monthName={monthWithI18n}
          sentToName={sentTo ?? "-"}
          modalVisibleHandler={modalVisibleHandler}
        />
      )}
    </div>
  );
};

export default ViewPaySlipModal;
