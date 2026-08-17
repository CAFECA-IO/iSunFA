import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Info: (20260818 - Luphia) 鏈上交易必須確認沒有 revert（自我 review 20260818）。
 *
 * `waitForTransactionReceipt` 對 revert 的交易一樣正常回傳收據——只有逾時才拋。
 * 因此「送得出去」不等於「做成了」，而原本每一處都只 await、不看 `status`。
 *
 * 最貴的一種是銷毀：離鏈帳本會記下「已收回」、團隊池加回點數，
 * 而成員錢包裡的點數一分沒少，等於憑空多出一批點數。
 *
 * 以原始碼比對而非行為測試：要釘的是「這個檔案裡不存在未經確認的 await」，
 * 那是一條檔案層級的規則，而下一個人新增一支鏈上操作時最容易照抄舊寫法。
 */

const TOKEN_SERVICE = join(
  process.cwd(),
  "src",
  "services",
  "token.service.ts",
);

describe("token.service 鏈上交易確認", () => {
  const source = readFileSync(TOKEN_SERVICE, "utf8");

  it("確認函式會檢查 receipt.status", () => {
    expect(source).toMatch(/receipt\.status !== "success"/);
  });

  /**
   * Info: (20260818 - Luphia) 這一條才是重點：不允許任何地方直接 await 收據
   * 而不看結果。只驗「有一個 confirmTransaction」不夠——下一支新函式照舊寫法
   * 抄一行 `await publicClient.waitForTransactionReceipt(...)` 就繞過去了。
   */
  it("除了確認函式本身，沒有任何地方直接 await 收據", () => {
    const direct = source
      .split("\n")
      .map((line, index) => ({ line: line.trim(), index }))
      // Info: (20260818 - Luphia) 只看程式碼，註解裡提到函式名不算呼叫
      .filter(
        ({ line }) =>
          line.includes("waitForTransactionReceipt") &&
          !line.startsWith("*") &&
          !line.startsWith("//"),
      );

    // Info: (20260818 - Luphia) 唯一合法的一處在 confirmTransaction 內
    expect(direct).toHaveLength(1);
    expect(direct[0].line).toContain("const receipt =");
  });

  it("每一支鏈上操作都經過確認函式", () => {
    const calls = source.match(/await confirmTransaction\(/g) ?? [];
    // Info: (20260818 - Luphia) 鑄造、註冊 KYC、強制轉帳、銷毀、凍結、暫停
    expect(calls.length).toBeGreaterThanOrEqual(6);
  });
});

/**
 * Info: (20260818 - Luphia) 收回點數在合約層面做不到（調查 20260818）。
 *
 * `CreditPoint` 只有 `burnAndUnlock(uint256)`，燒的是 `msg.sender` 自己的餘額；
 * 沒有 `burn(address, uint256)`，平台的代理帳號無權銷毀成員錢包裡的代幣。
 * 而 `ABIS.CREDIT_POINT` 卻宣告了那個函式——ABI 與部署的合約不一致。
 *
 * 這一條把事實釘住：哪天有人補了合約函式、或把 ABI 清乾淨，這裡會紅，
 * 而條款 §3.5「分配後不可收回」也就該跟著重新檢視。
 */
describe("CreditPoint 合約與 ABI 的落差", () => {
  const contract = readFileSync(
    join(process.cwd(), "contracts", "credit_point.sol"),
    "utf8",
  );

  it("合約沒有可由他人呼叫的 burn(address, uint256)", () => {
    expect(contract).not.toMatch(/function\s+burn\s*\(\s*address/);
  });

  it("合約的銷毀只作用於 msg.sender", () => {
    expect(contract).toMatch(/function\s+burnAndUnlock\s*\(\s*uint256/);
    expect(contract).toMatch(/_burn\(msg\.sender,/);
  });
});

/**
 * Info: (20260818 - Luphia) 收回已停用，且要**明確地**停用（產品決定 20260818）。
 *
 * 讓它一路走到鏈上失敗會回一個通用的「操作失敗」，而那個訊息會讓客服以為是
 * 餘額問題或暫時性故障而不斷重試——這件事重試一百次也一樣。
 */
describe("收回分配點數已停用", () => {
  const service = readFileSync(
    join(process.cwd(), "src", "services", "team_wallet.service.ts"),
    "utf8",
  );

  it("以專屬錯誤碼擋下，而不是走到鏈上才失敗", () => {
    expect(service).toMatch(/TW_ALLOCATION_REVOKE_DISABLED/);
  });

  /**
   * Info: (20260818 - Luphia) 必須擋在**動任何餘額之前**：
   * 走到底會先讀淨分配量、再讀鏈上餘額，中間任何一步的錯誤訊息
   * 都會蓋掉「這個功能已停用」這個真正的原因。
   */
  it("擋在讀取餘額之前", () => {
    const guard = service.indexOf("TW_ALLOCATION_REVOKE_DISABLED");
    const netAllocated = service.indexOf("sumNetAllocatedToMember");
    expect(guard).toBeGreaterThan(-1);
    expect(netAllocated).toBeGreaterThan(guard);
  });
});
