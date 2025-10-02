import React, { useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { IoCheckmarkCircleOutline, IoWarningOutline } from 'react-icons/io5';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { IDiscount } from '@/interfaces/discount';

interface IReferralCodeInputProps {
  discountHandler: (discount: IDiscount) => void;
}

const ReferralCodeInput: React.FC<IReferralCodeInputProps> = ({ discountHandler }) => {
  const { t } = useTranslation(['subscriptions']);

  // Info: (20250924 - Julian) 推薦碼輸入框狀態
  const [referralCodeInput, setReferralCodeInput] = useState<string>('');
  const [isReferralCodeValid, setIsReferralCodeValid] = useState<boolean>(false);
  // Info: (20251002 - Julian) 用來呼叫 API 的值
  const [debouncedCode, setDebouncedCode] = useState<string>('');

  const { trigger: getReferralCode } = APIHandler<{
    userId: number;
    code: string;
    discountPercentage: number;
    discountAmount: number;
  }>(APIName.GET_REFERRAL_CODE);

  const verifyReferralCode = async (code: string) => {
    try {
      const response = await getReferralCode({ params: { code } });
      if (response && response.success && response.data && response.data.userId !== 0) {
        const discount = {
          discountAmount: response.data.discountAmount,
          discountPercentage: response.data.discountPercentage,
        };
        discountHandler(discount);
        setIsReferralCodeValid(true);
      } else {
        discountHandler({ discountAmount: 0, discountPercentage: 0 });
        setIsReferralCodeValid(false);
      }
    } catch (error) {
      discountHandler({ discountAmount: 0, discountPercentage: 0 });
      setIsReferralCodeValid(false);
    }
  };

  useEffect(() => {
    // Info: (20251002 - Julian) 延遲 500ms 後再更新
    const handler = setTimeout(() => {
      setDebouncedCode(referralCodeInput);
    }, 500);

    return () => {
      clearTimeout(handler); // Info: (20251002 - Julian) 清除計時器
    };
  }, [referralCodeInput]);

  useEffect(() => {
    if (debouncedCode !== '') {
      // Info: (20251002 - Julian) 轉成大寫後再呼叫 API
      const upperValue = debouncedCode.toUpperCase();
      verifyReferralCode(upperValue);
    } else {
      // Info: (20251002 - Julian) 如果輸入框是空的，重置狀態
      discountHandler({ discountAmount: 0, discountPercentage: 0 });
      setIsReferralCodeValid(false);
    }
  }, [debouncedCode]);

  const changeReferralCodeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setReferralCodeInput(e.target.value);
  };

  const isShowError = referralCodeInput !== '' && isReferralCodeValid === false;
  const isShowPass = referralCodeInput !== '' && isReferralCodeValid === true;

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
