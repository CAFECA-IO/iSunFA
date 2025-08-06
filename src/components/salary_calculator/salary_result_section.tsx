import React, { useRef, useState } from 'react';
import { TbDownload } from 'react-icons/tb';
import { FiSend } from 'react-icons/fi';
import { useTranslation } from 'next-i18next';
import { Button } from '@/components/button/button';
import SendingPaySlipModal from '@/components/salary_calculator/sending_pay_slip_modal';
import PaySlip from '@/components/salary_calculator/pay_slip';
import LoginModal from '@/components/salary_calculator/login_modal';
import { useCalculatorCtx } from '@/contexts/calculator_context';
import { useUserCtx } from '@/contexts/user_context';
import html2canvas from 'html2canvas';

const SalaryResultSection: React.FC = () => {
  const { t } = useTranslation('calculator');
  const { employeeName, employeeNumber, selectedYear, selectedMonth, salaryCalculatorResult } =
    useCalculatorCtx();

  const downloadRef = useRef<HTMLDivElement>(null);
  const [isShowLoginModal, setIsShowLoginModal] = useState<boolean>(false);
  const [isShowSendingModal, setIsShowSendingModal] = useState<boolean>(false);

  const toggleShowLoginModal = () => setIsShowLoginModal((prev) => !prev);
  const toggleShowSendingModal = () => setIsShowSendingModal((prev) => !prev);

  const { isSignIn } = useUserCtx();

  // Info: (20250723 - Julian) 判斷按鈕是否禁用
  const btnDisabled = employeeName === '';

  const showingName = employeeName !== '' ? employeeName : '-';
  // Info: (20250709 - Julian) 格式化日期
  const formattedMonth =
    selectedMonth.name.length > 3 ? `${selectedMonth.name.slice(0, 3)}.` : selectedMonth.name;
  const formattedDate = `${formattedMonth} ${selectedYear}`;

  // Info: (20250710 - Julian) 下載圖片功能
  const downloadPng = () => {
    if (!downloadRef.current) return;

    html2canvas(downloadRef.current, {
      backgroundColor: null,
      scale: 2,
      onclone: (clonedNode) => {
        // Info: (20250710 - Julian) 調整樣式
        const frame = clonedNode.querySelector<HTMLIFrameElement>('#payslip-download');
        if (frame) {
          frame.style.borderRadius = '0px';
        }
      },
    }).then((canvas) => {
      // Info: (20250710 - Julian) 下載圖片
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `${employeeName}_${formattedDate}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
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
      <div className="flex w-full flex-col gap-24px">
        {/* Info: (20250708 - Julian) Result */}
        <div
          ref={downloadRef}
          className="w-650px shrink-0 gap-12px rounded-lg bg-surface-neutral-surface-lv2 p-24px shadow-Dropshadow_XS"
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
        <div className="grid grid-cols-2 gap-24px">
          <Button type="button" variant="tertiary" onClick={downloadPng} disabled={btnDisabled}>
            {t('calculator:BUTTON.DOWNLOAD')} <TbDownload size={20} />
          </Button>
          <Button
            type="button"
            variant="tertiary"
            onClick={sendingBtnClickHandler}
            disabled={btnDisabled}
          >
            {t('calculator:BUTTON.SEND')} <FiSend size={20} />
          </Button>
        </div>
      </div>

      {/* Info: (20250723 - Julian) Login Modal */}
      {isShowLoginModal && <LoginModal modalVisibleHandler={toggleShowLoginModal} />}

      {/* Info: (20250723 - Julian) Sending Pay Slip Modal */}
      {isShowSendingModal && <SendingPaySlipModal modalVisibleHandler={toggleShowSendingModal} />}
    </>
  );
};

export default SalaryResultSection;
