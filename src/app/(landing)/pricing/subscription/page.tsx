import PricingContainer from "@/components/pricing/pricing_container";
import SubscriptionContent from "@/app/(landing)/pricing/subscription/subscription_content";
import { Metadata } from "next";

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

export default function SubscriptionPricingPage() {
  return (
    <PricingContainer activeTab="subscription">
      <SubscriptionContent />
    </PricingContainer>
  );
}
