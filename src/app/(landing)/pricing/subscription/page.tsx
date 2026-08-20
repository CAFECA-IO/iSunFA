import PricingContainer from "@/components/pricing/pricing_container";
import SubscriptionContent from "@/app/(landing)/pricing/subscription/subscription_content";
import { Metadata } from "next";
import { TEAM_PLAN, type TeamPlanId } from "@/constants/subscription_quota";
import { listPlans, type IPlanCatalogEntry } from "@/services/plan.service";
import { resolveFaithMemoryRetentionDays } from "@/services/faith_memory.service";

export const metadata: Metadata = {
  title: "iSunFA 訂閱方案 | AI 財務助理、自動化會計與碳足跡計算",
  description:
    "選擇最適合您企業的 iSunFA 訂閱方案。提供 AI 財務諮詢、自動會計分錄、進出口報關單解析及運輸碳足跡計算。微型、中小企業及大型企業均有對應方案，提升效率並降低營運成本。",
  keywords: [
    "iSunFA 訂閱價格",
    "AI 財務助理",
    "FIDO2 金鑰",
    "碳足跡查詢價格",
    "會計自動化",
  ],
};

/**
 * Info: (20260809 - Luphia) 額度倍數於 server 端自 DB 讀取後計算，再傳入 client component：
 * 額度是保存於 DB 的系統設定，client 端無從查詢；於此算好傳入可確保
 * SSR 與水合結果一致，且後台調整額度後定價頁自動同步。
 * 兩視窗倍數不一致時取較小值並無條件捨去——對外一律報保守值，絕不高報額度。
 */
function quotaMultiple(
  plans: IPlanCatalogEntry[],
  plan: TeamPlanId,
  base: TeamPlanId,
): number {
  const target = plans.find((entry) => entry.id === plan)?.quota;
  const baseline = plans.find((entry) => entry.id === base)?.quota;
  // Info: (20260819 - Luphia) 目錄缺項就報 1 倍（保守值），不對外報一個算不出來的倍數
  if (!target || !baseline) return 1;
  return Math.floor(
    Math.min(target.per5h / baseline.per5h, target.perWeek / baseline.perWeek),
  );
}

export default async function SubscriptionPricingPage() {
  /**
   * Info: (20260812 - Luphia) 額度倍數與記憶保留天數都是 DB 系統設定，於 server 端讀妥後
   * 傳入 client component：client 無從查詢 DB，於此取值可確保 SSR 與水合結果一致，
   * 且後台調整設定後方案頁自動同步（見下方 quotaMultiple 的說明）。
   */
  /**
   * Info: (20260819 - Luphia) 方案目錄一律經 `plan.service`（集中化 20260819）。
   *
   * 這裡原本直接 import 價格常數、也直接呼叫 repository —— 於是「有哪些方案、
   * 各自多少錢／多少額度」在方案頁、付款容器、方案卡各有一份讀法。
   * 現在只有 `listPlans()` 讀得到那些來源，畫面拿到的是同一份目錄。
   */
  const [plans, faithMemoryRetentionDays] = await Promise.all([
    listPlans(),
    resolveFaithMemoryRetentionDays(),
  ]);
  return (
    <PricingContainer activeTab="subscription" plans={plans}>
      <SubscriptionContent
        plans={plans}
        teamQuotaMultiple={quotaMultiple(plans, TEAM_PLAN.TEAM, TEAM_PLAN.FREE)}
        businessQuotaMultiple={quotaMultiple(
          plans,
          TEAM_PLAN.BUSINESS,
          TEAM_PLAN.TEAM,
        )}
        faithMemoryRetentionDays={faithMemoryRetentionDays}
      />
    </PricingContainer>
  );
}
