import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { DEFAULT_LEAVE_POLICY_SEED } from "@/constants/leave_policy";

/**
 * Info: (20260821 - Julian) 跨假別併計（`mergesIntoPolicyId`）**尚未實作**，
 * 因此送出端擋下 —— 而這一檔釘住那個「尚未」（review 第 10 輪 B2）。
 *
 * ## 缺陷的形狀
 *
 * 計畫書 §6.5 寫著「家庭照顧假併入事假（性平法 §20）… `allocateConsumption`
 * 在扣減主假別後對被併入的假別再產一筆 `CONSUME`」，而 `mergesIntoPolicyId`
 * 在**整個扣減路徑上零讀取端**：`readConsumableGrants` 只收單一
 * `leavePolicyId`，`allocateConsumption` 收的是扁平的 grants 陣列。
 *
 * 後果是法定額度被繞過：請滿 7 日家庭照顧假之後事假仍是完整 14 日
 * （合計 21 日），而性平法 §20 的上限是 14 日。
 *
 * ## 這一檔是**自我作廢**的
 *
 * 下面第二條掃扣減路徑的三支檔案。**併計扣減一落地，那一條就會紅** ——
 * 而它的訊息會叫下一個人把送出端那道閘一起拿掉。
 * 一道沒有失效條件的臨時閘，會在功能做完之後繼續擋著，而沒有人知道為什麼。
 */

const read = (...parts: string[]): string =>
  readFileSync(join(process.cwd(), ...parts), "utf8");

/**
 * Info: (20260821 - Julian) 註解不算數 —— 只看程式碼。
 *
 * 這一檔自己就在註解裡大量提到 `mergesInto`，而被掃的那三支也會在註解裡
 * 解釋「為什麼這裡沒有併計」。純文字比對會把說明當成實作
 * （同 `e2e_production_guard.test.ts` 的處置）。
 *
 * 方向是保守的：誤刪只會讓「有實作」被判成「沒實作」而讓第二條變綠，
 * 而第二條變綠代表閘還該留著 —— 不會放行一個已經實作卻沒拿掉閘的狀態。
 */
const stripComments = (source: string): string =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");

/**
 * Info: (20260821 - Julian) 扣減路徑的三支：讀可扣批次、分配、寫入。
 * 併計要落地就一定得動到其中至少一支 —— 它需要「另一個假別」這個維度，
 * 而這三支目前都只認得單一 `leavePolicyId`。
 */
const CONSUMPTION_PATH: readonly string[][] = [
  ["src", "repositories", "leave_ledger.ts"],
  ["src", "lib", "leave_entitlement_rules.ts"],
  ["src", "repositories", "leave_request.repo.ts"],
];

describe("跨假別併計：規則已設定但尚未實作", () => {
  /**
   * Info: (20260821 - Julian) 前提：資料上真的有一個假別要併計。
   * 沒有的話，這一整檔守的是一個不存在的狀態 —— 而那正是本輪要修的那種形狀。
   */
  it("預設政策裡至少有一個假別設了 mergesIntoCode", () => {
    const merging = DEFAULT_LEAVE_POLICY_SEED.filter(
      (policy) => policy.mergesIntoCode !== null,
    );

    expect(merging.length).toBeGreaterThan(0);
    // Info: (20260821 - Julian) 家庭照顧假併入事假 —— 性平法 §20，計畫書 §6.5 已查證
    expect(merging.map((policy) => policy.code)).toContain("FAMILY_CARE");
  });

  /**
   * Info: (20260821 - Julian) **這一條是自我作廢的閘。**
   *
   * 併計扣減一旦落地，扣減路徑上就會出現 `mergesInto` 的讀取端，
   * 這一條會紅 —— 那時該做的是把 `leave_request.service.ts` 裡那道
   * `VA_LEAVE_MERGE_NOT_IMPLEMENTED` 一起移除，而不是把這一條刪掉。
   */
  it.each(CONSUMPTION_PATH.map((parts) => [parts.join("/"), parts] as const))(
    "%s 仍然沒有讀取 mergesInto（有了就要拿掉送出端那道閘）",
    (_label, parts) => {
      const code = stripComments(read(...parts));

      expect(code).not.toMatch(/mergesInto/);
    },
  );

  /**
   * Info: (20260821 - Julian) 而擋下的那句話必須真的存在且接得上。
   *
   * 少了這一條，一個把 `throw` 刪掉的改動只會讓額度被繞過，
   * 而上面那兩條照樣綠 —— 它們證明的是「沒有實作」，不是「有擋住」。
   */
  it("送出端擋下設了 mergesIntoPolicyId 的假別", () => {
    const service = stripComments(
      read("src", "services", "leave_request.service.ts"),
    );

    expect(service).toMatch(/policy\.mergesIntoPolicyId !== null/);
    expect(service).toMatch(/VA_LEAVE_MERGE_NOT_IMPLEMENTED/);
  });

  // Info: (20260821 - Julian) 錯誤碼要真的在字典裡，且是 4xx 不是 5xx
  it("VA_LEAVE_MERGE_NOT_IMPLEMENTED 是一個 4xx 的驗證錯誤", () => {
    expect(API_ERRORS.VA_LEAVE_MERGE_NOT_IMPLEMENTED.code).toBe("VA000082");
    expect(API_ERRORS.VA_LEAVE_MERGE_NOT_IMPLEMENTED.status).toBe(
      API_ERRORS.VA_LEAVE_INSUFFICIENT_BALANCE.status,
    );
  });
});
