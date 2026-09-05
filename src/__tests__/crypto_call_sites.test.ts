import { describe, it, expect } from "@jest/globals";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

/**
 * Info: (20260905 - Luphia) 全站只有這幾個檔案可以碰 crypto 原語（#6753 第一步）。
 *
 * ## 這一支現在就做，而不是等收斂完成
 *
 * #6753 要把兩套加解密收斂成一支 service，而那需要先拍板一份規格
 *（cipher suite、IV 長度、AAD 的組成、keyVersion 的位置、金鑰來源與輪替流程）——
 * 兩套現行實作各自都有對的部分，那一步是**選擇**而不是折衷，不該由寫測試的人決定。
 *
 * 但有一件事不必等：**把數量凍結在今天的 2**。
 *
 * 現況是 `hr_pii_crypto.ts`（HR PII，AAD 強制、逐版本一把 env 金鑰）與
 * `key_vault.ts`（託管秘密，AAD 選填、單一 master + scrypt 逐 purpose 衍生）
 * 兩套並存，對同一個問題給了兩套答案。規格拍板前，最糟的發展是**出現第三套** ——
 * 而今天沒有任何東西擋得住：`import { createCipheriv } from "crypto"` 在任何檔案裡
 * 都是合法的一行，lint 與 tsc 都不會有意見。
 *
 * 這條清單只能變短。收斂完成後它會剩一個，那時這支測試就從「凍結」
 * 變成「維持」——中間不需要改寫，只要把 MAX 調小。
 *
 * ## 為什麼連 `randomBytes` 都不管
 *
 * 只釘 `createCipheriv` / `createDecipheriv`。`randomBytes` 到處都可以用
 *（產 token、產 id、產 IV），把它一起釘住只會逼人為了過測試而繞路。
 * 這支要防的是「第三套**加解密方案**」，不是「有人用了 crypto 模組」。
 */

const SRC = join(process.cwd(), "src");

/**
 * Info: (20260905 - Luphia) 掃描根是整個 `src`（檢查清單 §1.1）。
 *
 * 排除 `generated`（Prisma client 自帶一堆 crypto）與 `__tests__`
 *（測試要造密文是正當的）。少了這個排除，清單會被雜訊灌滿而失去意義。
 */
const collectFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "generated" || entry.name === "__tests__") return [];
      return collectFiles(full);
    }
    return entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")
      ? [full]
      : [];
  });

/**
 * Info: (20260905 - Luphia) **允許碰 crypto 原語的檔案，逐一寫明理由。**
 *
 * 每一項都要說得出「它為什麼是獨立的一套」——因為那正是 #6753 要消滅的東西。
 * 新增一項等於宣告「這個系統現在有三套加解密」，那句話應該要有人在 review 裡看到。
 */
const ALLOWED: Record<string, string> = {
  "lib/hr_pii_crypto.ts":
    "HR PII（ADR 018）。AES-256-GCM，AAD 強制且結構化，金鑰逐版本一把 env。",
  "lib/auth/key_vault.ts":
    "託管秘密（私鑰、PRF、系統設定）。AAD 選填，單一 master key 以 scrypt 逐 purpose 衍生。",
};

const ALLOWED_MAX = 2;

const CRYPTO_PRIMITIVE = /\b(createCipheriv|createDecipheriv)\b/;

const offenders = (): string[] =>
  collectFiles(SRC)
    .filter((file) => CRYPTO_PRIMITIVE.test(readFileSync(file, "utf-8")))
    .map((file) =>
      file
        .slice(SRC.length + 1)
        .split("\\")
        .join("/"),
    )
    .sort();

describe("加解密原語的呼叫點（#6753 第一步：凍結在 2）", () => {
  /**
   * Info: (20260905 - Luphia) 掃描根沒有掃到空氣 —— regex 或排除規則寫壞時這條先紅。
   */
  it("掃得到現有的兩套實作", () => {
    expect(offenders().length).toBeGreaterThan(0);
  });

  /**
   * Info: (20260905 - Luphia) **新增第三套會紅，而且訊息直接說出是哪一個檔案。**
   *
   * 作者只有兩條路：走既有的兩套之一，或把它登記進 `ALLOWED` 並寫下理由 ——
   * 而後者會出現在 diff 上，需要在 review 裡被解釋。這正是檢查清單 §1.1
   * 說的「明列例外清單 + 一條清單長度不得增加的測試」。
   */
  it("沒有清單以外的檔案碰 crypto 原語", () => {
    expect(offenders()).toEqual(Object.keys(ALLOWED).sort());
  });

  /**
   * Info: (20260905 - Luphia) 清單只能變短。
   *
   * #6753 收斂完成後這裡會是 1，那時把 `ALLOWED_MAX` 調成 1 即可，
   * 測試本身不必改寫。方向是單向的：變長要動這個數字，而動它會被看見。
   */
  it("清單沒有變長", () => {
    expect(Object.keys(ALLOWED).length).toBeLessThanOrEqual(ALLOWED_MAX);
  });

  /**
   * Info: (20260905 - Luphia) 每一項都要有理由，不能只列路徑。
   *
   * 檢查清單 §1.1：「例外清單裡的每一項都要寫明『為什麼這次不修』，
   * 而不只是列路徑。」一個沒有理由的豁免，下一個人無從判斷它還成不成立。
   */
  it("每一個豁免都寫得出理由", () => {
    for (const [file, reason] of Object.entries(ALLOWED)) {
      expect(reason.length).toBeGreaterThan(20);
      expect(file).toMatch(/\.tsx?$/);
    }
  });
});
