"use client";

import { FC, ReactNode } from "react";

interface IHrFieldProps {
  /** Info: (20260812 - Julian) 對應輸入元件的 id，讓 label 點擊能聚焦 */
  htmlFor: string;
  label: string;
  isRequired?: boolean;
  /** Info: (20260812 - Julian) 已翻譯的錯誤訊息；沒有錯誤傳 null */
  error?: string | null;
  /**
   * Info: (20260812 - Julian) 補充說明。有錯誤時讓位給錯誤訊息，兩者不並存。
   *
   * 型別與預設值都對齊 `error`：可選的 prop 若沒有明示預設值，
   * 「沒有傳」與「傳了空字串」在元件內是兩種不同的東西，
   * 而呼叫端不會知道哪一種會多留一行空白（`react/require-default-props`）。
   */
  hint?: string | null;
  className?: string;
  children: ReactNode;
}

/**
 * Info: (20260812 - Julian) 表單欄位的外殼：標籤、必填標記、錯誤或說明。
 *
 * 抽成元件不只是為了少寫幾行 —— 它讓「必填怎麼標」「錯誤訊息長什麼樣」
 * 「錯誤時邊框變什麼顏色」在十個欄位上一致。這類細節各寫一份時，
 * 走樣的通常是最少人看的那兩三個欄位。
 *
 * 錯誤與說明互斥：兩行同時出現時，使用者要先讀完說明才看到錯誤，
 * 而他當下需要的只有錯誤。
 */
const HrField: FC<IHrFieldProps> = ({
  htmlFor,
  label,
  isRequired = false,
  error = null,
  hint = null,
  className = "",
  children,
}) => {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-1 text-sm font-medium text-gray-600"
      >
        {isRequired ? (
          <span aria-hidden="true" className="text-red-600">
            *
          </span>
        ) : null}
        {label}
      </label>

      {children}

      {error ? (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="text-xs font-medium text-red-600"
        >
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-gray-400">{hint}</p>
      ) : null}
    </div>
  );
};

export default HrField;
