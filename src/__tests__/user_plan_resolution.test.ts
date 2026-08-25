import { describe, it, expect } from "@jest/globals";
import {
  isTeamPlanId,
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
