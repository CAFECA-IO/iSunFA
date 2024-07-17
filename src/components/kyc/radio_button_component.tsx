import React from 'react';
import { useTranslation } from 'react-i18next';

enum DocumentType {
  PASSPORT = 'passport',
  ID_CARD = 'id_card',
  DRIVER_LICENSE = 'driver_license',
}

type RadioOption = {
  label: string;
  value: string;
};

type RadioButtonGroupProps = {
  options: RadioOption[];
  name: string;
  selectedValue: string;
  onChange: (value: string) => void;
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
          <div key={option.value} className="flex items-center space-x-2 text-gray-700">
            <input
              id={id}
              type="radio"
              name={name}
              value={option.value}
              checked={selectedValue === option.value}
              onChange={() => onChange(option.value)}
              className="h-5 w-5 text-blue-600"
            />
            <label htmlFor={id}>{option.label}</label>
          </div>
        );
      })}
    </div>
  );
};

const RadioButtonComponent = ({
  selectedValue,
  onChange,
}: {
  selectedValue: string;
  onChange: (value: string) => void;
}) => {
  const { t } = useTranslation('common');
  const radioOptions: RadioOption[] = [
    { label: t('PASSWORD'), value: DocumentType.PASSPORT },
    { label: t('ID_CARD'), value: DocumentType.ID_CARD },
    { label: t('DRIVER_LICENSE'), value: DocumentType.DRIVER_LICENSE },
  ];
  return (
    <div className="rounded-lg bg-white p-6 shadow-md">
      <h2 className="mb-4 text-center text-lg font-medium text-gray-900">
        What is the type the key company representative’s ID?
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
