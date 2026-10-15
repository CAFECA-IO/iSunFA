jest.mock("@/lib/prisma", () => ({ prisma: {} }));

import {
  IRedispatchCandidate,
  selectRedispatchableOrders,
} from "@/services/team_quota_redispatch.service";
import { ANALYSIS_CATEGORY } from "@/constants/analysis";

/**
 * Info: (20261015 - Luphia) 補派卡住的團隊額度訂單：只補「團隊額度付款、從未派發、需要任務」的單。
 * 補錯方向的代價是重複執行一份已經交付的分析（再扣一次執行成本），所以每條排除都要釘住。
 */

const TEAM_QUOTA = JSON.stringify({
  verifiedVia: "team_quota",
  source: "QUOTA",
});

function candidate(
  partial: Partial<IRedispatchCandidate>,
): IRedispatchCandidate {
  return {
    id: "o1",
    userId: "u1",
    data: { category: ANALYSIS_CATEGORY.FINANCIAL_HEALTH },
    signature: TEAM_QUOTA,
    mission: null,
    createdAt: new Date("2026-10-01T00:00:00Z"),
    ...partial,
  };
}

describe("selectRedispatchableOrders", () => {
  it("補派團隊額度付款、未派發的分析訂單", () => {
    const { toRedispatch } = selectRedispatchableOrders([candidate({})]);
    expect(toRedispatch.map((o) => o.id)).toEqual(["o1"]);
  });

  it("認得巢狀在 data.data 的 category", () => {
    const { toRedispatch } = selectRedispatchableOrders([
      candidate({ data: { data: { category: ANALYSIS_CATEGORY.CASH_FLOW } } }),
    ]);
    expect(toRedispatch).toHaveLength(1);
  });

  it.each([
    [
      "個人點數付款",
      { signature: JSON.stringify({ verifiedVia: "point_ledger" }) },
    ],
    ["非 JSON 的舊簽章", { signature: "raw-webauthn-signature" }],
    ["已派發過", { mission: '["12"]' }],
    ["沒有 category", { data: {} }],
  ] as [string, Partial<IRedispatchCandidate>][])(
    "不補派：%s",
    (_label, partial) => {
      const { toRedispatch, skipped } = selectRedispatchableOrders([
        candidate(partial),
      ]);
      expect(toRedispatch).toEqual([]);
      expect(skipped).toHaveLength(1);
    },
  );

  it("物流碳足跡也補派（碳排／里程核算都等任務產出結果）", () => {
    const { toRedispatch } = selectRedispatchableOrders([
      candidate({
        data: { category: ANALYSIS_CATEGORY.TRANSPORTATION_CARBON_FOOTPRINT },
      }),
    ]);
    expect(toRedispatch).toHaveLength(1);
  });

  it("空的 mission 陣列視為未派發", () => {
    const { toRedispatch } = selectRedispatchableOrders([
      candidate({ mission: "[]" }),
    ]);
    expect(toRedispatch).toHaveLength(1);
  });
});
