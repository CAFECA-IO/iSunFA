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

  /**
   * Info: (20260820 - Luphia) 以**宣告**定位，不是以名字定位。
   *
   * 原本用 `repo.indexOf(name)`，而降級排程那一輪在 `expireOverdue` 的註解裡寫了
   * 「見 downgradeToFree 的同一段說明」——於是 `downgradeToFree` 的起點落在那句
   * 註解上，切出來的範圍完全不是那支函式的內容，測試紅在一個與行為無關的地方。
   * 註解提到別的函式名是很正常的事，所以該修的是定位方式。
   */
  function declarationIndex(name: string): number {
    const match = new RegExp(
      `(?:export\\s+async\\s+function|async)\\s+${name}\\s*\\(`,
    ).exec(repo);
    return match?.index ?? -1;
  }

  it.each(MUTATORS)("%s 會標記待同步", (mutator) => {
    const start = declarationIndex(mutator);
    expect(start).toBeGreaterThan(-1);

    // Info: (20260819 - Luphia) 到下一個 mutator 的宣告或檔尾為止，就是這一支的範圍
    const nextStarts = MUTATORS.map((other) =>
      other === mutator ? -1 : declarationIndex(other),
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

/**
 * Info: (20260820 - Luphia) 對外報價不得因為「查不到」而顯示免費（self-review 風險 3）。
 *
 * 目錄缺項時的舊 fallback 是一組零值，而價格 0 在方案卡上顯示為「免費」——
 * 團隊版那一格會標成免費，而購買鈕又因為 `unknown planKey` 拒絕開啟：
 * 對外報價出錯，兩處還互相矛盾。掃描測試守住這兩個檔案不再回退成零。
 */
describe("價格查不到時不顯示免費", () => {
  it("方案頁的目錄查表不再回零值 fallback", () => {
    const content = codeOf(
      "src",
      "app",
      "(landing)",
      "pricing",
      "subscription",
      "subscription_content.tsx",
    );

    expect(content).not.toMatch(/monthlyPrice: 0/);
    expect(content).toMatch(
      /monthlyPrice=\{planOf\(TEAM_PLAN\.\w+\)\?\.monthlyPrice \?\? null\}/,
    );
  });

  it("方案卡在價格為 null 時顯示佔位並停用購買鈕", () => {
    const card = codeOf("src", "components", "pricing", "pricing_card.tsx");

    expect(card).toMatch(/priceUnavailable/);
    expect(card).toMatch(/disabled=\{priceUnavailable\}/);
  });

  /**
   * Info: (20260820 - Luphia) 反過來也要釘住：**目前方案不得停用購買鈕**
   *（self-review A-1 / A-2）。
   *
   * 停用它會讓「改計費週期」與「提早延長」都做不到，而伺服器端支援兩者；
   * 更難察覺的是 `currentPlan` 來自顯示答案（鏈上為準），鏈上虛高時
   * 使用者會買不回自己實際沒有的方案。
   */
  it("目前方案只標記、不停用", () => {
    const card = codeOf("src", "components", "pricing", "pricing_card.tsx");

    expect(card).not.toMatch(/disabled=\{isCurrentPlan/);
    expect(card).toMatch(/pricing\.extend_plan/);
  });
});

/**
 * Info: (20260820 - Luphia) 展延要在**付款前**說清楚（產品決定 20260820：
 * 不設預付上限，但要明確告知）。
 *
 * 履行是自當期屆滿日累加，而使用者的預設想像是「從今天起算」。兩者差幾天，
 * 不說就只能事後自己推——而條款寫的是「付款畫面於送出前會顯示本次購買的起算日」，
 * 那句話必須有對應的實作。
 */
describe("展延的付款前揭露", () => {
  it("選定團隊後會查當期期末並傳給選擇器", () => {
    const hook = codeOf("src", "hooks", "use_purchase_target.tsx");

    expect(hook).toMatch(/\/subscription`/);
    expect(hook).toMatch(/extensionPeriodEndSec=\{periodEndSec\}/);
  });

  it("選擇器在當期未結束時顯示起算日", () => {
    const selector = codeOf(
      "src",
      "components",
      "pricing",
      "purchase_target_selector.tsx",
    );

    expect(selector).toMatch(/purchase_target\.extension_note/);
    expect(selector).toMatch(/extensionPeriodEndSec !== null/);
  });

  // Info: (20260820 - Luphia) 五語系都要有那一段文案（缺一個語系就是那個語系看不到揭露）
  it.each(["zh_tw", "en", "zh_cn", "ja", "ko"])(
    "%s 有 extension_note 文案",
    (locale) => {
      expect(
        readFileSync(
          join(
            process.cwd(),
            "src",
            "i18n",
            "locales",
            locale,
            "purchase_target.ts",
          ),
          "utf8",
        ),
      ).toMatch(/extension_note/);
    },
  );
});
