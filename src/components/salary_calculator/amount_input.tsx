"use client";

import {
  ChangeEvent,
  Dispatch,
  FC,
  FocusEvent,
  KeyboardEvent,
  MouseEvent,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { useTranslation } from "@/i18n/i18n_context";
import { AMOUNT_INPUT_EMPTY_TEXT } from "@/constants/amount_input";
import {
  amountTextToNumber,
  clampAmountText,
  formatAmountForDisplay,
  imeFallbackChar,
  normalizeAmountInput,
  sanitizeAmountText,
} from "@/lib/utils/amount_input";

interface IAmountInputProps {
  title: string;
  value: number;
  setValue: Dispatch<SetStateAction<number>>;
  required?: boolean;
  minimum?: number;
  maximum?: number;
}

const AmountInput: FC<IAmountInputProps> = ({
  title,
  value,
  setValue,
  required = false,
  minimum = undefined,
  maximum = undefined,
}) => {
  const { t } = useTranslation();

  // Info: (20260831 - Julian) 使用者正在編輯時，不讓外部 value 回填蓋掉輸入中的內容
  const isEditingRef = useRef(false);
  // Info: (20260831 - Julian) 記錄「這次 focus 是滑鼠點進來的第一下」，用來保住全選狀態
  const justFocusedRef = useRef(false);

  // Info: (20260831 - Julian) displayValue 是輸入框上的顯示值（含千分位），數值另外回傳給表單
  const [displayValue, setDisplayValue] = useState<string>(() =>
    formatAmountForDisplay(sanitizeAmountText(value.toString())),
  );

  useEffect(() => {
    // Info: (20260831 - Julian) 編輯中不同步，否則 `1.` 這類中途狀態會被父層的數值 1 洗掉
    if (isEditingRef.current) return;
    setDisplayValue(
      formatAmountForDisplay(sanitizeAmountText(value.toString())),
    );
  }, [value]);

  /**
   * Info: (20260831 - Julian)
   * 把整理後的字串寫回 input 並還原游標位置。
   * 先直接改 DOM 再 setState：React 重新渲染時值與 DOM 相同，就不會把游標推到最後面。
   */
  const applyInputText = (
    input: HTMLInputElement,
    rawText: string,
    rawCaret: number,
  ) => {
    const { display, caret } = normalizeAmountInput(rawText, rawCaret);

    input.value = display;
    input.setSelectionRange(caret, caret);

    setDisplayValue(display);
    setValue(amountTextToNumber(display));
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    applyInputText(
      input,
      input.value,
      input.selectionStart ?? input.value.length,
    );
  };

  /**
   * Info: (20260831 - Julian)
   * 只補救「被中文輸入法吃掉的數字鍵」，其餘按鍵維持瀏覽器預設行為，
   * 因此全選取代、Home / End、Shift + 方向鍵選取、複製貼上都能正常運作。
   */
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const fallbackChar = imeFallbackChar(event);
    if (fallbackChar === null) return;

    event.preventDefault();

    const input = event.currentTarget;
    const selectionStart = input.selectionStart ?? input.value.length;
    const selectionEnd = input.selectionEnd ?? selectionStart;

    // Info: (20260831 - Julian) 以選取範圍取代（而非插入），選取後輸入才會覆寫舊值
    const nextRawText =
      input.value.slice(0, selectionStart) +
      fallbackChar +
      input.value.slice(selectionEnd);

    applyInputText(input, nextRawText, selectionStart + fallbackChar.length);
  };

  const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
    isEditingRef.current = true;
    justFocusedRef.current = true;
    // Info: (20260831 - Julian) 進欄位即全選：直接輸入就是覆寫預設值，不會接在原本數字後面
    event.target.select();
  };

  const handleMouseUp = (event: MouseEvent<HTMLInputElement>) => {
    if (!justFocusedRef.current) return;
    justFocusedRef.current = false;
    // Info: (20260831 - Julian) 擋掉點擊後的 mouseup，否則它會把 focus 時的全選取消掉
    event.preventDefault();
  };

  const handleBlur = () => {
    isEditingRef.current = false;
    justFocusedRef.current = false;

    // Info: (20260831 - Julian) 離開欄位才套用上下限；輸入途中就夾住會讓小於下限開頭的數字打不進來
    const clampedText = clampAmountText(displayValue, minimum, maximum);
    setDisplayValue(formatAmountForDisplay(clampedText));
    setValue(amountTextToNumber(clampedText));
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-gray-700">
        {title} {required && <span className="text-red-500">*</span>}
      </p>
      <div className="flex h-11 items-center overflow-hidden rounded-lg bg-white ring-2 ring-gray-200 transition-all focus-within:ring-2 focus-within:ring-orange-500">
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          className="flex-1 bg-transparent px-3 py-2 text-right text-sm font-bold text-gray-900 outline-none placeholder:text-gray-400"
          value={displayValue}
          placeholder={AMOUNT_INPUT_EMPTY_TEXT}
          required={required}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onMouseUp={handleMouseUp}
          onBlur={handleBlur}
        />
        <div className="flex h-full items-center gap-2 border-l border-gray-200 bg-gray-50 px-4 py-2 text-xs font-bold text-gray-500">
          <Image
            src="/currencies/twd.svg"
            width={16}
            height={16}
            alt="TWD"
            className="overflow-hidden rounded-full shadow-sm"
          />
          <p>{t("currency_alias.twd")}</p>
        </div>
      </div>
    </div>
  );
};

export default AmountInput;
