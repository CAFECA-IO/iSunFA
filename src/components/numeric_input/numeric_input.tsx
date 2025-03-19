import React, { useState, useEffect } from 'react';
import { numberWithCommas } from '@/lib/utils/common';

interface INumericInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: number;
  setValue?: React.Dispatch<React.SetStateAction<number>>;
  isDecimal?: boolean;
  hasComma?: boolean;
  triggerWhenChanged?: (value: number, e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * 格式化顯示數值，確保小數點與千分位正確
 */
const formatDisplayValue = (
  value: string | number,
  isDecimal: boolean | undefined,
  hasComma: boolean | undefined
) => {
  let stringValue = value.toString();

  if (!isDecimal) {
    // 只允許整數
    const intValue = parseInt(stringValue, 10);
    stringValue = Number.isNaN(intValue) ? '0' : intValue.toString();
    return hasComma ? numberWithCommas(stringValue) : stringValue;
  }

  // 允許小數時，確保千分位格式正確
  if (hasComma) {
    const [integerPart, decimalPart] = stringValue.split('.');
    const formattedInteger = numberWithCommas(integerPart); // 只對整數部分加逗號
    return decimalPart !== undefined ? `${formattedInteger}.${decimalPart}` : formattedInteger;
  }

  return stringValue;
};

const NumericInput: React.FC<INumericInputProps> = ({
  value,
  setValue,
  isDecimal = false,
  hasComma = false,
  triggerWhenChanged,
  ...props
}) => {
  const [displayValue, setDisplayValue] = useState<string>(
    formatDisplayValue(value, isDecimal, hasComma)
  );
  const [dbValue, setDbValue] = useState<number>(value);

  useEffect(() => {
    setDisplayValue(formatDisplayValue(value, isDecimal, hasComma));
  }, [value, hasComma, isDecimal]);

  useEffect(() => {
    if (setValue) setValue(dbValue);
  }, [dbValue, setValue]);

  /**
   * 處理輸入變化
   */
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value;

    // 移除非數字與額外的小數點
    let sanitizedValue = inputValue
      .replace(/[^0-9.]/g, '') // 只允許數字與小數點
      .replace(/(\..*)\./g, '$1'); // 只允許一個小數點

    // 如果輸入為空，設為 "0"
    if (sanitizedValue === '') {
      sanitizedValue = '0';
    }

    // 允許輸入 `.`，但顯示 `0.`
    if (sanitizedValue === '.') {
      setDisplayValue('0.');
      return;
    }

    // 轉換為數值
    const numericValue = isDecimal ? parseFloat(sanitizedValue) : parseInt(sanitizedValue, 10);
    const validNumericValue = Number.isNaN(numericValue) ? 0 : numericValue;

    // 確保顯示值格式化正確
    const formattedDisplayValue = formatDisplayValue(sanitizedValue, isDecimal, hasComma);

    setDbValue(validNumericValue);
    setDisplayValue(formattedDisplayValue);

    if (triggerWhenChanged) {
      triggerWhenChanged(validNumericValue, event);
    }
  };

  /**
   * 修正 `convertInput` 允許輸入 `.` 並正確插入數值
   */
  function convertInput(event: React.KeyboardEvent<HTMLInputElement>) {
    if (['Tab', 'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      return;
    }

    event.preventDefault(); // 阻止預設行為

    const cursorPos = event.currentTarget.selectionStart ?? displayValue.length;
    let tempValue = displayValue;

    // 允許數字與小數點
    if (event.key.match(/[0-9.]/)) {
      tempValue = tempValue.slice(0, cursorPos) + event.key + tempValue.slice(cursorPos);
      handleChange({ target: { value: tempValue } } as React.ChangeEvent<HTMLInputElement>);
    }
  }

  /**
   * 當 input blur 時，確保 `0` 或 `0.`
   */
  const handleBlur = () => {
    if (!displayValue || displayValue === '.') {
      setDisplayValue('0');
      setDbValue(0);
    }
  };

  /**
   * 當 input focus 時，如果值為 0，則清空
   */
  const handleFocus = () => {
    if (displayValue === '0') {
      setDisplayValue('');
    }
  };

  /**
   * 禁止滾輪改變數值
   */
  const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    e.currentTarget.blur();
  };

  return (
    <input
      type="text"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onWheel={handleWheel}
      onKeyDown={convertInput}
      {...props}
    />
  );
};

export default NumericInput;
