// Info: (20260831 - Julian) ============= 金額輸入框常數 =============

// Info: (20260831 - Julian) 金額最多允許輸入的小數位數（新台幣最小單位為分）
export const AMOUNT_INPUT_MAX_DECIMALS = 2;

// Info: (20260831 - Julian) 金額為空時的顯示值
export const AMOUNT_INPUT_EMPTY_TEXT = "0";

// Info: (20260831 - Julian) 小數點符號
export const DECIMAL_POINT = ".";

// Info: (20260831 - Julian) 千分位符號
export const THOUSAND_SEPARATOR = ",";

/**
 * Info: (20260831 - Julian)
 * 數字鍵的 KeyboardEvent.code（Digit0 ~ Digit9、Numpad0 ~ Numpad9），
 * 第一個 capture group 即為該按鍵對應的數字字元。
 */
export const DIGIT_KEY_CODE_REGEX = /^(?:Digit|Numpad)([0-9])$/;

// Info: (20260831 - Julian) 小數點鍵的 KeyboardEvent.code
export const DECIMAL_POINT_KEY_CODES: readonly string[] = [
  "Period",
  "NumpadDecimal",
];
