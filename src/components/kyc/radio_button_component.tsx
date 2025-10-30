import { RepresentativeIDType } from '@/constants/kyc';
import React from 'react';
import { useTranslation } from 'next-i18next';

type RadioOption = {
  label: string;
  value: RepresentativeIDType;
};

type RadioButtonGroupProps = {
  options: RadioOption[];
  name: string;
  selectedValue: RepresentativeIDType;
  onChange: (value: RepresentativeIDType) => void;
};

const RadioButtonGroup: React.FC<RadioButtonGroupProps> = ({
  options,
  name,
  selectedValue,
  onChange,
}) => {
  return (
    <div className="flex justify-center space-x-6">
      {options.map((option, index) => {
        const id = `${name}-${index}`;
        return (
          <label key={id} htmlFor={id} className="inline-flex items-center">
            <input
              id={id}
              type="radio"
              name={name}
              value={option.value}
              checked={selectedValue === option.value}
              onChange={() => onChange(option.value)}
              className="hidden"
            />
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-navy-blue-400 bg-white">
              {selectedValue === option.value && (
                <span className="h-3 w-3 rounded-full bg-navy-blue-400" />
              )}
            </span>
            <span className="ml-2 text-xs text-navy-blue-400 md:text-base">{option.label}</span>
          </label>
        );
      })}
    </div>
  );
};

const RadioButtonComponent = ({
  selectedValue,
  onChange,
}: {
  selectedValue: RepresentativeIDType;
  onChange: (value: RepresentativeIDType) => void;
}) => {
  const { t } = useTranslation(['common', 'kyc']);
  const radioOptions: RadioOption[] = [
    { label: t('kyc:KYC.PASSPORT'), value: RepresentativeIDType.PASSPORT },
    { label: t('kyc:KYC.ID_CARD'), value: RepresentativeIDType.ID_CARD },
    { label: t('kyc:KYC.DRIVER_LICENSE'), value: RepresentativeIDType.DRIVER_LICENSE },
  ];
  return (
    <div className="rounded-lg">
      <h2 className="mb-4 text-center text-lg font-medium text-gray-900">
        {t('kyc:KYC.SELECT_REPRESENTATIVE_ID_TYPE')}
      </h2>
      <RadioButtonGroup
        options={radioOptions}
        name="company_representative_id"
        selectedValue={selectedValue}
        onChange={onChange}
      />
    </div>
  );
};

export default RadioButtonComponent;
