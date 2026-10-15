import { describe, it, expect } from "@jest/globals";
import { readFlagValue } from "@/lib/utils/script_args";

/**
 * Info: (20260826 - Julian) 腳本旗標取值（checklist §1.9）。
 *
 * `argv[argv.indexOf(flag) + 1]` 的失效方式是**安靜**的：值被下一個旗標吃掉，
 * 腳本掃到 0 筆、什麼都不做、exit 0，輸出與「全部處理完畢」長得一樣。
 *
 * Info: (20261015 - Luphia) 原本另釘住 `request_wallet_upgrades.ts` 走這支函式；
 * 那支腳本隨區塊鏈退役刪除，相關斷言一併移除。
 */
describe("readFlagValue", () => {
  it("旗標帶值時取到值", () => {
    const result = readFlagValue(["node", "s.ts", "--user", "u-1"], "--user");
    expect(result).toEqual({ ok: true, value: "u-1" });
  });

  // Info: (20260826 - Julian) 沒指定不是錯誤：那是「走預設行為」，呼叫端要分得出來
  it("沒有這個旗標時回 undefined 而不是錯誤", () => {
    const result = readFlagValue(["node", "s.ts", "--commit"], "--user");
    expect(result).toEqual({ ok: true, value: undefined });
  });

  /**
   * Info: (20260826 - Julian) 這一條是這支函式存在的理由（B-new-2）。
   *
   * `--user --commit`：舊寫法會得到 `onlyUserId === "--commit"`，
   * 而它是 truthy，所以「少帶值」那道守門放行。
   */
  it("下一個是另一個旗標時拒絕，不吃成值", () => {
    const result = readFlagValue(
      ["node", "s.ts", "--user", "--commit"],
      "--user",
    );
    expect(result.ok).toBe(false);
  });

  it("旗標在最後、後面沒有東西時拒絕", () => {
    const result = readFlagValue(["node", "s.ts", "--user"], "--user");
    expect(result.ok).toBe(false);
  });
});
