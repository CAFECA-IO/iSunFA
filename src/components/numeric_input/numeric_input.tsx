import React, { useState, useEffect } from 'react';
import { numberWithCommas } from '@/lib/utils/common';
import BigNumberjs from 'bignumber.js';
import { KEYBOARD_EVENT_CODE } from '@/constants/keyboard_event_code';

interface INumericInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: number | string;
  setValue?:
    | React.Dispatch<React.SetStateAction<number>>
    | React.Dispatch<React.SetStateAction<string>>;
  isDecimal?: boolean;
  hasComma?: boolean; // Info: (20240722 - Liz) 新增逗號顯示
  triggerWhenChanged?:
    | ((value: number, e: React.ChangeEvent<HTMLInputElement>) => void)
    | ((value: string, e: React.ChangeEvent<HTMLInputElement>) => void);
  // Info: (20250811 - Shirley) 新增參數決定使用字串或數字模式
  useStringValue?: boolean;
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
  useStringValue = false,
  ...props
}) => {
  // Info: (20250319 - Anna) displayValue 是顯示在 input 上的顯示值
  const [displayValue, setDisplayValue] = useState<string>(
    formatDisplayValue(value, isDecimal, hasComma)
  );

  // Info: (20240723 - Liz) dbValue 是存入 DB 的儲存值
  const [dbValue, setDbValue] = useState<number | string>(
    useStringValue
      ? typeof value === 'string'
        ? value
        : value.toString()
      : typeof value === 'number'
        ? value
        : parseFloat(value.toString()) || 0
  );

  useEffect(() => {
    setDisplayValue(formatDisplayValue(value, isDecimal, hasComma));
  }, [value, hasComma, isDecimal]);

  useEffect(() => {
    if (setValue) {
      if (useStringValue) {
        (setValue as React.Dispatch<React.SetStateAction<string>>)(dbValue.toString());
      } else {
        (setValue as React.Dispatch<React.SetStateAction<number>>)(
          typeof dbValue === 'number' ? dbValue : parseFloat(dbValue.toString()) || 0
        );
      }
    }
  }, [dbValue, setValue, useStringValue]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value;

    // Deprecated: (20250709 - Julian) 以下至 line 75 為 2025/7/9 新增的邏輯，如果 component 出錯請優先檢查這裡
    // Info: (20250709 - Julian) 取得最大值和最小值，沒有則為 undefined
    const maximum = props.max && typeof props.max === 'number' ? props.max : undefined;
    const minimum = props.min && typeof props.min === 'number' ? props.min : undefined;

    // Info: (20250709 - Julian) 移除逗號後轉為數字
    const inputValueNum = parseFloat(inputValue.replace(/,/g, ''));

    // Info: (20250709 - Julian) 限制輸入的值在最大值和最小值之間
    const availableValue =
      maximum && inputValueNum > maximum
        ? maximum
        : minimum && inputValueNum < minimum
          ? minimum
          : inputValueNum;

    // Info: (20240723 - Liz) 整理輸入的值
    const sanitizedValue =
      availableValue
        .toString()
        .replace(/^0+(\d)/, '$1') // Info: (20250319 - Anna) 避免 01，但允許 0.1
        .replace(/[^0-9.]/g, '') // 移除非數字和小數點字符
        .replace(/(\..*)\./g, '$1') || '0'; // 只允許一個小數點

    // Info: (20250319 - Anna) 允許輸入 `.`，但顯示 `0.`
    if (sanitizedValue === '.') {
      setDisplayValue('0.');
      return;
    }

    // Info: (20250321 - Anna) 使用 BigNumber.js 確保數字精度
    let validNumericValue = isDecimal
      ? new BigNumberjs(sanitizedValue) // Info: (20250321 - Anna) 小數轉 BigNumber
      : new BigNumberjs(parseInt(sanitizedValue || '0', 10)); // Info: (20250321 - Anna) 整數轉 int，避免變小數 123 ➝ 123.0

    // Info: (20250321 - Anna) 處理 NaN 的情況
    if (validNumericValue.isNaN()) {
      validNumericValue = new BigNumberjs(0);
    }

    // Info: (20240723 - Liz) 根據 isDecimal 和 hasComma 的值來決定顯示值的格式
    const formattedDisplayValue = formatDisplayValue(sanitizedValue, isDecimal, hasComma);

    // Info: (20240723 - Liz) 更新儲存值
    if (useStringValue) {
      setDbValue(validNumericValue.toString());
    } else {
      // Info: (20250319 - Anna) BigNumber ➝ number：setState 用原生數字
      setDbValue(validNumericValue.toNumber());
    }

    // Info: (20240723 - Liz) 更新顯示值
    setDisplayValue(formattedDisplayValue);

    if (triggerWhenChanged) {
      if (useStringValue) {
        (triggerWhenChanged as (value: string, e: React.ChangeEvent<HTMLInputElement>) => void)(
          validNumericValue.toString(),
          event
        );
      } else {
        // Info: (20250319 - Anna) BigNumber ➝ number：callback 傳原生數字
        (triggerWhenChanged as (value: number, e: React.ChangeEvent<HTMLInputElement>) => void)(
          validNumericValue.toNumber(),
          event
        );
      }
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();

    const pasteData = event.clipboardData.getData('text');
    const cleanedValue = pasteData
      .replace(/[^\d.]/g, '') // Info: (20250603 - Anna) 僅保留數字與小數點
      .replace(/(\..*)\./g, '$1'); // Info: (20250603 - Anna) 僅允許一個小數點

    const target = event.target as HTMLInputElement;

    // Info: (20250603 - Anna) 將處理過的值送到 handleChange
    handleChange({ target: { value: cleanedValue } } as React.ChangeEvent<HTMLInputElement>);

    // Info: (20250603 - Anna) 將游標移到最後
    requestAnimationFrame(() => {
      target.selectionStart = cleanedValue.length;
      target.selectionEnd = cleanedValue.length;
    });
  };

  // Info: (20250306 - Julian) 處理在中文輸入法下，填入數字的情況
  function convertInput(event: React.KeyboardEvent<HTMLInputElement>) {
    // Info: (20250603 - Anna)  忽略 Ctrl/Cmd + V（貼上）
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') {
      return;
    }

    // Info: (20250313 - Julian) 執行預設行為: Tab, Backspace, Delete, ArrowLeft, ArrowRight
    if (
      event.code === KEYBOARD_EVENT_CODE.TAB ||
      event.code === KEYBOARD_EVENT_CODE.BACKSPACE ||
      event.code === KEYBOARD_EVENT_CODE.DELETE ||
      event.code === KEYBOARD_EVENT_CODE.ARROW_LEFT ||
      event.code === KEYBOARD_EVENT_CODE.ARROW_RIGHT
    ) {
      return;
    }

    event.preventDefault(); // Info: (20250306 - Julian) 阻止預設事件

    let temp = displayValue; // Info: (20250306 - Julian) 取得目前顯示值
    let code = ''; // Info: (20250306 - Julian) 按鍵 code

    const input = event.currentTarget; // Info: (20250306 - Julian) 取得 input 元件
    const cursorPos = input.selectionStart ?? displayValue.length; // Info: (20250306 - Julian) 取得當前游標位置

    // Info: (20250321 - Julian) 數字鍵正規表達式：digit0 ~ digit9, numpad0 ~ numpad9
    const regex = /^(Digit|Numpad)[0-9]$/;

    // Info: (20250306 - Julian) 如果按下的是數字鍵
    if (regex.test(event.code)) {
      code = event.code.replace(/\D/g, ''); // Info: (20250321 - Julian) 取得數字 (去掉前面的字符)
      // Info: (20250319 - Anna) 允許輸入小數點，但只能輸入一次
    } else if (
      (event.key === '.' || event.code === KEYBOARD_EVENT_CODE.PERIOD) &&
      !displayValue.includes('.')
    ) {
      code = '.';
    }

    // Info: (20250306 - Julian) 插入數字
    if (code) {
      temp = temp.slice(0, cursorPos) + code + temp.slice(cursorPos);

      // Info: (20250306 - Julian) 變更顯示值
      handleChange({ target: { value: temp } } as React.ChangeEvent<HTMLInputElement>);
    }
  }

  // Info: (20250319 - Anna) 處理 displayValue 為空的情況
  const handleBlur = () => {
    if (!displayValue) {
      setDisplayValue('0');
      setDbValue(useStringValue ? '0' : 0);
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
      onPaste={handlePaste}
      {...props}
    />
  );
};

export default NumericInput;
