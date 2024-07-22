import React, { useState, useEffect } from 'react';
import { numberWithCommas } from '@/lib/utils/common';

interface INumericInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: number;
  setValue: React.Dispatch<React.SetStateAction<number>>;
  isDecimal?: boolean;
  isComma?: boolean; // Info: (20240722 - Liz) 新增逗號顯示
}

const NumericInput = ({ value, setValue, isDecimal, isComma, ...props }: INumericInputProps) => {
  const [displayValue, setDisplayValue] = useState<string>(value.toString());

  useEffect(() => {
    setDisplayValue(isComma ? numberWithCommas(value) : value.toString());
  }, [value, isComma]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value;

    // Info: (20240710 - Julian) 移除開頭零和所有小數點以外的非數字字符
    const sanitizedValue = inputValue.replace(/^0+/, '').replace(/[^0-9.]/g, '') || '0';
    setDisplayValue(sanitizedValue);

    const sanitizedValueNum = Number.isNaN(Number(sanitizedValue))
      ? '0'
      : Number(sanitizedValue).toString();

    // Info: (20240710 - Julian) 回傳 number 類型的值
    const numValue = isDecimal ? parseFloat(sanitizedValueNum) : parseInt(sanitizedValueNum, 10);
    setValue(numValue);
  };

  // Info: (20240710 - Julian) 如果值為空，則回傳 0
  const handleBlur = () => {
    if (displayValue === '' || displayValue === '.') {
      setDisplayValue('0');
      setValue(0);
    } else {
      const cleanedValue = displayValue.replace(/,/g, '');
      const numericValue = isDecimal ? parseFloat(cleanedValue) : parseInt(cleanedValue, 10);
      setDisplayValue(isComma ? numberWithCommas(numericValue) : numericValue.toString());
    }
  };

  // Info: (20240710 - Julian) 當 input focus 時，如果值為 0，則清空
  const handleFocus = () => {
    if (displayValue === '0') {
      setDisplayValue('');
    }
  };

  // Info: (20240710 - Julian) 禁止滾輪改變數值
  const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    e.currentTarget.blur();
  };

  return (
    <input
      type="text" // Info: (20240722 - Liz) 保持輸入的 type 為 text 以允許顯示逗號
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onWheel={handleWheel}
      {...props}
    />
  );
};

export default NumericInput;
