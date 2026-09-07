import {
  amountTextToNumber,
  amountTextToNumericString,
  clampAmountText,
  formatAmountForDisplay,
  imeFallbackChar,
  normalizeAmountInput,
  sanitizeAmountText,
} from "@/lib/utils/amount_input";
import {
  MAX_MEAL_ALLOWANCE,
  MIN_BASE_SALARY,
} from "@/constants/salary_calculator";

/**
 * Info: (20260831 - Julian)
 * 金額輸入框（AmountInput）的行為測試。
 * 兩個回報的問題各自對應下列 describe：
 * 1. 有預設值時，輸入的數字被接在預設值後面 → 選取範圍要能被覆寫、游標要停在正確位置。
 * 2. 部分數字打不進來 → 小數點與中文輸入法下的數字鍵。
 */

const keyOf = (code: string, key: string, shiftKey = false) => ({
  code,
  key,
  shiftKey,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
});

describe("金額顯示格式", () => {
  it("整數部分加上千分位", () => {
    expect(formatAmountForDisplay("30000")).toBe("30,000");
    expect(formatAmountForDisplay("1234567")).toBe("1,234,567");
  });

  it("只對整數部分加千分位，小數位原樣保留", () => {
    expect(formatAmountForDisplay("1234.5")).toBe("1,234.5");
  });

  it("空字串維持空字串，讓使用者可以清空欄位", () => {
    expect(formatAmountForDisplay("")).toBe("");
  });
});

describe("問題 1：預設值不應被接在輸入的數字後面", () => {
  it("全選後輸入單一數字會整個取代，而不是變成 30,0005", () => {
    // Info: (20260831 - Julian) 全選取代後 input 的原始值只剩使用者剛按下的那個數字
    expect(normalizeAmountInput("5", 1)).toEqual({ display: "5", caret: 1 });
  });

  it("在字串中間輸入時，游標留在剛輸入的字元後面（不會跳到最後）", () => {
    // Info: (20260831 - Julian) 顯示值 1,000，游標在 1 之後輸入 5 → 15,000，游標仍在 5 之後
    expect(normalizeAmountInput("15,000", 2)).toEqual({
      display: "15,000",
      caret: 2,
    });
  });

  it("千分位進位使字串變長時，游標跟著位移", () => {
    // Info: (20260831 - Julian) 顯示值 999，於結尾輸入 9 → 9,999，游標應停在最後
    expect(normalizeAmountInput("9999", 4)).toEqual({
      display: "9,999",
      caret: 5,
    });
  });

  it("刪光內容後可以維持空字串，重新輸入新的金額", () => {
    expect(normalizeAmountInput("", 0)).toEqual({ display: "", caret: 0 });
  });
});

describe("問題 2：部分數字無法輸入", () => {
  it("保留輸入到一半的結尾小數點（舊版會被吃掉導致小數永遠打不進來）", () => {
    expect(normalizeAmountInput("1.", 2)).toEqual({ display: "1.", caret: 2 });
  });

  it("接續輸入小數位", () => {
    expect(normalizeAmountInput("1.5", 3)).toEqual({
      display: "1.5",
      caret: 3,
    });
    expect(normalizeAmountInput("1.53", 4)).toEqual({
      display: "1.53",
      caret: 4,
    });
  });

  it("以小數點開頭時自動補 0，游標落在小數點之後", () => {
    expect(normalizeAmountInput(".", 1)).toEqual({ display: "0.", caret: 2 });
  });

  it("第二個小數點與超出位數的小數被忽略，不影響已輸入的數字", () => {
    expect(sanitizeAmountText("1.2.3")).toBe("1.23");
    expect(sanitizeAmountText("1.2345")).toBe("1.23");
  });

  it("非數字字元（含輸入法殘留）被濾掉，數字仍然留下", () => {
    expect(sanitizeAmountText("12a3")).toBe("123");
    expect(sanitizeAmountText("1ㄦ2")).toBe("12");
  });

  it("去除多餘前導 0，但保留單獨的 0", () => {
    expect(sanitizeAmountText("007")).toBe("7");
    expect(sanitizeAmountText("0")).toBe("0");
    expect(sanitizeAmountText("0.5")).toBe("0.5");
  });
});

describe("中文輸入法下的數字鍵補救", () => {
  it("瀏覽器有正常送出數字時不介入，保留原生行為", () => {
    expect(imeFallbackChar(keyOf("Digit5", "5"))).toBeNull();
    expect(imeFallbackChar(keyOf("Numpad5", "5"))).toBeNull();
  });

  it("數字鍵被輸入法吃掉時補回該數字", () => {
    expect(imeFallbackChar(keyOf("Digit5", "Process"))).toBe("5");
    expect(imeFallbackChar(keyOf("Numpad0", "Process"))).toBe("0");
  });

  it("小數點鍵被輸入法吃掉時補回小數點", () => {
    expect(imeFallbackChar(keyOf("Period", "ㄦ"))).toBe(".");
  });

  it("Shift + Period（>）不會被當成小數點", () => {
    expect(imeFallbackChar(keyOf("Period", ">", true))).toBeNull();
  });

  it("非數字鍵與含 Ctrl / Cmd 的快捷鍵一律不介入", () => {
    expect(imeFallbackChar(keyOf("KeyA", "a"))).toBeNull();
    expect(
      imeFallbackChar({ ...keyOf("Digit5", "Process"), metaKey: true }),
    ).toBeNull();
    expect(
      imeFallbackChar({ ...keyOf("Digit1", "Process"), ctrlKey: true }),
    ).toBeNull();
  });
});

describe("顯示值轉數值", () => {
  it("去除千分位後取得數值", () => {
    expect(amountTextToNumber("30,000")).toBe(30000);
    expect(amountTextToNumber("1,234.56")).toBe(1234.56);
  });

  it("輸入到一半的結尾小數點視為整數，空值視為 0", () => {
    expect(amountTextToNumericString("1.")).toBe("1");
    expect(amountTextToNumber("")).toBe(0);
    expect(amountTextToNumber(".")).toBe(0);
  });
});

describe("上下限（離開欄位時才套用）", () => {
  it("低於下限拉回下限", () => {
    expect(clampAmountText("100", MIN_BASE_SALARY)).toBe(
      String(MIN_BASE_SALARY),
    );
  });

  it("高於上限拉回上限", () => {
    expect(clampAmountText("5,000", 0, MAX_MEAL_ALLOWANCE)).toBe(
      String(MAX_MEAL_ALLOWANCE),
    );
  });

  it("範圍內的值原樣保留", () => {
    expect(clampAmountText("1,500", 0, MAX_MEAL_ALLOWANCE)).toBe("1500");
  });

  it("未設定上下限時不做任何夾擠", () => {
    expect(clampAmountText("999,999,999")).toBe("999999999");
  });

  it("輸入途中的值不會被夾擠：clamp 只在此處呼叫，normalize 不動上下限", () => {
    // Info: (20260831 - Julian) 下限 28590 時仍可先打出 2，離開欄位才會被拉回下限
    expect(normalizeAmountInput("2", 1).display).toBe("2");
    expect(clampAmountText("2", MIN_BASE_SALARY)).toBe(String(MIN_BASE_SALARY));
  });
});
