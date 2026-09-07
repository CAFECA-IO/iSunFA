import { describe, it, expect } from "@jest/globals";
import {
  ceilRatioText,
  floorRatioText,
  MINUTES_PER_HOUR,
} from "@/lib/utils/hr_quantity_display";
import { LEAVE_UNRESOLVED_REASON_I18N_KEY } from "@/lib/utils/leave_chain_message";
import { LeaveApprovalUnresolvedReason } from "@/interfaces/leave_request";

/**
 * Info: (20260820 - Julian) 顯示層的取整方向（review 第 7 輪 M28）。
 *
 * 餘額卡與加班統計卡先前一律 `toFixed(1)`（四捨五入），於是
 * 「還剩 449 分、一日 450 分」顯示成「1.0 天」。使用者照著請一天，
 * 送出後拿到 `VA_LEAVE_INSUFFICIENT_BALANCE` —— 而那兩張卡片存在的
 * 唯一理由就是不讓他撞上那個結果。
 */
describe("floorRatioText —— 「還可以用多少」不得多報", () => {
  /**
   * Info: (20260820 - Julian) 每一組都成對斷言：新答案對，**且舊寫法在這一組上是錯的**。
   * 少了後者，這些數字看起來只是幾個普通的例子，
   * 而下一個人不會知道它們為什麼在這裡。
   */
  it.each([
    // Info: (20260824 - Julian) [分子, 分母, 應顯示, toFixed 會顯示成]
    [449, 450, "0.9", "1.0"],
    [59, MINUTES_PER_HOUR, "0.9", "1.0"],
    [1795, 1800, "0.9", "1.0"],
  ])("%i/%i → %s（toFixed 會給 %s）", (num, den, expected, naive) => {
    expect(floorRatioText(num, den)).toBe(expected);
    expect((num / den).toFixed(1)).toBe(naive);
    expect(floorRatioText(num, den)).not.toBe(naive);
  });

  // Info: (20260820 - Julian) 對照組：整除與剛好落在刻度上的值不得被壓低
  it.each([
    [450, 450, "1.0"],
    [1680, 480, "3.5"],
    [0, 450, "0.0"],
    [2760, MINUTES_PER_HOUR, "46.0"],
  ])("%i/%i → %s（沒有多扣一格）", (num, den, expected) => {
    expect(floorRatioText(num, den)).toBe(expected);
  });

  /**
   * Info: (20260820 - Julian) 負數＝已經超過上限，要往**更負**的方向取。
   *
   * BigInt 的 `/` 是朝零截斷而不是 floor，不特別處理的話 -3/60 會變成
   * `"0.0"` —— 讀起來像「剛好用完」，而實際上已經超過了。
   */
  it("超過上限時不得被顯示成剛好用完", () => {
    expect(floorRatioText(-3, MINUTES_PER_HOUR)).toBe("-0.1");
    expect(floorRatioText(-60, MINUTES_PER_HOUR)).toBe("-1.0");
  });

  /**
   * Info: (20260820 - Julian) 分母為 0 回 null，不是 "0.0"。
   * 回 "0.0" 會讓「算不出來」與「真的是零」變成同一件事，
   * 而畫面對前者該顯示「—」。
   */
  it("分母為 0 或負數時回 null", () => {
    expect(floorRatioText(10, 0)).toBeNull();
    expect(floorRatioText(10, -60)).toBeNull();
  });

  /**
   * Info: (20260820 - Julian) 不經過浮點：`Math.floor(x * 10) / 10` 會踩到
   * 與 M1 同一個坑（`0.7 * 10 === 6.999999999999999`）。
   */
  it("十分位的邊界不受浮點尾數影響", () => {
    for (let minutes = 0; minutes <= 600; minutes += 1) {
      const text = floorRatioText(minutes, MINUTES_PER_HOUR);
      const exact = Math.floor((minutes * 10) / MINUTES_PER_HOUR) / 10;
      expect(Number(text)).toBe(exact);
    }
  });
});

describe("ceilRatioText —— 「已經用掉多少」不得少報", () => {
  it.each([
    [1, MINUTES_PER_HOUR, "0.1"],
    [61, MINUTES_PER_HOUR, "1.1"],
    [451, 450, "1.1"],
  ])("%i/%i → %s", (num, den, expected) => {
    expect(ceilRatioText(num, den)).toBe(expected);
  });

  // Info: (20260820 - Julian) 整除時不得無故多一格
  it.each([
    [60, MINUTES_PER_HOUR, "1.0"],
    [0, MINUTES_PER_HOUR, "0.0"],
  ])("%i/%i → %s", (num, den, expected) => {
    expect(ceilRatioText(num, den)).toBe(expected);
  });

  /**
   * Info: (20260820 - Julian) 兩個方向必須夾住真值，且相差不超過一格。
   * 這一條是兩支函式的關係，不是各自的行為 —— 任一支寫反了它就會紅。
   */
  it("floor ≤ 真值 ≤ ceil，且相差至多一格", () => {
    for (let minutes = 0; minutes <= 600; minutes += 7) {
      const low = Number(floorRatioText(minutes, MINUTES_PER_HOUR));
      const high = Number(ceilRatioText(minutes, MINUTES_PER_HOUR));
      const exact = minutes / MINUTES_PER_HOUR;
      expect(low).toBeLessThanOrEqual(exact);
      expect(high).toBeGreaterThanOrEqual(exact);
      /**
       * Info: (20260820 - Julian) 比**格數**而不是比差值。
       *
       * 第一版寫 `high - low <= 0.1 + EPSILON`，而 `4.4 - 4.3` 在 double 裡是
       * 0.10000000000000053 —— 那條斷言會在 minutes = 259 紅掉，
       * 而兩個顯示值都是對的。用一個浮點減法去驗一支刻意避開浮點的函式，
       * 是把被測物件要解決的問題重新引進測試裡（checklist §1.9）。
       */
      expect(Math.round(high * 10) - Math.round(low * 10)).toBeLessThanOrEqual(
        1,
      );
    }
  });
});

/**
 * Info: (20260820 - Julian) 展不開的成因每一個都要有文案（review 第 7 輪 M27）。
 *
 * 畫面原本直接插 enum 值：「簽核流程展不開（NO_DEPARTMENT_MANAGER）」。
 * `Record<enum, string>` 已經讓「漏一個」在編譯期就紅，這一條補的是
 * **反方向**：多一個不存在的成因（改名之後留下的舊 key）同樣是缺陷，
 * 而型別擋不住那一側。
 */
describe("展不開的成因對照表", () => {
  it("每一個 enum 值都有 key，且沒有多餘的 key", () => {
    const reasons = Object.values(LeaveApprovalUnresolvedReason).sort();
    expect(Object.keys(LEAVE_UNRESOLVED_REASON_I18N_KEY).sort()).toEqual(
      reasons,
    );
  });

  // Info: (20260820 - Julian) 每一句都要是不同的話 —— 這個 enum 分這麼細就是為了分辨
  it("八個成因是八句不同的話", () => {
    const keys = Object.values(LEAVE_UNRESOLVED_REASON_I18N_KEY);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("key 都指向假勤的命名空間，不是被誤植的字面訊息", () => {
    for (const key of Object.values(LEAVE_UNRESOLVED_REASON_I18N_KEY)) {
      expect(key).toMatch(/^hr_management\.leave\.unresolved_/);
    }
  });
});
