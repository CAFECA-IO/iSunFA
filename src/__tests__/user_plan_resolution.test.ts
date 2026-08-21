import { describe, it, expect } from "@jest/globals";
import {
  isChainCopyStale,
  isTeamPlanId,
  PLAN_SOURCE,
  reconcilePlan,
  resolveHighestPlan,
  resolveUnanimousPlan,
} from "@/lib/subscription/plan_rules";
import { TEAM_PLAN } from "@/constants/subscription_quota";

/**
 * Info: (20260819 - Luphia) 「這個人是什麼方案」的兩條顯示規則。
 *
 * 兩條而不是一條，是因為兩個位置的**後果不同**：徽章只是一行字，
 * 而方案頁的「目前方案」標記會停用購買鈕。這一支把兩者的差異釘住，
 * 否則「統一成一條比較乾淨」的重構會把購買鈕鎖掉一整類使用者。
 *
 * Info: (20260820 - Luphia) `PLAN_RANK` 本身的次序在
 * `subscription_downgrade_schedule.test.ts` 驗（它與 `isPlanDowngrade` 同源，
 * 決定降級於期末才生效）。同一組數字在兩支測試裡各斷言一次沒有增加保護。
 */

describe("徽章：取最高", () => {
  it("沒有任何團隊時是免費版", () => {
    expect(resolveHighestPlan([])).toBe(TEAM_PLAN.FREE);
  });

  it("單一團隊就是那個方案", () => {
    expect(resolveHighestPlan([TEAM_PLAN.TEAM])).toBe(TEAM_PLAN.TEAM);
  });

  /**
   * Info: (20260819 - Luphia) 這是回報的那個症狀的正解：擁有一個免費團隊與一個
   * 團隊版團隊的人，徽章要說團隊版——他確實是付費客戶。
   */
  it("混合時取最高", () => {
    expect(resolveHighestPlan([TEAM_PLAN.FREE, TEAM_PLAN.TEAM])).toBe(
      TEAM_PLAN.TEAM,
    );
    expect(
      resolveHighestPlan([TEAM_PLAN.TEAM, TEAM_PLAN.FREE, TEAM_PLAN.BUSINESS]),
    ).toBe(TEAM_PLAN.BUSINESS);
  });

  it("順序不影響結果", () => {
    expect(resolveHighestPlan([TEAM_PLAN.BUSINESS, TEAM_PLAN.FREE])).toBe(
      resolveHighestPlan([TEAM_PLAN.FREE, TEAM_PLAN.BUSINESS]),
    );
  });
});

describe("方案頁標記：全體一致才標", () => {
  /**
   * Info: (20260819 - Luphia) 沒有團隊時**不標**（不是標免費版）。
   *
   * 標了會把免費版那一格的鈕也停掉，而這個人確實可以去建團隊再訂閱。
   */
  it("沒有團隊時不標任何一格", () => {
    expect(resolveUnanimousPlan([])).toBeUndefined();
  });

  it("全部相同就標那一格", () => {
    expect(resolveUnanimousPlan([TEAM_PLAN.TEAM, TEAM_PLAN.TEAM])).toBe(
      TEAM_PLAN.TEAM,
    );
    expect(resolveUnanimousPlan([TEAM_PLAN.FREE])).toBe(TEAM_PLAN.FREE);
  });

  /**
   * Info: (20260819 - Luphia) 這一條是「不能照最高標」的理由。
   *
   * 擁有免費團隊 T1 與團隊版團隊 T2 的人，若把團隊版標成目前方案，
   * 團隊版那一格的鈕就會停用——他再也無法為 T1 訂閱團隊版。
   */
  it("方案不一致時不標，讓所有購買鈕都可用", () => {
    expect(
      resolveUnanimousPlan([TEAM_PLAN.FREE, TEAM_PLAN.TEAM]),
    ).toBeUndefined();
    expect(
      resolveUnanimousPlan([TEAM_PLAN.TEAM, TEAM_PLAN.BUSINESS]),
    ).toBeUndefined();
  });
});

describe("未知方案代號", () => {
  it("認得三個已知方案", () => {
    expect(isTeamPlanId(TEAM_PLAN.FREE)).toBe(true);
    expect(isTeamPlanId(TEAM_PLAN.TEAM)).toBe(true);
    expect(isTeamPlanId(TEAM_PLAN.BUSINESS)).toBe(true);
  });

  /**
   * Info: (20260819 - Luphia) 認不出來就丟掉，**不當成免費版**。
   *
   * `plan_id` 在資料庫是自由字串。哪天多了一個新方案代號，把它當免費版
   * 會讓付費戶在畫面上看到「免費版」；丟掉只是不標記——錯的方向差很多。
   */
  it("認不出來的值一律排除", () => {
    expect(isTeamPlanId("enterprise")).toBe(false);
    expect(isTeamPlanId("personal")).toBe(false);
    expect(isTeamPlanId("")).toBe(false);
    expect(["team", "enterprise"].filter(isTeamPlanId)).toEqual([
      TEAM_PLAN.TEAM,
    ]);
  });
});

/**
 * Info: (20260819 - Luphia) DB 與鏈上各說一個方案時的對帳（產品決定 20260819：鏈上為準）。
 *
 * 兩個方向都要有測試，因為兩個方向的代價不對稱：
 * 「鏈上有、DB 沒有」照 DB 走會把付費戶打回免費版（最難解釋的錯）；
 * 「DB 有、鏈上沒有」照鏈上走會讓剛付款的人等一分鐘（可解釋、可觀測）。
 * 這一組斷言把那個取捨釘住——哪天有人改成 max(DB, 鏈上)，這裡會紅。
 */
describe("DB 與鏈上的對帳", () => {
  /**
   * Info: (20260820 - Luphia) 「鏈上為準」的前提是那份鏈上資料**確實是最新的**。
   *
   * 這一組把兩種情形分開釘住，因為它們的取捨方向相反：
   *
   * - 已確認同步 → 鏈上（不一致才是真的不一致，使用者手上握著憑證）
   * - 已知過期（待同步）→ DB，且**不算不一致**（我們自己還沒寫上去）
   */
  it("已同步且一致時回該方案，不記為不一致", () => {
    expect(
      reconcilePlan({
        dbPlan: TEAM_PLAN.TEAM,
        chainPlan: TEAM_PLAN.TEAM,
        chainStale: false,
      }),
    ).toEqual({
      plan: TEAM_PLAN.TEAM,
      mismatch: false,
      source: PLAN_SOURCE.CHAIN,
    });
  });

  it("已同步：鏈上有、DB 沒有 → 回鏈上，並記為不一致", () => {
    expect(
      reconcilePlan({
        dbPlan: TEAM_PLAN.FREE,
        chainPlan: TEAM_PLAN.BUSINESS,
        chainStale: false,
      }),
    ).toEqual({
      plan: TEAM_PLAN.BUSINESS,
      mismatch: true,
      source: PLAN_SOURCE.CHAIN,
    });
  });

  /**
   * Info: (20260820 - Luphia) 這一條是 self-review 抓到的嚴重項。
   *
   * 續訂在期末寫入新週期並把卡片標成待同步，而 URI 要等 worker 那一輪才換——
   * 在那之前卡片的 `period_end` 已經過期，折算為 free。照鏈上顯示會把**剛續訂
   * 成功的付費戶**打回免費版，而且每期都會發生一次。
   */
  it("待同步：DB 說付費而鏈上那份已過期 → 回 DB，且不算不一致", () => {
    expect(
      reconcilePlan({
        dbPlan: TEAM_PLAN.TEAM,
        chainPlan: TEAM_PLAN.FREE,
        chainStale: true,
      }),
    ).toEqual({
      plan: TEAM_PLAN.TEAM,
      mismatch: false,
      source: PLAN_SOURCE.PENDING_CHAIN,
    });
  });

  // Info: (20260820 - Luphia) 待同步期間就算鏈上讀到了更高的方案，也以 DB 為準（一致的規則）
  it("待同步：一律以 DB 為準", () => {
    expect(
      reconcilePlan({
        dbPlan: TEAM_PLAN.FREE,
        chainPlan: TEAM_PLAN.BUSINESS,
        chainStale: true,
      }).plan,
    ).toBe(TEAM_PLAN.FREE);
  });
});

describe("鏈上那份是不是已知過期", () => {
  const base = {
    syncedAt: null as Date | null,
    attempts: 0,
    updatedAtMs: 1_000_000,
    nowMs: 1_000_000 + 60_000,
    maxAttempts: 5,
    graceMs: 15 * 60_000,
  };

  it("有同步時間就不是過期", () => {
    expect(isChainCopyStale({ ...base, syncedAt: new Date() })).toBe(false);
  });

  it("待同步且在寬限內 → 過期（顯示改讀 DB）", () => {
    expect(isChainCopyStale(base)).toBe(true);
  });

  /**
   * Info: (20260820 - Luphia) 兩道界，缺一個就會讓「顯示付費」永久靠 DB 撐著，
   * 而鏈上根本沒有憑證——那時該修的是 worker，不是繼續遮蓋。
   */
  it("超過寬限 → 不再算過期（回到鏈上為準）", () => {
    expect(
      isChainCopyStale({ ...base, nowMs: base.updatedAtMs + 15 * 60_000 + 1 }),
    ).toBe(false);
  });

  it("重試已達上限 → 不再算過期", () => {
    expect(isChainCopyStale({ ...base, attempts: 5 })).toBe(false);
  });

  it("剛好在寬限邊界上仍算過期", () => {
    expect(
      isChainCopyStale({ ...base, nowMs: base.updatedAtMs + 15 * 60_000 }),
    ).toBe(true);
  });
});
