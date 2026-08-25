import PricingContainer from "@/components/pricing/pricing_container";
import { listPlans } from "@/services/plan.service";
import CreditsContent from "@/app/(landing)/pricing/credits/credits_content";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "iSunFA 點數購買 | 彈性購買 AI 分析額度",
  description:
    "根據需求隨時加購 iSunFA 點數。點數可用於 AI 財務諮詢、報關單分析、碳足跡計算及各類 AI 報告生成。購買越多折扣越高，永久有效，讓您的企業營運更有彈性。",
  keywords: ["iSunFA 點數", "AI 額度加購", "會計自動化點數", "碳盤查工具點數"],
};

export default async function CreditsPricingPage() {
  return (
    <PricingContainer activeTab="credits" plans={await listPlans()}>
      <CreditsContent />
    </PricingContainer>
  );
}
