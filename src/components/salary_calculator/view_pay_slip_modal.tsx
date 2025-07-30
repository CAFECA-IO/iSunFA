import React, { useRef, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { RxCross2 } from 'react-icons/rx';
import { TbDownload } from 'react-icons/tb';
import { LuSend } from 'react-icons/lu';
import PaySlip from '@/components/salary_calculator/pay_slip';
import ResendingPaySlipModal from '@/components/salary_calculator/resending_pay_slip_modal';
import { Button } from '@/components/button/button';
import { useUserCtx } from '@/contexts/user_context';
import { ISalaryCalculator } from '@/interfaces/calculator';
import { timestampToString } from '@/lib/utils/common';
import html2canvas from 'html2canvas';

interface IViewPaySlipModal {
  monthStr: string;
  yearStr: string;
  paySlipData: ISalaryCalculator;
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
  const { t } = useTranslation(['calculator', 'date_picker']);
  const downloadRef = useRef<HTMLDivElement>(null);

  const [isShowModal, setIsShowModal] = useState<boolean>(false);

  const isSentRecord = !!sentDate && !!sentTo;

  const { username } = useUserCtx();
  const employeeName = username ?? '-';

  const formattedMonth = monthStr.length > 3 ? `${monthStr.slice(0, 3)}.` : monthStr;
  const monthWithI18n = t(`date_picker:DATE_PICKER.${monthStr.toUpperCase().slice(0, 3)}`);

  // Info: (20250725 - Julian) 打開確認用的 Modal
  const resendBtnClickHandler = () => setIsShowModal(true);

  // Info: (20250710 - Julian) 下載圖片功能
  const downloadPng = () => {
    if (!downloadRef.current) return;

    html2canvas(downloadRef.current, {
      backgroundColor: null,
      scale: 2,
      onclone: (clonedNode) => {
        // Info: (20250725 - Julian) 調整樣式
        const frame = clonedNode.querySelector<HTMLIFrameElement>('#download-area');
        if (frame) {
          frame.style.width = '100%';
          frame.style.height = 'auto';
          frame.style.overflowY = 'visible'; // Info: (20250725 - Julian) 取消滾動條
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

  const modalVisibleHandler = () => setIsShowModal((prev) => !prev);

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50 font-barlow">
      <div className="relative flex w-90vw flex-col rounded-sm bg-surface-neutral-surface-lv2 md:w-670px">
        {/* Info: (20250725 - Julian) Modal Header */}
        <div className="relative flex items-start justify-center px-40px py-16px">
          <h2 className="text-lg font-bold text-card-text-primary">
            {isSentRecord
              ? t('calculator:MY_PAY_SLIP.PAY_SLIP')
              : t('calculator:MY_PAY_SLIP.MAIN_TITLE')}
          </h2>
          <button type="button" onClick={modalCloseHandler} className="absolute right-20px">
            <RxCross2 scale={24} />
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
            selectedMonth={monthStr}
            selectedYear={yearStr}
            resultData={paySlipData}
            className="px-40px py-24px"
          />
          {isSentRecord && (
            <div className="flex items-center gap-8px px-40px text-sm">
              <LuSend size={16} className="text-text-neutral-tertiary" />
              <p className="font-medium text-text-neutral-secondary">
                {t('calculator:MY_PAY_SLIP.SENT_ON')}: {timestampToString(sentDate).date}
              </p>
            </div>
          )}
        </div>
        {/* Info: (20250725 - Julian) Button */}
        <div className="flex items-center gap-12px px-20px py-16px">
          {/* Info: (20250725 - Julian) Download Btn */}
          <Button type="button" variant="tertiary" onClick={downloadPng} className="w-full">
            {t('calculator:BUTTON.DOWNLOAD')} <TbDownload size={20} />
          </Button>
          {/* Info: (20250725 - Julian) Resend Btn */}
          {isSentRecord && (
            <Button
              type="button"
              variant="tertiary"
              onClick={resendBtnClickHandler}
              className="w-full"
            >
              {t('calculator:BUTTON.RESEND')} <LuSend size={20} />
            </Button>
          )}
        </div>
      </div>

      {/* Info: (20250725 - Julian) Resend Confirmation Modal */}
      {isShowModal && (
        <ResendingPaySlipModal
          monthName={monthWithI18n}
          sentToName={sentTo ?? '-'}
          modalVisibleHandler={modalVisibleHandler}
        />
      )}
    </div>
  );
};

export default ViewPaySlipModal;
