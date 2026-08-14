import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import {
  BLOCKING_REASON,
  PURCHASE_MODE,
  filterEligibleTeams,
  resolveBlockingReason,
  resolvePurchaseMode,
} from "@/lib/purchase/purchase_target";
import { TEAM_PLAN } from "@/constants/subscription_quota";
import { TeamRole } from "@/constants/team";

/**
 * Info: (20260814 - Luphia) 訂閱 / 購點的歸屬對象規則（設計書 §6.1、§7、§6.4）。
 *
 * 這些規則的失敗方式是無聲的：選不到團隊的人只會覺得「按鈕壞了」，
 * 而漏擋的人會建出一張沒有歸屬的訂單——付得掉、履行不了、錢已經收了。
 */

describe("purchase mode", () => {
  it("treats team and business plans as team subscriptions", () => {
    expect(resolvePurchaseMode(TEAM_PLAN.TEAM, undefined)).toBe(
      PURCHASE_MODE.SUBSCRIPTION,
    );
    expect(resolvePurchaseMode(TEAM_PLAN.BUSINESS, undefined)).toBe(
      PURCHASE_MODE.SUBSCRIPTION,
    );
  });

  it("treats a credit pack without a plan as a credit purchase", () => {
    expect(resolvePurchaseMode("", "tier2")).toBe(PURCHASE_MODE.CREDIT_PACK);
  });

  /**
   * Info: (20260814 - Luphia) 客製方案走匯款、由業務接手，沒有自動履行。
   * 若誤判成需要選團隊，這些方案的送出鈕會被「請先選擇團隊」永久擋住。
   */
  it("leaves bank-transfer solutions out of the team flow", () => {
    expect(resolvePurchaseMode("on_premise", undefined)).toBe(
      PURCHASE_MODE.NONE,
    );
    expect(resolvePurchaseMode("iso14064_small", undefined)).toBe(
      PURCHASE_MODE.NONE,
    );
    expect(resolvePurchaseMode("", undefined)).toBe(PURCHASE_MODE.NONE);
  });
});

describe("eligible teams", () => {
  const TEAMS = [
    { id: "t1", role: TeamRole.OWNER },
    { id: "t2", role: TeamRole.ADMIN },
    { id: "t3", role: TeamRole.EDITOR },
    { id: "t4", role: null },
  ];

  it("limits subscriptions to teams the user owns", () => {
    const eligible = filterEligibleTeams(TEAMS, PURCHASE_MODE.SUBSCRIPTION);
    expect(eligible.map((team) => team.id)).toEqual(["t1"]);
  });

  it("lets owners and admins buy team credits", () => {
    const eligible = filterEligibleTeams(TEAMS, PURCHASE_MODE.CREDIT_PACK);
    expect(eligible.map((team) => team.id)).toEqual(["t1", "t2"]);
  });

  it("offers no teams when the purchase needs no target", () => {
    expect(filterEligibleTeams(TEAMS, PURCHASE_MODE.NONE)).toEqual([]);
  });
});

describe("blocking reason", () => {
  it("blocks a team purchase until a team is chosen", () => {
    expect(
      resolveBlockingReason({
        mode: PURCHASE_MODE.SUBSCRIPTION,
        usesTeam: true,
        eligibleTeamCount: 3,
        selectedTeamId: null,
      }),
    ).toBe(BLOCKING_REASON.TEAM_NOT_SELECTED);
  });

  it("explains that no team is eligible rather than asking for a choice", () => {
    expect(
      resolveBlockingReason({
        mode: PURCHASE_MODE.SUBSCRIPTION,
        usesTeam: true,
        eligibleTeamCount: 0,
        selectedTeamId: null,
      }),
    ).toBe(BLOCKING_REASON.NO_ELIGIBLE_TEAM);
  });

  it("never blocks a personal credit purchase", () => {
    expect(
      resolveBlockingReason({
        mode: PURCHASE_MODE.CREDIT_PACK,
        usesTeam: false,
        eligibleTeamCount: 0,
        selectedTeamId: null,
      }),
    ).toBeNull();
  });

  // Info: (20260814 - Luphia) 客製方案不受此機制影響，否則匯款流程會被擋死
  it("never blocks a purchase that needs no target", () => {
    expect(
      resolveBlockingReason({
        mode: PURCHASE_MODE.NONE,
        usesTeam: true,
        eligibleTeamCount: 0,
        selectedTeamId: null,
      }),
    ).toBeNull();
  });

  it("allows payment once a team is selected", () => {
    expect(
      resolveBlockingReason({
        mode: PURCHASE_MODE.CREDIT_PACK,
        usesTeam: true,
        eligibleTeamCount: 2,
        selectedTeamId: "t1",
      }),
    ).toBeNull();
  });
});

/**
 * Info: (20260814 - Luphia) 端點存在不等於使用者到得了。
 *
 * `PUT /team/{id}/subscription` 與 `POST /team/{id}/wallet/purchase` 寫好之後，
 * 有很長一段時間**沒有任何前端呼叫**——團隊訂閱與團隊購點在畫面上根本不存在，
 * 而定價頁的訂閱則悄悄變成了購買個人點數。這組檢查把「接上了」固定下來。
 */
describe("team purchase entry points", () => {
  const HOOK = readFileSync(
    join(process.cwd(), "src", "hooks", "use_purchase_target.tsx"),
    "utf8",
  );

  it("creates subscription orders through the team endpoint", () => {
    expect(HOOK).toMatch(/\/api\/v1\/user\/team\/\$\{[^}]+\}\/subscription/);
  });

  it("creates team credit orders through the team wallet endpoint", () => {
    expect(HOOK).toMatch(
      /\/api\/v1\/user\/team\/\$\{[^}]+\}\/wallet\/purchase/,
    );
  });

  it("wires the selector, order creator and blocker into the pricing modal", () => {
    const container = readFileSync(
      join(
        process.cwd(),
        "src",
        "components",
        "pricing",
        "pricing_container.tsx",
      ),
      "utf8",
    );
    expect(container).toContain("targetSelector={purchaseTarget.targetNode}");
    expect(container).toContain("orderCreator={purchaseTarget.orderCreator}");
    expect(container).toContain(
      "purchaseBlockingMessage={purchaseTarget.blockingMessage}",
    );
  });

  /**
   * Info: (20260814 - Luphia) modal 收到 orderCreator 卻不用，等於選了團隊也沒用——
   * 訂單仍由通用端點建立，teamId 一樣不在裡面。
   */
  it("actually uses the injected order creator", () => {
    const modal = readFileSync(
      join(process.cwd(), "src", "components", "pricing", "payment_modal.tsx"),
      "utf8",
    );
    expect(modal).toMatch(/if\s*\(orderCreator\)\s*\{/);
    expect(modal).toMatch(/await orderCreator\(selectedPaymentMethodId\)/);
  });
});
