import React, { useState, useEffect } from 'react';
import { numberWithCommas } from '@/lib/utils/common';

interface INumericInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: number;
  setValue: React.Dispatch<React.SetStateAction<number>>;
  isDecimal?: boolean;
  hasComma?: boolean; // Info: (20240722 - Liz) 新增逗號顯示
  triggerWhenChanged?: (value: number, e: React.ChangeEvent<HTMLInputElement>) => void;
}

const formatDisplayValue = (
  value: string | number,
  isDecimal: boolean | undefined,
  hasComma: boolean | undefined
) => {
  let stringValue = value.toString();

  if (!isDecimal) {
    const intValue = parseInt(stringValue, 10);
    stringValue = Number.isNaN(intValue) ? '0' : intValue.toString();
  }

  return hasComma ? numberWithCommas(stringValue) : stringValue;
};

const NumericInput = ({
  value,
  setValue,
  isDecimal,
  hasComma,
  triggerWhenChanged,
  ...props
}: INumericInputProps) => {
  // Info: (20240723 - Liz) displayValue 是顯示在 input 上的顯示值
  const [displayValue, setDisplayValue] = useState<string>(value.toString());

  // Info: (20240723 - Liz) dbValue 是存入 DB 的儲存值
  const [dbValue, setDbValue] = useState<number>(value);

  useEffect(() => {
    setDisplayValue(formatDisplayValue(value, isDecimal, hasComma));
  }, [value, hasComma, isDecimal]);

  useEffect(() => {
    setValue(dbValue);
  }, [dbValue, setValue]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value;

    // Info: (20240723 - Liz) 整理輸入的值
    const sanitizedValue =
      inputValue
        .replace(/^0+/, '') // 移除開頭的零
        .replace(/[^0-9.]/g, '') // 移除非數字和小數點字符
        .replace(/(\..*)\./g, '$1') || '0'; // 只允許一個小數點

    // Info: (20240723 - Liz) 轉換成數值 (整數或浮點數) 為了存入 DB
    const numericValue = isDecimal
      ? parseFloat(sanitizedValue) // 如果解析失敗，會是 NaN
      : parseInt(sanitizedValue, 10); // 如果解析失敗，會是 NaN

    // Info: (20240723 - Liz) 處理 NaN 的情況
    const validNumericValue = Number.isNaN(numericValue) ? 0 : numericValue;

    // Info: (20240723 - Liz) 根據 isDecimal 和 hasComma 的值來決定顯示值的格式
    const formattedDisplayValue = formatDisplayValue(sanitizedValue, isDecimal, hasComma);

    // Info: (20240723 - Liz) 更新儲存值
    setDbValue(validNumericValue);

    // Info: (20240723 - Liz) 更新顯示值
    setDisplayValue(formattedDisplayValue);

    if (triggerWhenChanged) {
      triggerWhenChanged(validNumericValue, event);
    }
  };

  // Info: (20240723 - Liz) 處理 displayValue 為空或僅為點的情況
  const handleBlur = () => {
    if (!displayValue || displayValue === '.') {
      setDisplayValue('0');
      setDbValue(0);
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
