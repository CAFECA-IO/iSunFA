import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import { readFlagValue } from "@/lib/utils/script_args";

/**
 * Info: (20260826 - Julian) 腳本旗標取值（checklist §1.9）。
 *
 * `argv[argv.indexOf(flag) + 1]` 的失效方式是**安靜**的：值被下一個旗標吃掉，
 * 腳本掃到 0 筆、什麼都不做、exit 0，輸出與「全部處理完畢」長得一樣。
 * `request_wallet_upgrades.ts` 發出的是永久、收不回的待辦，
 * 所以這裡連「它有沒有真的走這支」都一起釘住。
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

describe("request_wallet_upgrades 的守門", () => {
  const script = readFileSync(
    join(process.cwd(), "scripts", "request_wallet_upgrades.ts"),
    "utf8",
  );

  // Info: (20260826 - Julian) 自己 argv[i + 1] 的寫法不准回來
  it("`--user` 的值走共用的 readFlagValue", () => {
    expect(script).toMatch(/readFlagValue\(argv, "--user"\)/);
    expect(script).not.toMatch(/argv\[userIndex \+ 1\]/);
  });

  /**
   * Info: (20260826 - Julian) 掃到 0 人必須進 blockers，而不是印 0 然後 exit 0。
   *
   * 釘的是「它是一道 blocker」：blockers 非空時 `mayAct` 為 false、
   * exit code 非 0，兩件事都由既有的那段程式保證。
   */
  it("掃到 0 位使用者是 blocker", () => {
    expect(script).toMatch(/users\.length === 0/);
    const at = script.indexOf("users.length === 0");
    expect(script.slice(at, at + 400)).toMatch(/blockers\.push/);
  });
});
