import React, { useState, useEffect } from 'react';
import { numberWithCommas } from '@/lib/utils/common';

interface INumericInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: number;
  setValue?: React.Dispatch<React.SetStateAction<number>>;
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
  // Info: (20250319 - Anna) 小數時，只對整數部分加逗號
  if (hasComma) {
    const [integerPart, decimalPart] = stringValue.split('.');
    const formattedInteger = numberWithCommas(integerPart);
    return decimalPart !== undefined ? `${formattedInteger}.${decimalPart}` : formattedInteger;
  }

  return stringValue;
};

const NumericInput: React.FC<INumericInputProps> = ({
  value,
  setValue,
  isDecimal,
  hasComma,
  triggerWhenChanged,
  ...props
}) => {
  // Info: (20250319 - Anna) displayValue 是顯示在 input 上的顯示值
  const [displayValue, setDisplayValue] = useState<string>(
    formatDisplayValue(value, isDecimal, hasComma)
  );

  // Info: (20240723 - Liz) dbValue 是存入 DB 的儲存值
  const [dbValue, setDbValue] = useState<number>(value);

  useEffect(() => {
    setDisplayValue(formatDisplayValue(value, isDecimal, hasComma));
  }, [value, hasComma, isDecimal]);

  useEffect(() => {
    if (setValue) setValue(dbValue);
  }, [dbValue, setValue]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value;

    // Info: (20240723 - Liz) 整理輸入的值
    const sanitizedValue =
      inputValue
        .replace(/^0+(\d)/, '$1') // Info: (20250319 - Anna) 避免 01，但允許 0.1
        .replace(/[^0-9.]/g, '') // 移除非數字和小數點字符
        .replace(/(\..*)\./g, '$1') || '0'; // 只允許一個小數點

    // Info: (20250319 - Anna) 允許輸入 `.`，但顯示 `0.`
    if (sanitizedValue === '.') {
      setDisplayValue('0.');
      return;
    }

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

  // Info: (20250306 - Julian) 處理在中文輸入法下，填入數字的情況
  function convertInput(event: React.KeyboardEvent<HTMLInputElement>) {
    // Info: (20250313 - Julian) 執行預設行為: Tab, Backspace, Delete, ArrowLeft, ArrowRight
    if (
      event.code === 'Tab' ||
      event.code === 'Backspace' ||
      event.code === 'Delete' ||
      event.code === 'ArrowLeft' ||
      event.code === 'ArrowRight'
    ) {
      return;
    }

    event.preventDefault(); // Info: (20250306 - Julian) 阻止預設事件

    let temp = displayValue; // Info: (20250306 - Julian) 取得目前顯示值
    let code = ''; // Info: (20250306 - Julian) 按鍵 code

    const input = event.currentTarget; // Info: (20250306 - Julian) 取得 input 元件
    const cursorPos = input.selectionStart ?? displayValue.length; // Info: (20250306 - Julian) 取得當前游標位置

    if (event.code.indexOf('Digit') > -1) {
      // Info: (20250306 - Julian) 如果按下的是數字鍵
      code = event.code.slice(-1); // Info: (20250306 - Julian) 取得數字鍵的值
      // Info: (20250319 - Anna) 允許輸入小數點，但只能輸入一次
    } else if (event.key === '.' && !displayValue.includes('.')) {
      code = '.';
    }
    if (code) {
      temp = temp.slice(0, cursorPos) + code + temp.slice(cursorPos); // Info: (20250306 - Julian) 插入數字

      // Info: (20250306 - Julian) 變更顯示值
      handleChange({ target: { value: temp } } as React.ChangeEvent<HTMLInputElement>);
    }
    // Info: (20250319 - Anna) 如果按下的是數字鍵，將 code 設為數字
    if (event.code.indexOf('Digit') > -1) {
      code = event.code.slice(-1);
    }
  }

  // Info: (20250319 - Anna) 處理 displayValue 為空的情況
  const handleBlur = () => {
    if (!displayValue) {
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
      onKeyDown={convertInput}
      {...props}
    />
  );
};

export default NumericInput;
