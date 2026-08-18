import { describe, it, expect } from "@jest/globals";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { isChainCreditSpendable } from "@/lib/quota/personal_chain_credits";

/**
 * Info: (20260818 - Luphia) 扣費第二層停用期間的「集中標記」要與程式碼一致（第四輪 B-2）。
 *
 * `isChainCreditSpendable()` 回 false 之後，扣費管線裡有一批程式碼走不到。
 * 那份清單寫在 `personal_chain_credits.ts` 的註解裡，而**文件會過期**——
 * 這一檔的職責就是讓它不會默默過期。
 *
 * 釘住的是清單所依據的**事實**，不是清單的文字：
 * 哪天有人恢復第二層、或把離鏈分配餘額改回消費來源，這裡會紅，
 * 而紅的訊息會指向那份要跟著更新的清單。
 */

const GATE_FILE = join("src", "lib", "quota", "personal_chain_credits.ts");
const SPEND_SERVICE = join("src", "services", "spend.service.ts");

function codeOf(relative: string): string {
  return readFileSync(join(process.cwd(), relative), "utf8");
}

/**
 * Info: (20260818 - Luphia) 生產程式碼裡「除了定義處之外」還有誰提到這個符號。
 *
 * 掃描根是整個 `src`——「全 repo 已無呼叫端」這種主張的掃描根不能只是一個檔案。
 * 排除測試（測試會提到它是正常的）、排除產生的 Prisma client、排除註解，
 * 以及排除定義它的那個檔案本身。
 */
function productionCallers(symbol: string, definedIn?: string): string[] {
  const hits: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "__tests__" || entry.name === "generated") continue;
        walk(full);
        continue;
      }
      if (!entry.name.endsWith(".ts") && !entry.name.endsWith(".tsx")) continue;

      const relative = full.slice(process.cwd().length + 1);
      if (relative === definedIn) continue;

      const body = readFileSync(full, "utf8")
        .split("\n")
        .filter((line) => {
          const trimmed = line.trim();
          return !trimmed.startsWith("*") && !trimmed.startsWith("//");
        })
        .join("\n");
      if (body.includes(symbol)) hits.push(relative);
    }
  };
  walk(join(process.cwd(), "src"));
  return hits;
}

describe("第二層停用期間的事實（集中標記的依據）", () => {
  it("旗標仍是關的（以下每一條都以此為前提）", () => {
    expect(isChainCreditSpendable()).toBe(false);
  });

  /**
   * Info: (20260818 - Luphia) A 類：扣款的呼叫被旗標擋住。
   * `spender` 為 null 時不呼叫 `chargeChainCredits`，因此那支目前不可達。
   */
  it("A：扣款呼叫在旗標之後，旗標關著就取不到 spender", () => {
    const code = codeOf(SPEND_SERVICE);
    const gate = code.indexOf("isChainCreditSpendable()");
    const charge = code.indexOf("await chargeChainCredits(");
    expect(gate).toBeGreaterThan(-1);
    expect(charge).toBeGreaterThan(gate);
    // Info: (20260818 - Luphia) 扣款只在 spender 存在時發生，而 spender 由旗標決定
    expect(code).toMatch(
      /spender\?\.address\s*\n?\s*\?\s*await chargeChainCredits\(/,
    );
  });

  /**
   * Info: (20260818 - Luphia) B 類：wallet 腳由 2026-08-14 的改制關掉，與旗標無關。
   * 硬傳 `BigInt(0)` 表示「這條路上沒有第二個來源」，翻旗標不會改變它。
   */
  it("B：spendCredits 傳給 splitSpend 的 wallet 餘額是硬寫的 0", () => {
    expect(codeOf(SPEND_SERVICE)).toMatch(
      /splitSpend\(cost, quotaAvailable, BigInt\(0\)\)/,
    );
  });

  it("B：離鏈分配餘額已無生產消費端（consumeAllocation 只剩定義）", () => {
    expect(
      productionCallers(
        "consumeAllocation",
        join("src", "repositories", "team_wallet.repo.ts"),
      ),
    ).toEqual([]);
  });

  /**
   * Info: (20260818 - Luphia) B 類：逐功能扣款順序已於 2026-08-14 移除。
   *
   * 這一條同時是對 review 的更正：20260813「物流碳足跡優先扣分配點數」的拍板
   * 不是被第二層停用拿掉的，是那次改制拿掉的——翻回旗標不會讓它復活。
   */
  it("B：逐功能扣款順序已不存在於程式碼", () => {
    expect(productionCallers("FEATURE_SPEND_PRIORITY")).toEqual([]);
    expect(productionCallers("resolveSpendPriority")).toEqual([]);
  });

  /**
   * Info: (20260818 - Luphia) C 類：舊資料的退款路徑**必須留著**。
   *
   * 這一條的方向與其他條相反：它防的不是「忘了更新清單」，
   * 而是「有人把它當死碼刪掉」。改制前完成預扣、尚未結算的冪等鍵仍需退款，
   * 而刪掉這些路徑不會有任何其他測試變紅——只會讓那些舊鍵永遠退不了款。
   */
  it("C：舊預扣的退款路徑仍在（不可刪）", () => {
    const code = codeOf(SPEND_SERVICE);
    expect(code).toMatch(/splitRefund\(/);
    expect(code).toMatch(/refundAllocationPartial\(/);
    expect(code).toMatch(/records\.walletHeld/);
    expect(code).toMatch(/records\.walletRefunded/);
  });

  // Info: (20260818 - Luphia) 集中標記本身要在那個檔案裡，且指得出恢復條件
  it("集中標記寫在旗標旁邊，並列出 A / B / C 三類", () => {
    const gate = codeOf(GATE_FILE);
    expect(gate).toMatch(/同時失效的行為/);
    expect(gate).toMatch(/因為這個旗標而不可達/);
    expect(gate).toMatch(/與這個旗標無關/);
    expect(gate).toMatch(/不可刪/);
  });
});
