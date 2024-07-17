import React, { useState } from 'react';

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

const RadioButtonComponent = () => {
  const [selectedValue, setSelectedValue] = useState<string>('');

  const handleRadioChange = (value: string) => {
    setSelectedValue(value);
  };

  const radioOptions: RadioOption[] = [
    { label: 'Passport', value: 'passport' },
    { label: 'National ID card', value: 'id_card' },
    { label: 'Driving License', value: 'driving_license' },
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
        onChange={handleRadioChange}
      />
    </div>
  );
};

export default RadioButtonComponent;
