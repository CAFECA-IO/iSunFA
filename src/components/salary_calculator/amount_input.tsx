import React from 'react';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import NumericInput from '@/components/numeric_input/numeric_input';

interface IAmountInputProps {
  title: string;
  value: number;
  setValue: React.Dispatch<React.SetStateAction<number>>;
  required?: boolean;
  minimum?: number;
  maximum?: number;
}

const AmountInput: React.FC<IAmountInputProps> = ({
  title,
  value,
  setValue,
  required,
  minimum,
  maximum,
}) => {
  const { t } = useTranslation('common');

  return (
    <div className="flex flex-col gap-8px">
      <p className="text-sm font-semibold text-input-text-primary">
        {title} {required && <span className="text-text-state-error">*</span>}
      </p>
      <div className="flex h-44px items-center divide-x divide-input-stroke-input rounded-sm border border-input-stroke-input bg-input-surface-input-background">
        <NumericInput
          className="flex-1 bg-transparent px-12px py-10px text-right text-base font-medium text-input-text-input-filled placeholder:text-input-text-input-placeholder"
          value={value}
          setValue={setValue}
          min={minimum ?? 0}
          max={maximum ?? Number.MAX_SAFE_INTEGER}
          isDecimal
          hasComma
          required={required}
        />
        <div className="flex h-full items-center gap-8px px-12px py-10px text-sm font-medium text-input-text-input-placeholder">
          <Image
            src="/currencies/twd.svg"
            width={16}
            height={16}
            alt="TWD"
            className="overflow-hidden rounded-full"
          />
          <p>{t('common:CURRENCY_ALIAS.TWD')}</p>
        </div>
      </div>
    </div>
  );
};

export default AmountInput;
