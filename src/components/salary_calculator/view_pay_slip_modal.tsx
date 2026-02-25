import React, { useRef, useState } from "react";
import { useTranslation } from "@/i18n/i18n_context";
import { X, Download, Send } from "lucide-react";
import PaySlip from "@/components/salary_calculator/pay_slip";
import ResendingPaySlipModal from "@/components/salary_calculator/resending_pay_slip_modal";
import { useAuth } from "@/contexts/auth_context";
import { ISalaryCalculatorUI } from "@/interfaces/salary_calculator";
import { timestampToString } from "@/lib/utils/common";
// import html2canvas from 'html2canvas';

interface IViewPaySlipModal {
  monthStr: string;
  yearStr: string;
  paySlipData: ISalaryCalculatorUI;
  modalCloseHandler: () => void;
  sentDate?: number; // Info: (20250725 - Julian) 用於判斷是否為已發送的薪資單
  sentTo?: string; // Info: (20250725 - Julian) 發送對象
}

const ViewPaySlipModal: React.FC<IViewPaySlipModal> = ({
  monthStr,
  yearStr,
  paySlipData,
  modalCloseHandler,
  sentDate,
  sentTo,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const downloadRef = useRef<HTMLDivElement>(null);

  const [isShowModal, setIsShowModal] = useState<boolean>(false);

  const isSentRecord = !!sentDate && !!sentTo;

  const username = user?.name;
  const employeeName = username ?? "-";
  const employeeNumber = "123456"; // ToDo: (20250806 - Julian) 取得員工編號

  // const formattedMonth = monthStr.length > 3 ? `${monthStr.slice(0, 3)}.` : monthStr;
  const monthWithI18n = t(
    `date.month_name.${monthStr.toLowerCase().slice(0, 3)}`,
  );

  // Info: (20250725 - Julian) 打開確認用的 Modal
  const resendBtnClickHandler = () => setIsShowModal(true);

  // Info: (20250710 - Julian) 下載圖片功能
  const downloadPng = () => {
    if (!downloadRef.current) return;

    // ToDo: (20260224 - Julian) ================== 實作下載圖片功能
    // html2canvas(downloadRef.current, {
    //   backgroundColor: null,
    //   scale: 2,
    //   onclone: (clonedNode) => {
    //     // Info: (20250725 - Julian) 調整樣式
    //     const frame = clonedNode.querySelector<HTMLIFrameElement>('#download-area');
    //     if (frame) {
    //       frame.style.width = '100%';
    //       frame.style.height = 'auto';
    //       frame.style.overflowY = 'visible'; // Info: (20250725 - Julian) 取消滾動條
    //     }
    //   },
    // }).then((canvas) => {
    //   // Info: (20250710 - Julian) 下載圖片
    //   const link = document.createElement('a');
    //   link.href = canvas.toDataURL('image/png');
    //   link.download = `${employeeName}_${formattedMonth}_${yearStr}.png`;
    //   document.body.appendChild(link);
    //   link.click();
    //   document.body.removeChild(link);
    // });
  };

  const modalVisibleHandler = () => setIsShowModal((prev) => !prev);

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50 font-barlow">
      <div className="relative flex w-90vw flex-col rounded-sm bg-surface-neutral-surface-lv2 md:w-670px">
        {/* Info: (20250725 - Julian) Modal Header */}
        <div className="relative flex items-start justify-center px-40px py-16px">
          <h2 className="text-lg font-bold text-card-text-primary">
            {isSentRecord
              ? t("calculator.my_pay_slip.pay_slip")
              : t("calculator.my_pay_slip.main_title")}
          </h2>
          <button
            type="button"
            onClick={modalCloseHandler}
            className="absolute right-20px"
          >
            <X size={24} />
          </button>
        </div>
        {/* Info: (20250725 - Julian) Modal Body */}
        <div
          id="download-area"
          ref={downloadRef}
          className="flex h-600px w-full flex-col overflow-y-auto"
        >
          <PaySlip
            employeeName={employeeName}
            employeeNumber={employeeNumber}
            selectedMonth={monthStr}
            selectedYear={yearStr}
            resultData={paySlipData}
            className="px-40px py-24px"
          />
          {isSentRecord && (
            <div className="flex items-center gap-8px px-40px text-sm">
              <Send size={16} className="text-text-neutral-tertiary" />
              <p className="font-medium text-text-neutral-secondary">
                {t("calculator.my_pay_slip.sent_on")}:{" "}
                {timestampToString(sentDate).dateWithDash}
              </p>
            </div>
          )}
        </div>
        {/* Info: (20250725 - Julian) Button */}
        <div className="flex items-center gap-12px px-20px py-16px">
          {/* Info: (20250725 - Julian) Download Btn */}
          <button type="button" onClick={downloadPng} className="w-full">
            {t("calculator.button.download")} <Download size={20} />
          </button>
          {/* Info: (20250725 - Julian) Resend Btn */}
          {isSentRecord && (
            <button
              type="button"
              onClick={resendBtnClickHandler}
              className="w-full"
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
