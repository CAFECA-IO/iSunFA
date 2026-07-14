import { useState, ChangeEvent } from "react";

/**
 * Info: (20260714 - Julian) useDecimalInput 選項
 */
export interface IUseDecimalInputOptions {
  // Info: (20260714 - Julian) 是否允許負號（如 XY 圖表座標軸範圍、可為負的數列值）
  allowNegative?: boolean;
}

/**
 * Info: (20260714 - Julian)
 * 判斷字串是否為合法的「數字輸入中間狀態」（僅數字與單一小數點，可選負號）。
 * 保留 ""、"1."、".5"、"-"（allowNegative 時）等中間狀態，避免打字被中斷。
 * 供 useDecimalInput 使用，也可直接用於陣列 / map 場景（Hook 無法在迴圈內呼叫時）。
 */
export const isDecimalInput = (
  value: string,
  allowNegative = false,
): boolean => {
  const pattern = allowNegative ? /^-?\d*\.?\d*$/ : /^\d*\.?\d*$/;
  return pattern.test(value);
};

/**
 * Info: (20260714 - Julian) useDecimalInput 回傳介面
 */
export interface IUseDecimalInputReturn {
  // Info: (20260714 - Julian) 原始字串；保留精度，可直接餵給 Prisma.Decimal 避免浮點誤差
  value: string;
  // Info: (20260714 - Julian) 解析後的數字；""、"."、"-" 等無效中間狀態一律收斂為 0
  numValue: number;
  // Info: (20260714 - Julian) 尚未輸入有效數字（空字串或僅有小數點 / 負號）
  isEmpty: boolean;
  // Info: (20260714 - Julian) 綁定 input onChange；非法字元會被丟棄，維持原值
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  // Info: (20260714 - Julian) 以程式設定值（同樣會經過過濾）
  setValue: (next: string) => void;
  // Info: (20260714 - Julian) 重設回初始值
  reset: () => void;
}

/**
 * Info: (20260714 - Julian)
 * 數字輸入 Hook：以 type="text" 搭配過濾規則，兼顧 UX 與只允許數字/小數點的限制。
 * 同時提供字串 (value) 與數字 (numValue)，讓呼叫端依需求選用
 * （高精度場景建議使用字串搭配 Prisma.Decimal）。
 * @param initial - 初始字串值，若不符合格式則以空字串起始
 * @param options - 額外選項，如 allowNegative 允許負數
 */
export const useDecimalInput = (
  initial = "",
  options: IUseDecimalInputOptions = {},
): IUseDecimalInputReturn => {
  const { allowNegative = false } = options;
  const normalizeInitial = isDecimalInput(initial, allowNegative)
    ? initial
    : "";
  const [value, setValueState] = useState<string>(normalizeInitial);

  const setValue = (next: string) => {
    if (isDecimalInput(next, allowNegative)) {
      setValueState(next);
    }
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  const parsed = Number(value);
  const numValue = isNaN(parsed) ? 0 : parsed;
  const isEmpty =
    value === "" || value === "." || value === "-" || value === "-.";

  return {
    value,
    numValue,
    isEmpty,
    onChange,
    setValue,
    reset: () => setValueState(normalizeInitial),
  };
};
