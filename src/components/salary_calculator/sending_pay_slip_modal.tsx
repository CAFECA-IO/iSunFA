import React, { useState } from 'react';
import { RxCross2 } from 'react-icons/rx';
import { FaRegEnvelope } from 'react-icons/fa6';
import { useTranslation } from 'next-i18next';
import { useCalculatorCtx } from '@/contexts/calculator_context';
import { Button } from '@/components/button/button';

const SendingPaySlipModal: React.FC<{
  modalVisibleHandler: () => void;
}> = ({ modalVisibleHandler }) => {
  const { t } = useTranslation(['calculator', 'common', 'date_picker']);
  const { employeeName, employeeEmail, selectedMonth } = useCalculatorCtx();

  const monthName = selectedMonth.name;
  const monthWithI18n = t(`date_picker:DATE_PICKER.${monthName.toUpperCase().slice(0, 3)}`);

  const [emailInput, setEmailInput] = useState<string>(employeeEmail);
  const [isValidEmail, setIsValidEmail] = useState<boolean>(true);

  const changeEmailInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmailInput(e.target.value);
    // Info: (20250723 - Julian) 驗證電子郵件格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setIsValidEmail(emailRegex.test(e.target.value));
  };

  const sendPaySlip = () => {
    // ToDo: (20250723 - Julian) 實作發送薪資單的邏輯
    // eslint-disable-next-line no-console
    console.log('Sending pay slip to:', emailInput);
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50 font-barlow">
      <div className="relative flex w-90vw flex-col rounded-sm bg-surface-neutral-surface-lv2 md:w-fit">
        {/* Info: (20250723 - Julian) Modal Header */}
        <div className="relative flex items-start justify-center px-40px py-16px">
          <h2 className="text-lg font-bold text-card-text-primary">
            {t('calculator:SENDING_PAY_SLIP_MODAL.TITLE')}
          </h2>
          <button type="button" onClick={modalVisibleHandler} className="absolute right-20px">
            <RxCross2 scale={24} />
          </button>
        </div>
        {/* Info: (20250723 - Julian) Modal Content */}
        <div className="flex flex-col gap-10px px-20px py-8px">
          <p className="text-sm font-normal text-card-text-secondary">
            {t('calculator:SENDING_PAY_SLIP_MODAL.CONTENT_1')}
            <span className="font-semibold">
              {/* Info: (20250723 - Julian) 匯入月份 */}
              {t('calculator:SENDING_PAY_SLIP_MODAL.CONTENT_BOLD_1', { month: monthWithI18n })}
            </span>
            {t('calculator:SENDING_PAY_SLIP_MODAL.CONTENT_2')}
            <span className="font-semibold">
              {/* Info: (20250723 - Julian) 匯入員工姓名 */}
              {t('calculator:SENDING_PAY_SLIP_MODAL.CONTENT_BOLD_2', { employeeName })}
            </span>
          </p>
          <div
            className={`flex items-center divide-x rounded-sm border bg-input-surface-input-background ${isValidEmail ? 'divide-input-stroke-input border-input-stroke-input' : 'divide-input-stroke-error border-input-stroke-error'}`}
          >
            <div className="flex items-center gap-8px px-12px py-10px">
              <FaRegEnvelope
                size={16}
                className={`${isValidEmail ? 'text-icon-surface-single-color-primary' : 'text-text-state-error'}`}
              />
              <p
                className={`font-medium ${isValidEmail ? 'text-input-text-input-placeholder' : 'text-input-text-error'}`}
              >
                {t('calculator:SENDING_PAY_SLIP_MODAL.EMAIL')}
              </p>
            </div>
            <input
              type="text"
              value={emailInput}
              onChange={changeEmailInput}
              placeholder={t('calculator:SENDING_PAY_SLIP_MODAL.EMAIL_PLACEHOLDER')}
              className={`flex-1 bg-transparent px-12px py-10px font-medium ${isValidEmail ? 'placeholder:text-input-text-input-placeholder' : 'text-input-text-error'}`}
            />
          </div>
          {/* Info: (20250723 - Julian) Invalid Email Message */}
          {!isValidEmail && (
            <div className="text-right text-sm font-medium text-text-state-error">
              {t('calculator:SENDING_PAY_SLIP_MODAL.INVALID_EMAIL_HINT')}
            </div>
          )}
        </div>
        {/* Info: (20250723 - Julian) Buttons */}
        <div className="grid grid-cols-2 gap-12px px-20px py-16px">
          <Button
            type="button"
            variant="disabledYellow"
            className="w-full"
            onClick={modalVisibleHandler}
          >
            {t('common:COMMON.CANCEL')}
          </Button>
          <Button
            type="button"
            variant="default"
            className="w-full"
            disabled={!isValidEmail || emailInput.trim() === ''}
            onClick={sendPaySlip}
          >
            {t('calculator:SENDING_PAY_SLIP_MODAL.SUBMIT')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SendingPaySlipModal;
