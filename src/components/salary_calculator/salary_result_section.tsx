import React, { useRef, useState } from "react";
import { Download, Send } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import SendingPaySlipModal from "@/components/salary_calculator/sending_pay_slip_modal";
import AuthModal from "@/components/auth/auth_modal";
import PaySlip from "@/components/salary_calculator/pay_slip";
import { useCalculatorCtx } from "@/contexts/calculator_context";
import { useAuth } from "@/contexts/auth_context";
// import html2canvas from 'html2canvas';

const SalaryResultSection: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const {
    employeeName,
    employeeNumber,
    selectedYear,
    selectedMonth,
    salaryCalculatorResult,
  } = useCalculatorCtx();

  const downloadRef = useRef<HTMLDivElement>(null);
  const [isShowLoginModal, setIsShowLoginModal] = useState<boolean>(false);
  const [isShowSendingModal, setIsShowSendingModal] = useState<boolean>(false);

  const toggleShowLoginModal = () => setIsShowLoginModal((prev) => !prev);
  const toggleShowSendingModal = () => setIsShowSendingModal((prev) => !prev);

  const isSignIn = !!user;

  // Info: (20250723 - Julian) 判斷按鈕是否禁用
  const btnDisabled = employeeName === "";

  const showingName = employeeName !== "" ? employeeName : "-";
  // Info: (20250709 - Julian) 格式化日期
  const formattedMonth =
    selectedMonth.name.length > 3
      ? `${selectedMonth.name.slice(0, 3)}.`
      : selectedMonth.name;
  // const formattedDate = `${formattedMonth} ${selectedYear}`;

  // ToDo: (20260224 - Julian) ============ 這裡要實作下載圖片功能
  // Info: (20250710 - Julian) 下載圖片功能
  const downloadPng = () => {
    if (!downloadRef.current) return;

    // html2canvas(downloadRef.current, {
    //   backgroundColor: null,
    //   scale: 2,
    //   onclone: (clonedNode) => {
    //     // Info: (20250710 - Julian) 調整樣式
    //     const frame = clonedNode.querySelector<HTMLIFrameElement>('#payslip-download');
    //     if (frame) {
    //       frame.style.borderRadius = '0px';
    //     }
    //   },
    // }).then((canvas) => {
    //   // Info: (20250710 - Julian) 下載圖片
    //   const link = document.createElement('a');
    //   link.href = canvas.toDataURL('image/png');
    //   link.download = `${employeeName}_${formattedDate}.png`;
    //   document.body.appendChild(link);
    //   link.click();
    //   document.body.removeChild(link);
    // });
  };

  // Info: (20250723 - Julian) 登入才能使用寄出薪資單的功能
  const sendingBtnClickHandler = () => {
    if (isSignIn) {
      toggleShowSendingModal();
    } else {
      toggleShowLoginModal();
    }
  };

  return (
    <>
      <div className="flex flex-col gap-6 tablet:w-fit">
        {/* Info: (20250708 - Julian) Result */}
        <div
          ref={downloadRef}
          className="w-full shrink-0 rounded-lg bg-surface-neutral-surface-lv2 p-6 shadow-Dropshadow_XS tablet:w-[650px]"
        >
          <PaySlip
            employeeName={showingName}
            employeeNumber={employeeNumber}
            selectedMonth={formattedMonth}
            selectedYear={selectedYear}
            resultData={salaryCalculatorResult}
          />
        </div>
        {/* Info: (20250708 - Julian) Buttons */}
        <div className="grid grid-cols-1 gap-6 tablet:grid-cols-2">
          <button type="button" onClick={downloadPng} disabled={btnDisabled}>
            {t("calculator.button.download")} <Download size={20} />
          </button>
          <button
            type="button"
            onClick={sendingBtnClickHandler}
            disabled={btnDisabled}
          >
            {t("calculator.button.send")} <Send size={20} />
          </button>
        </div>
      </div>

      {/* Info: (20250723 - Julian) Login Modal */}
      <AuthModal isOpen={isShowLoginModal} onClose={toggleShowLoginModal} />

      {/* Info: (20250723 - Julian) Sending Pay Slip Modal */}
      {isShowSendingModal && (
        <SendingPaySlipModal modalVisibleHandler={toggleShowSendingModal} />
      )}
    </>
  );
};

export default SalaryResultSection;
