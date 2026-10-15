import { describe, it, expect } from "@jest/globals";
import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";

/**
 * Info: (20260819 - Luphia) 方案顯示與訂閱卡同步的**接線**掃描。
 *
 * 這一支守的是三件用單元測試看不到、但只要一改就會讓缺陷原封不動回來的事：
 *
 * 1. 前端不再從那個永遠 undefined 的欄位推方案（`user.plan === "personal"`）。
 * 2. （已退役）訂閱變更標記鏈上卡片待同步。
 * 3. （已退役）worker 掛上卡片同步迴圈。
 *
 * Info: (20261015 - Luphia) 自建鏈退役後會員卡 NFT 整條移除（付款完成即視為有效，
 * DB 為準）。第 2、3 條改成反向斷言：卡片同步不得以任何形式回來。
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

  it("/auth/me 只經 plan.service 的單一入口，且不再回 planSource", () => {
    const route = codeOf("src", "app", "api", "v1", "auth", "me", "route.ts");

    expect(route).toMatch(/from "@\/services\/plan\.service"/);
    expect(route).toMatch(/getUserPlan\(/);
    expect(route).toMatch(/plan: planSnapshot\.plan/);
    expect(route).toMatch(/ownedPlans: planSnapshot\.ownedPlans/);
    /**
     * Info: (20260821 - Luphia) `planSource` 已取消（產品裁定 20260821：方案一律
     * 讀 DB，沒有第二個來源就沒有「來源」要說明）。這條反向斷言擋「改回讀鏈上」
     * 的重構。
     */
    expect(route).not.toMatch(/planSource:/);
  });

  it("方案顯示路徑不 import 任何鏈上讀取", () => {
    const service = codeOf("src", "services", "plan.service.ts");

    expect(service).not.toMatch(/from "@\/lib\/viem"/);
    expect(service).not.toMatch(/readOwnedChainCards/);
  });
});

/**
 * Info: (20261015 - Luphia) 會員卡 NFT 同步已隨區塊鏈退役移除。
 *
 * 原本這裡逐一檢查每條訂閱寫入路徑都標記 `CARD_DIRTY`、worker 掛上 `SubscriptionCardSync`。
 * 鏈已損毀，那條同步只會無限失敗；產品裁定付款完成即視為會員卡有效。
 * 反向釘住：服務檔不存在、worker 不再掛迴圈、repo 不再寫 nftSync 欄位。
 */
describe("會員卡同步已退役", () => {
  it("訂閱卡服務已刪除", () => {
    expect(
      existsSync(
        join(process.cwd(), "src", "services", "subscription_nft.service.ts"),
      ),
    ).toBe(false);
  });

  it("worker 不再掛 SubscriptionCardSync", () => {
    const worker = codeOf("scripts", "run_worker.ts");

    expect(worker).not.toMatch(/SubscriptionCardSync/);
    expect(worker).not.toMatch(/subscription_nft/);
  });

  it("訂閱 repo 不再標記卡片待同步", () => {
    const repo = codeOf("src", "repositories", "team_subscription.repo.ts");

    expect(repo).not.toMatch(/CARD_DIRTY/);
    expect(repo).not.toMatch(/nftSync/);
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

/**
 * Info: (20260820 - Luphia) 排程中的降級也要在付款前說：購買會取代它
 *（升級在履行時清掉、同方案的延長在建單前取消），而使用者是刻意排定它的。
 */
describe("排程降級的付款前揭露", () => {
  it("選擇器在有排程時說明這筆購買會取消它", () => {
    const selector = codeOf(
      "src",
      "components",
      "pricing",
      "purchase_target_selector.tsx",
    );

    expect(selector).toMatch(/purchase_target\.pending_downgrade_note/);
    /**
     * Info: (20260820 - Luphia) 兩個條件都要斷言。
     *
     * 只驗其中一個時，把另一半改成 `false`（整段揭露消失）測試照樣是綠的——
     * **掃描測試只保護它真的比對到的那幾個字**。
     */
    expect(selector).toMatch(/pendingPlanId !== null/);
    expect(selector).toMatch(/pendingEffectiveAt !== null/);
  });

  it("hook 一併取回排程資訊並傳下去", () => {
    const hook = codeOf("src", "hooks", "use_purchase_target.tsx");

    expect(hook).toMatch(/pendingPlanId=\{pending\?\.planId \?\? null\}/);
    expect(hook).toMatch(
      /pendingEffectiveAt=\{pending\?\.effectiveAt \?\? null\}/,
    );
  });

  // Info: (20260820 - Luphia) 五語系都要有這段文案（缺一個就是那個語系看不到揭露）
  it.each(["zh_tw", "en", "zh_cn", "ja", "ko"])(
    "%s 有 pending_downgrade_note 文案",
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
      ).toMatch(/pending_downgrade_note/);
    },
  );
});

/**
 * Info: (20260820 - Luphia) 降級走購買流程時**不得**進入付款（self-review 第二輪，嚴重）。
 *
 * `PUT /subscription` 對降級回 `orderId: null`，而付款畫面先前直接把回應當訂單用：
 * `completeCheckout(null, undefined)` 讓簽章失敗——**排程已經寫入 DB，而使用者
 * 看到付款錯誤**。型別把 `orderId` 宣告成 `string`（契約說謊），所以編譯器沒擋。
 */
describe("排程結果不進入付款流程", () => {
  it("hook 以可辨識聯集回報「不需付款」", () => {
    const hook = codeOf("src", "hooks", "use_purchase_target.tsx");

    expect(hook).toMatch(/kind: "scheduled"/);
    /**
     * Info: (20260821 - Luphia) 改為直接讀 server 的 `kind`（簡化 20260821）：
     * 兩邊各自從 `orderId` 推斷同一件事，只是多一個會不一致的地方。
     */
    expect(hook).toMatch(/response\.payload\.kind === "scheduled"/);
  });

  it("付款畫面分流到專屬的一頁，不呼叫 completeCheckout", () => {
    const modal = codeOf("src", "components", "pricing", "payment_modal.tsx");

    expect(modal).toMatch(/outcome\.kind === "scheduled"/);
    expect(modal).toMatch(/PaymentStep\.scheduled/);
  });

  it("orderCreator 的型別本身就分得出兩種結果", () => {
    const contract = codeOf("src", "interfaces", "payment.ts");

    expect(contract).toMatch(/kind: "order"/);
    expect(contract).toMatch(/kind: "scheduled"/);
  });

  // Info: (20260820 - Luphia) 五語系都要有那一頁的文案
  it.each(["zh_tw", "en", "zh_cn", "ja", "ko"])(
    "%s 有 scheduled_title / scheduled_body",
    (locale) => {
      const file = readFileSync(
        join(process.cwd(), "src", "i18n", "locales", locale, "pricing.ts"),
        "utf8",
      );

      expect(file).toMatch(/scheduled_title/);
      expect(file).toMatch(/scheduled_body/);
    },
  );
});

/**
 * Info: (20260821 - Luphia) 計費週期欄位的**遷移安全性**（review #6687 三輪）。
 *
 * 這件事單元測試看不到：測試一律 mock repo，DB 的欄位預設值進不了測試——
 * 把 schema 改回 `@default("month")`，`seat_quote_contract` 的兩條新案例
 * （NULL → 擋下）仍然全綠，因為它們是自己餵 null 進去的。
 *
 * 而那個預設值是真正的風險所在：本專案沒有 migrations 目錄，`db push` 之後
 * 既有列一律拿到預設值。給 `"month"` 就是給年繳列一個**完全合法、只是錯的**
 * 值——`quoteSeatAddition` 的守門只認不合法的值，看不見它，於是回填之前
 * 年繳團隊加人的補收分母是 30 天而不是 365（多收約 12 倍，且 5 席以上剛好
 * 撞不到 2 倍上限）。所以這一條盯的是 schema 原文，與 `hr_enum_mirror` 同理：
 * schema.prisma 在 git 裡、永遠與分支同代，是唯一可靠的對照組。
 */
describe("計費週期欄位不得有 DB 預設值", () => {
  const schema = read("prisma", "schema.prisma");

  function declarationOf(field: string): string {
    const line = schema
      .split("\n")
      .find((candidate) => candidate.trim().startsWith(`${field} `));
    return line ?? "";
  }

  it("billingInterval 是 nullable 且沒有 @default", () => {
    const line = declarationOf("billingInterval");

    expect(line).toContain("String?");
    expect(line).not.toContain("@default");
  });
});
