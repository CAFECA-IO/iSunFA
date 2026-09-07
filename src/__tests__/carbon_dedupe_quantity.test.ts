/**
 * Info: (20260817 - Emily) 去重鍵對數量沒有數值正規化 —— 已知缺口（PR review B4）。
 *
 * `activityDedupeKey` 目前對數量只做 `quantity.trim()`（`src/lib/carbon_inventory.ts`）,
 * 於是 `"1,234"` 與 `"1234"` 是兩把不同的鍵 —— 同一筆事實會被記兩次（重複計量）。
 *
 * ## 這個格式在真實載荷裡出現過
 *
 * `carbon_esg_link.test.ts` 的 precomputed 那條就餵 `quantity: "2,500,000"` 給
 * `computeLedger` —— 千分位不是假想的輸入。憑證來源那條路以 `esg|<esgRecordId>` 為鍵,
 * 所以撞不到;會撞的是**對話申報**那條（走內容鍵）同一個量寫法不同的時候。
 *
 * ## 為什麼是「釘住現況」而不是順手改掉
 *
 * 改掉是**合併**的方向:它會讓今天分開的兩筆變成一筆,而那是帳本的計量語意。
 * 這一輪 PR 被擋的三條 blocker 全是「改了送給模型／記進帳的東西但沒有機械保證」,
 * 在同一輪裡再塞一個沒實跑過的計量變更,是重複同一個錯。
 *
 * 釘住之後那個缺口就**看得見**了:哪天有人加上正規化,下面會紅,
 * 而紅的時候他會讀到這段註解 —— 那正是預期的方向。要做的是把 `not.toBe` 改成 `toBe`,
 * 並補一次實跑（匯入一份含千分位的來源,數帳本列數）。
 *
 * ## 為什麼獨立一支檔而不是併進 carbon_esg_link.test.ts
 *
 * 那支的 import 鏈拉進 service / repo / prisma（閉包 46 檔),
 * 而這裡要測的只有一個純函式。獨立出來這幾條就跑得動而且跑得快,
 * 不必為了三條字串斷言背一整條 DB 相依。
 *
 * 逐條變異測試過:加上 `replace(/,/g, "")` → 2 條紅;拿掉 `trim()` → 1 條紅。
 */
import { describe, it, expect } from "@jest/globals";
import { activityDedupeKey } from "@/lib/carbon_inventory";
import { GhgProtocolCategory } from "@/constants/esg";
import { MeasurementUnit } from "@/constants/enums";

describe("dedupe key quantity normalisation (known gap)", () => {
  const base = {
    scopeCategory: GhgProtocolCategory.SCOPE_1_DIRECT,
    sourceName: "柴油",
    quantity: "1234",
    unit: MeasurementUnit.LITER,
  };

  it("currently treats a thousands separator as a different record", () => {
    expect(activityDedupeKey({ ...base, quantity: "1,234" })).not.toBe(
      activityDedupeKey(base),
    );
  });

  // Info: (20260817 - Emily) 反面:前後空白**有**被吃掉,所以缺口只在寫法,不是整個沒正規化
  it("does normalise surrounding whitespace", () => {
    expect(activityDedupeKey({ ...base, quantity: "  1234  " })).toBe(
      activityDedupeKey(base),
    );
  });

  /**
   * Info: (20260817 - Emily) 逐條寫出來而不是算 `Set` 的大小 ——
   * 後者要讀的人在腦子裡跑一遍才知道為什麼是那個數字,
   * 而「聰明的斷言」正是 A2 那條測試出問題的方式。
   */
  it("treats other spellings of the same number as different records too", () => {
    const key = (quantity: string): string =>
      activityDedupeKey({ ...base, quantity });

    expect(key("1234.0")).not.toBe(key("1234"));
    expect(key("1234.00")).not.toBe(key("1234.0"));
    expect(key("1,234")).not.toBe(key("1234"));
  });

  /**
   * Info: (20260817 - Emily) 憑證那條路不受影響 —— 它以 `esg|<esgRecordId>` 為鍵。
   * 這一條把「缺口的範圍」也釘住:修正端只在內容鍵那條路。
   */
  it("is unaffected on the voucher path, which keys on the record id", () => {
    const voucher = { ...base, esgRecordId: "esg-1" };
    expect(activityDedupeKey({ ...voucher, quantity: "1,234" })).toBe(
      activityDedupeKey(voucher),
    );
  });
});
