import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Info: (20260819 - Luphia) 方案顯示與訂閱卡同步的**接線**掃描。
 *
 * 這一支守的是三件用單元測試看不到、但只要一改就會讓缺陷原封不動回來的事：
 *
 * 1. 前端不再從那個永遠 undefined 的欄位推方案（`user.plan === "personal"`）。
 * 2. 訂閱資料的每一條變更路徑都會把鏈上卡片標成待同步——漏掉任何一條，
 *    那個團隊的卡片就會永久停在舊內容，而且**沒有任何錯誤**。
 * 3. worker 真的有掛上同步迴圈（服務寫好了但沒人呼叫，是最安靜的失敗）。
 */

function read(...segments: string[]): string {
  return readFileSync(join(process.cwd(), ...segments), "utf8");
}

/**
 * Info: (20260819 - Luphia) 去掉註解行才做「不該出現」的斷言。
 *
 * 否則**說明缺陷的註解本身**會讓測試變紅：這一輪的修正在同一個檔案裡寫下
 * 「原本讀 user.plan、原本寫死 personal」，而那正是要禁止的字串。
 * 同一個做法見 `chain_receipt_status.test.ts` 的 `codeOf`。
 */
function codeOf(...segments: string[]): string {
  return read(...segments)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => !line.startsWith("*") && !line.startsWith("//"))
    .join("\n");
}

describe("方案顯示的來源", () => {
  const pricing = codeOf(
    "src",
    "app",
    "(landing)",
    "pricing",
    "subscription",
    "subscription_content.tsx",
  );

  /**
   * Info: (20260819 - Luphia) 舊寫法把 `user.plan` 當唯一來源，而 `/auth/me`
   * 從來沒回過那個欄位——於是三格裡永遠是免費版被標成「目前方案」。
   */
  it("方案頁不再用 user.plan 推「目前方案」", () => {
    expect(pricing).not.toMatch(/user\.plan/);
  });

  it("方案頁用全體一致規則決定標記", () => {
    expect(pricing).toMatch(/resolveUnanimousPlan/);
  });

  // Info: (20260819 - Luphia) 徽章的 fallback 不寫死方案代號字面值
  it("徽章不再寫死 personal 方案代號", () => {
    const header = codeOf("src", "components", "header", "user_actions.tsx");

    expect(header).not.toMatch(/"personal"/);
    expect(header).toMatch(/PLAN\.FREE/);
  });

  it("/auth/me 回傳方案與逐團事實", () => {
    const route = read("src", "app", "api", "v1", "auth", "me", "route.ts");

    expect(route).toMatch(/getUserPlanSnapshot/);
    expect(route).toMatch(/plan: planSnapshot\.plan/);
    expect(route).toMatch(/ownedPlans: planSnapshot\.ownedPlans/);
  });
});

describe("訂閱變更都會標記卡片待同步", () => {
  const repo = read("src", "repositories", "team_subscription.repo.ts");

  /**
   * Info: (20260819 - Luphia) 逐一檢查**每個**會改變卡片內容的寫入路徑。
   *
   * 只斷言「檔案裡有 CARD_DIRTY」是不夠的：那在漏掉其中一條路徑時依然是綠的，
   * 而漏掉的症狀是「那個團隊的卡片永遠停在舊方案」——沒有錯誤、沒有 log。
   */
  const MUTATORS = [
    "applyTeamSubscriptionInTx",
    "addSeats",
    "expireOverdue",
    "markOverdueForRenewal",
    "downgradeToFree",
  ];

  it.each(MUTATORS)("%s 會標記待同步", (mutator) => {
    const start = repo.indexOf(mutator);
    expect(start).toBeGreaterThan(-1);

    // Info: (20260819 - Luphia) 到下一個 mutator 或檔尾為止，就是這一支的範圍
    const nextStarts = MUTATORS.map((other) =>
      other === mutator ? -1 : repo.indexOf(other, start + mutator.length),
    ).filter((index) => index > start);
    const end = nextStarts.length > 0 ? Math.min(...nextStarts) : repo.length;

    expect(repo.slice(start, end)).toMatch(/CARD_DIRTY/);
  });
});

describe("worker 掛上同步迴圈", () => {
  const worker = read("scripts", "run_worker.ts");

  it("註冊 SubscriptionCardSync", () => {
    expect(worker).toMatch(/syncPendingSubscriptionCards/);
    expect(worker).toMatch(/SubscriptionCardSync/);
    expect(worker).toMatch(/SUBSCRIPTION_CARD_SYNC_INTERVAL_MS/);
  });
});

describe("鏈上寫入仍走共用確認函式", () => {
  /**
   * Info: (20260819 - Luphia) 新的鑄卡路徑需要收據（要讀 Transfer 事件取 tokenId），
   * 而 `chain_receipt_status.test.ts` 禁止在 lib 之外自己等收據。
   * 這裡釘住它走的是共用函式的收據版本，而不是繞過那條規則。
   */
  it("訂閱卡服務用 confirmTransactionReceipt，不自己等收據", () => {
    const service = codeOf("src", "services", "subscription_nft.service.ts");

    expect(service).toMatch(/confirmTransactionReceipt/);
    expect(service).not.toMatch(/waitForTransactionReceipt/);
  });
});
