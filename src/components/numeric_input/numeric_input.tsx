import React, { useState, useEffect } from 'react';

interface INumericInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: number;
  setValue: React.Dispatch<React.SetStateAction<number>>;
  isDecimal?: boolean;
}

const NumericInput = ({ value, setValue, isDecimal, ...props }: INumericInputProps) => {
  const [valueStr, setValueStr] = useState<string>(value.toString());

  useEffect(() => {
    setValueStr(value.toString());
  }, [value]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value;

    // Info: (20240710 - Julian) 移除開頭零和所有小數點以外的非數字字符
    const sanitizedValue = inputValue.replace(/^0+/, '').replace(/[^0-9.]/g, '');
    setValueStr(sanitizedValue);

    // Info: (20240710 - Julian) 回傳 number 類型的值
    const numValue = isDecimal ? parseFloat(sanitizedValue) : parseInt(sanitizedValue, 10);
    setValue(numValue);
  };

  // Info: (20240710 - Julian) 如果值為空，則回傳 0
  const handleBlur = () => {
    if (valueStr === '') {
      setValueStr('0');
      setValue(0);
    } else {
      const numericValue = isDecimal ? parseFloat(valueStr) : parseInt(valueStr, 10);
      setValueStr(numericValue.toString());
      setValue(numericValue);
    }
  };

  // Info: (20240710 - Julian) 當 input focus 時，如果值為 0，則清空
  const handleFocus = () => {
    if (valueStr === '0') {
      setValueStr('');
    }
  };

  // Info: (20240710 - Julian) 禁止滾輪改變數值
  const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    e.currentTarget.blur();
  };

  return (
    <input
      type="number"
      value={valueStr}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onWheel={handleWheel}
      {...props}
    />
  );
};

export default NumericInput;
