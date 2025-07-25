import React, { useRef } from 'react';
import { useTranslation } from 'next-i18next';
import { RxCross2 } from 'react-icons/rx';
import { TbDownload } from 'react-icons/tb';
import PaySlip from '@/components/salary_calculator/pay_slip';
import { Button } from '@/components/button/button';
import { useUserCtx } from '@/contexts/user_context';
import { ISalaryCalculator } from '@/interfaces/calculator';
import html2canvas from 'html2canvas';

interface IViewMyPaySlipModal {
  monthStr: string;
  yearStr: string;
  paySlipData: ISalaryCalculator;
  modalCloseHandler: () => void;
}

const ViewMyPaySlipModal: React.FC<IViewMyPaySlipModal> = ({
  monthStr,
  yearStr,
  paySlipData,
  modalCloseHandler,
}) => {
  const { t } = useTranslation('calculator');
  const downloadRef = useRef<HTMLDivElement>(null);

  const { username } = useUserCtx();
  const employeeName = username ?? '-';
  const formattedMonth = monthStr.length > 3 ? `${monthStr.slice(0, 3)}.` : monthStr;

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
      link.download = `${employeeName}_${formattedMonth}_${yearStr}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50 font-barlow">
      <div className="relative flex w-90vw flex-col rounded-sm bg-surface-neutral-surface-lv2 md:w-670px">
        {/* Info: (20250715 - Julian) Modal Header */}
        <div className="relative flex items-start justify-center px-40px py-16px">
          <h2 className="text-lg font-bold text-card-text-primary">
            {t('calculator:MY_PAY_SLIP.MAIN_TITLE')}
          </h2>
          <button type="button" onClick={modalCloseHandler} className="absolute right-20px">
            <RxCross2 scale={24} />
          </button>
        </div>
        {/* Info: (20250725 - Julian) Modal Body */}
        <div ref={downloadRef} className="h-600px w-full overflow-y-auto">
          <PaySlip
            employeeName={employeeName}
            selectedMonth={monthStr}
            selectedYear={yearStr}
            resultData={paySlipData}
            className="px-40px py-24px"
          />
        </div>
        {/* Info: (20250725 - Julian) Button */}
        <div className="px-20px py-16px">
          <Button type="button" variant="tertiary" onClick={downloadPng} className="w-full">
            {t('calculator:BUTTON.DOWNLOAD')} <TbDownload size={20} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ViewMyPaySlipModal;
