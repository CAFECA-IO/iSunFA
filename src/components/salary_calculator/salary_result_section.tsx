import React, { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Download, /* Send */ } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import SendingPaySlipModal from "@/components/salary_calculator/sending_pay_slip_modal";
import AuthModal from "@/components/auth/auth_modal";
import PaySlip from "@/components/salary_calculator/pay_slip";
import { useCalculatorCtx } from "@/contexts/calculator_context";
// import { useAuth } from "@/contexts/auth_context";

const SalaryResultSection: React.FC = () => {
  const { t } = useTranslation();
  // const { user } = useAuth();

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

  // const isSignIn = !!user;

  // Info: (20250723 - Julian) 判斷按鈕是否禁用
  const btnDisabled = employeeName === "";

  const showingName = employeeName !== "" ? employeeName : "-";
  // Info: (20250709 - Julian) 格式化日期
  const formattedMonth =
    selectedMonth.name.length > 3
      ? `${selectedMonth.name.slice(0, 3)}.`
      : selectedMonth.name;
  const formattedDate = `${formattedMonth}${selectedYear}`;

  // ToDo: (20260224 - Julian) ============ 這裡要實作下載圖片功能
  // Info: (20250710 - Julian) 下載圖片功能
  const downloadPng = () => {
    if (!downloadRef.current) return;

    toPng(downloadRef.current, {
      pixelRatio: 2,
      style: {
        width: '100%',
        height: 'auto',
        overflowY: 'visible', // Info: (20250725 - Julian) 取消滾動條
      },
    })
      .then((dataUrl) => {
        // Info: (20250710 - Julian) 下載圖片
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `${employeeName}_${formattedDate}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      })
      .catch((err) => {
        console.error('oops, something went wrong!', err);
      });
  };

  // Info: (20250723 - Julian) 登入才能使用寄出薪資單的功能
  // const sendingBtnClickHandler = () => {
  //   if (isSignIn) {
  //     toggleShowSendingModal();
  //   } else {
  //     toggleShowLoginModal();
  //   }
  // };

  return (
    <>
      <div className="flex flex-col gap-6 lg:w-fit">
        {/* Info: (20250708 - Julian) Result */}
        <div ref={downloadRef} className="w-full shrink-0 lg:w-[650px]">
          <PaySlip
            employeeName={showingName}
            employeeNumber={employeeNumber}
            selectedMonth={formattedMonth}
            selectedYear={selectedYear}
            resultData={salaryCalculatorResult}
          />
        </div>
        {/* Info: (20250708 - Julian) Buttons */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <button
            type="button"
            onClick={downloadPng}
            disabled={btnDisabled}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-orange-400 bg-white text-sm font-bold text-orange-500 transition-all duration-200 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("calculator.button.download")} <Download size={20} />
          </button>
          {/* ToDo: (20260225 - Julian) 暫時隱藏按鈕 */}
          {/* <button
            type="button"
            onClick={sendingBtnClickHandler}
            disabled={btnDisabled}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-400 text-sm font-bold text-white shadow-md shadow-orange-100 transition-all duration-200 hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
          >
            {t("calculator.button.send")} <Send size={20} />
          </button>
          */}
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
