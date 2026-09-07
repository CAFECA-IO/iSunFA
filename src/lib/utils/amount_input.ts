import {
  AMOUNT_INPUT_EMPTY_TEXT,
  AMOUNT_INPUT_MAX_DECIMALS,
  DECIMAL_POINT,
  DECIMAL_POINT_KEY_CODES,
  DIGIT_KEY_CODE_REGEX,
  THOUSAND_SEPARATOR,
} from "@/constants/amount_input";
import { MoneyUtil } from "@/lib/utils/money";

/**
 * Info: (20260831 - Julian)
 * 金額輸入框的純函式工具：只負責「使用者輸入的字串 → 可顯示字串 + 游標位置 + 數值」，
 * 不做任何浮點運算（數值一律交給 MoneyUtil / Decimal），也不碰 DOM，方便單獨測試。
 */

// Info: (20260831 - Julian) 正規化後的顯示值與其對應的游標位置
export interface INormalizedAmountInput {
  display: string;
  caret: number;
}

// Info: (20260831 - Julian) 判斷鍵盤事件是否被輸入法吃掉時所需的欄位
export interface IAmountKeyDescriptor {
  code: string;
  key: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
}

// Info: (20260831 - Julian) 顯示字串中屬於「數值」的字元；千分位逗號只是裝飾，不列入計算
const VALUE_CHAR_REGEX = /[0-9.]/;

// Info: (20260831 - Julian) 去除整數部分多餘的前導 0（保留單獨的 0）
const LEADING_ZERO_REGEX = /^0+(?=\d)/;

// Info: (20260831 - Julian) 千分位切點：每三位數之前插入逗號
const THOUSAND_GROUP_REGEX = /\B(?=(\d{3})+(?!\d))/g;

// Info: (20260831 - Julian) 整理過的輸入字串，以及游標之前還剩下幾個數值字元
interface ISanitizedAmount {
  text: string;
  caretValueIndex: number;
}

const isDigit = (char: string): boolean => char >= "0" && char <= "9";

/**
 * Info: (20260831 - Julian)
 * 逐字掃描使用者輸入，只保留數字與「第一個」小數點，並限制小數位數；
 * 同時記錄游標之前保留了幾個數值字元，之後才能在重新加上千分位後把游標放回原位。
 */
const sanitizeWithCaret = (
  raw: string,
  caret: number,
  maxDecimals: number,
): ISanitizedAmount => {
  let integerDigits = "";
  let decimalDigits = "";
  let hasDecimalPoint = false;
  let caretValueIndex = 0;

  for (let i = 0; i < raw.length; i += 1) {
    const char = raw[i];
    let isAccepted = false;

    if (isDigit(char)) {
      if (hasDecimalPoint) {
        // Info: (20260831 - Julian) 超過允許的小數位數就直接捨棄，不影響游標
        if (decimalDigits.length < maxDecimals) {
          decimalDigits += char;
          isAccepted = true;
        }
      } else {
        integerDigits += char;
        isAccepted = true;
      }
    } else if (char === DECIMAL_POINT && !hasDecimalPoint && maxDecimals > 0) {
      hasDecimalPoint = true;
      isAccepted = true;
    }

    if (isAccepted && i < caret) {
      caretValueIndex += 1;
    }
  }

  // Info: (20260831 - Julian) 被刪掉的前導 0 都在最前面，位於游標前的部分要一併把游標往前收
  const trimmedInteger = integerDigits.replace(LEADING_ZERO_REGEX, "");
  const removedLeadingZeros = integerDigits.length - trimmedInteger.length;
  caretValueIndex -= Math.min(caretValueIndex, removedLeadingZeros);

  if (!hasDecimalPoint) {
    return { text: trimmedInteger, caretValueIndex };
  }

  // Info: (20260831 - Julian) 只輸入小數點時補上前導 0，游標要跟著往後移一格
  if (trimmedInteger === "" && caretValueIndex > 0) {
    caretValueIndex += 1;
  }
  const integerText =
    trimmedInteger === "" ? AMOUNT_INPUT_EMPTY_TEXT : trimmedInteger;

  return {
    text: `${integerText}${DECIMAL_POINT}${decimalDigits}`,
    caretValueIndex,
  };
};

/**
 * Info: (20260831 - Julian)
 * 把使用者輸入整理成不含千分位的數值字串（保留使用者尚未輸入完的結尾小數點，例如 `1.`）
 */
export function sanitizeAmountText(
  raw: string,
  maxDecimals: number = AMOUNT_INPUT_MAX_DECIMALS,
): string {
  return sanitizeWithCaret(raw, raw.length, maxDecimals).text;
}

/**
 * Info: (20260831 - Julian)
 * 為整數部分加上千分位。這裡處理的是純數字字串的排版，沒有任何數值運算，不影響精度。
 */
export function formatAmountForDisplay(text: string): string {
  if (text === "") return "";

  const decimalPointIndex = text.indexOf(DECIMAL_POINT);
  const integerPart =
    decimalPointIndex < 0 ? text : text.slice(0, decimalPointIndex);
  const decimalPart =
    decimalPointIndex < 0 ? "" : text.slice(decimalPointIndex);

  return `${integerPart.replace(THOUSAND_GROUP_REGEX, THOUSAND_SEPARATOR)}${decimalPart}`;
}

// Info: (20260831 - Julian) 由「第幾個數值字元」換算回加上千分位後的實際游標位置
const caretFromValueIndex = (display: string, valueIndex: number): number => {
  if (valueIndex <= 0) return 0;

  let seen = 0;
  for (let i = 0; i < display.length; i += 1) {
    if (VALUE_CHAR_REGEX.test(display[i])) {
      seen += 1;
      if (seen === valueIndex) return i + 1;
    }
  }

  return display.length;
};

/**
 * Info: (20260831 - Julian)
 * 輸入框的主要進入點：接收原始輸入與游標位置，回傳整理後的顯示值與游標該落在哪裡。
 */
export function normalizeAmountInput(
  raw: string,
  caret: number,
  maxDecimals: number = AMOUNT_INPUT_MAX_DECIMALS,
): INormalizedAmountInput {
  const { text, caretValueIndex } = sanitizeWithCaret(raw, caret, maxDecimals);
  const display = formatAmountForDisplay(text);

  return { display, caret: caretFromValueIndex(display, caretValueIndex) };
}

/**
 * Info: (20260831 - Julian)
 * 轉成可以安全交給 Decimal 的字串：去掉千分位與尚未輸入完的結尾小數點，空值視為 0。
 */
export function amountTextToNumericString(
  text: string,
  maxDecimals: number = AMOUNT_INPUT_MAX_DECIMALS,
): string {
  const sanitized = sanitizeAmountText(text, maxDecimals);
  const trimmed = sanitized.endsWith(DECIMAL_POINT)
    ? sanitized.slice(0, -1)
    : sanitized;

  return trimmed === "" ? AMOUNT_INPUT_EMPTY_TEXT : trimmed;
}

// Info: (20260831 - Julian) 顯示字串 → 回填給表單的數值
export function amountTextToNumber(
  text: string,
  maxDecimals: number = AMOUNT_INPUT_MAX_DECIMALS,
): number {
  return MoneyUtil.toDecimal(
    amountTextToNumericString(text, maxDecimals),
  ).toNumber();
}

/**
 * Info: (20260831 - Julian)
 * 套用上下限並回傳正規化後的數值字串。
 * 只在離開欄位時呼叫：若在每次按鍵時就夾住，使用者將無法輸入「開頭小於下限」的數字。
 */
export function clampAmountText(
  text: string,
  minimum?: number,
  maximum?: number,
  maxDecimals: number = AMOUNT_INPUT_MAX_DECIMALS,
): string {
  const amount = MoneyUtil.toDecimal(
    amountTextToNumericString(text, maxDecimals),
  );

  if (maximum !== undefined && amount.greaterThan(maximum)) {
    return MoneyUtil.toDecimal(maximum).toString();
  }
  if (minimum !== undefined && amount.lessThan(minimum)) {
    return MoneyUtil.toDecimal(minimum).toString();
  }

  return amount.toString();
}

/**
 * Info: (20260831 - Julian)
 * 中文輸入法（例如注音）會把數字鍵當成聲調吃掉，導致數字打不進來。
 * 只有在「按下的確實是數字／小數點鍵，但瀏覽器實際送出的字元不是它」時才回傳補寫的字元；
 * 其餘情況一律回傳 null，把全選、複製、貼上、方向鍵、刪除等預設行為交還瀏覽器。
 */
export function imeFallbackChar(
  descriptor: IAmountKeyDescriptor,
): string | null {
  const { code, key, shiftKey, ctrlKey, metaKey, altKey } = descriptor;

  if (ctrlKey || metaKey || altKey) return null;

  const digitMatch = DIGIT_KEY_CODE_REGEX.exec(code);
  if (digitMatch) {
    const digit = digitMatch[1];
    return key === digit ? null : digit;
  }

  if (!shiftKey && DECIMAL_POINT_KEY_CODES.includes(code)) {
    return key === DECIMAL_POINT ? null : DECIMAL_POINT;
  }

  return null;
}
