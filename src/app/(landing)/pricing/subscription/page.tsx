import PricingContainer from "@/components/pricing/pricing_container";
import SubscriptionContent from "@/app/(landing)/pricing/subscription/subscription_content";
import { Metadata } from "next";
import {
  ISubscriptionQuota,
  TEAM_PLAN,
  type TeamPlanId,
} from "@/constants/subscription_quota";
import { subscriptionPlanQuotaRepo } from "@/repositories/subscription_plan_quota.repo";

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
  quotas: Record<TeamPlanId, ISubscriptionQuota>,
  plan: TeamPlanId,
  base: TeamPlanId,
): number {
  const target = quotas[plan];
  const baseline = quotas[base];
  return Math.floor(
    Math.min(target.per5h / baseline.per5h, target.perWeek / baseline.perWeek),
  );
}

export default async function SubscriptionPricingPage() {
  const quotas = await subscriptionPlanQuotaRepo.resolveAllQuotas();
  return (
    <PricingContainer activeTab="subscription">
      <SubscriptionContent
        teamQuotaMultiple={quotaMultiple(
          quotas,
          TEAM_PLAN.TEAM,
          TEAM_PLAN.FREE,
        )}
        businessQuotaMultiple={quotaMultiple(
          quotas,
          TEAM_PLAN.BUSINESS,
          TEAM_PLAN.TEAM,
        )}
      />
    </PricingContainer>
  );
}
