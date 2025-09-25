import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { IoCheckmarkCircleOutline, IoWarningOutline } from 'react-icons/io5';

interface IReferralCodeInputProps {
  discountHandler: (amount: number) => void;
}

const ReferralCodeInput: React.FC<IReferralCodeInputProps> = ({ discountHandler }) => {
  const { t } = useTranslation(['subscriptions']);

  // Info: (20250924 - Julian) 推薦碼輸入框狀態
  const [referralCodeInput, setReferralCodeInput] = useState<string>('');
  const [isReferralCodeValid, setIsReferralCodeValid] = useState<boolean>(false);

  const changeReferralCodeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setReferralCodeInput(value);

    // ToDo: (20250924 - Julian) 模擬推薦碼驗證
    const validCodes = ['DISCOUNT10', 'SAVE20', 'WELCOME5'];
    const isValid = validCodes.includes(value.toUpperCase());
    discountHandler(isValid ? 199 : 0); // ToDo: (20250924 - Julian) 模擬折扣金額
    setIsReferralCodeValid(isValid);
  };

  const isShowError = referralCodeInput.length > 0 && isReferralCodeValid === false;
  const isShowPass = referralCodeInput.length > 0 && isReferralCodeValid === true;

  const borderStyle = isShowError
    ? 'border-input-stroke-error'
    : isShowPass
      ? 'border-input-stroke-success'
      : 'border-input-stroke-input';

  const inputStyle = isShowError
    ? 'text-input-text-error'
    : isShowPass
      ? 'text-input-text-success'
      : '';

  return (
    <div className="flex items-center justify-between rounded-sm bg-surface-neutral-surface-lv2 px-lv-6 py-lv-4 shadow-Dropshadow_XS">
      <h2 className="text-lg font-semibold text-text-neutral-tertiary">
        {t('subscriptions:PAYMENT_PAGE.REFERRAL_CODE')}
      </h2>
      <div className="flex flex-col items-end gap-8px font-medium">
        <div
          className={`${borderStyle} flex w-200px items-center justify-between rounded-sm border px-12px py-10px`}
        >
          <input
            type="text"
            value={referralCodeInput}
            onChange={changeReferralCodeInput}
            placeholder={t('subscriptions:PAYMENT_PAGE.REFERRAL_CODE_PLACEHOLDER')}
            className={`${inputStyle} w-150px bg-transparent text-base placeholder:text-input-text-input-placeholder`}
          />

          <div className="h-20px w-20px shrink-0">
            {isShowPass && (
              <IoCheckmarkCircleOutline size={20} className="text-icon-surface-success" />
            )}
            {isShowError && <IoWarningOutline size={20} className="text-icon-surface-error" />}
          </div>
        </div>
        {isShowError && (
          <p className="text-sm text-input-text-error">
            {t('subscriptions:PAYMENT_PAGE.MONTHLY_SUBSCRIPTION_ERROR_MESSAGE')}
          </p>
        )}
      </div>
    </div>
  );
};

export default ReferralCodeInput;
