import { describe, it, expect } from "@jest/globals";
import { readFileSync, readdirSync } from "fs";
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

  it("/auth/me 只經 plan.service 的單一入口，並回傳逐團事實與來源", () => {
    const route = codeOf("src", "app", "api", "v1", "auth", "me", "route.ts");

    expect(route).toMatch(/from "@\/services\/plan\.service"/);
    expect(route).toMatch(/getUserPlan\(/);
    expect(route).toMatch(/plan: planSnapshot\.plan/);
    expect(route).toMatch(/ownedPlans: planSnapshot\.ownedPlans/);
    expect(route).toMatch(/planSource: planSnapshot\.source/);
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

/**
 * Info: (20260819 - Luphia) 方案只能有**一個門**（產品決定 20260819）。
 *
 * 這三條掃描守的是「集中化」本身。集中化不是一次性的重構，是一條會被下一次
 * 「順手 import 一下常數就好」推翻的約束——而推翻的症狀正是這一輪修的東西：
 * 方案頁顯示一組數字、收費用另一組、徽章又用第三組。
 */
describe("方案的單一入口", () => {
  const CATALOG_CONSTANTS =
    /SUBSCRIPTION_PLAN_PRICE|SUBSCRIPTION_PLAN_CREDITS|CARBON_STORAGE_QUOTA_GB_BY_PLAN/;

  // Info: (20260819 - Luphia) 目錄常數的定義處與唯一讀者
  const ALLOWED = [
    "src/constants/price.ts",
    "src/constants/carbon_chatbot.ts",
    "src/services/plan.service.ts",
  ];

  function listSourceFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "generated" || entry.name === "__tests__") return [];
        return listSourceFiles(full);
      }
      return entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")
        ? [full]
        : [];
    });
  }

  it("除了定義處，只有 plan.service 讀得到方案目錄常數", () => {
    const offenders = listSourceFiles(join(process.cwd(), "src"))
      .map((file) => file.slice(process.cwd().length + 1))
      .filter(
        (relative) =>
          !ALLOWED.includes(relative) &&
          CATALOG_CONSTANTS.test(
            readFileSync(join(process.cwd(), relative), "utf8")
              .split("\n")
              .map((line) => line.trim())
              .filter((line) => !line.startsWith("*") && !line.startsWith("//"))
              .join("\n"),
          ),
      );

    expect(offenders).toEqual([]);
  });

  /**
   * Info: (20260819 - Luphia) 純規則層不能碰儲存體或鏈。
   *
   * `plan_rules` 被 client component 匯入（方案頁的「目前方案」標記）——
   * 一旦它 import 了 repository 或 viem，那個頁面就打包不起來，
   * 而錯誤訊息會指向一個與方案毫無關係的地方。
   */
  it("plan_rules 只依賴 constants", () => {
    const rules = readFileSync(
      join(process.cwd(), "src", "lib", "subscription", "plan_rules.ts"),
      "utf8",
    );
    const imports = [...rules.matchAll(/from "([^"]+)"/g)].map(
      (match) => match[1],
    );

    for (const target of imports) {
      expect(target).toMatch(/^@\/(constants|lib)\//);
    }
  });

  // Info: (20260819 - Luphia) 折算規則不能再有第二份定義（原本在 spend.service）
  it("spend.service 不再自己定義方案折算規則", () => {
    const spend = codeOf("src", "services", "spend.service.ts");

    expect(spend).not.toMatch(/export function resolveEffectivePlanId/);
    expect(spend).not.toMatch(/export function resolvePlanId/);
    expect(spend).toMatch(/from "@\/lib\/subscription\/plan_rules"/);
  });

  // Info: (20260819 - Luphia) 權益讀取（扣費、席次、記憶）走 service 的權益入口
  it("只需要方案的呼叫端走 getTeamEntitlement", () => {
    for (const file of [
      ["src", "services", "team_invitation.service.ts"],
      ["src", "services", "faith_memory.service.ts"],
      ["src", "services", "team_subscription.service.ts"],
    ]) {
      expect(codeOf(...file)).toMatch(/getTeamEntitlement/);
    }
  });
});
