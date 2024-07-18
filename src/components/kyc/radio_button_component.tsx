import { RepresentativeIDType } from '@/interfaces/kyc_document_type';
import React from 'react';
import { useTranslation } from 'react-i18next';

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
          <label htmlFor={id} className="inline-flex items-center">
            <input
              id={id}
              type="radio"
              name={name}
              value={option.value}
              checked={selectedValue === option.value}
              onChange={() => onChange(option.value)}
              className="hidden"
            />
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full border-2 border-navy-blue-400 ${
                selectedValue === option.value ? 'bg-navy-blue-400' : ''
              }`}
            >
              {selectedValue === option.value && (
                <span className="h-2.5 w-2.5 rounded-full bg-white" />
              )}
            </span>
            <span className="ml-2 text-navy-blue-400">{option.label}</span>
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
  const { t } = useTranslation('common');
  const radioOptions: RadioOption[] = [
    { label: t('KYC.PASSPORT'), value: RepresentativeIDType.PASSPORT },
    { label: t('KYC.ID_CARD'), value: RepresentativeIDType.ID_CARD },
    { label: t('KYC.DRIVER_LICENSE'), value: RepresentativeIDType.DRIVER_LICENSE },
  ];
  return (
    <div className="rounded-lg">
      <h2 className="mb-4 text-center text-lg font-medium text-gray-900">
        {t('KYC.SELECT_REPRESENTATIVE_ID_TYPE')}
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
