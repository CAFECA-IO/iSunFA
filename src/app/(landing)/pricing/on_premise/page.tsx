import PricingContainer from "@/components/pricing/pricing_container";
import OnPremiseContent from "@/app/(landing)/pricing/on_premise/on_premise_content";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "iSunFA 本地部署方案 | 企業級 AI 節點與數據安全方案",
  description:
    "iSunFA 提供企業級本地部署 (On-Premise) 方案，確保數據隱私與高度安全。內置高效能 AI 運算節點，支援多語系會計處理與碳盤查模組，適合對數據安全有極高要求的中大型企業。",
  keywords: [
    "iSunFA 本地部署",
    "私有雲 AI",
    "數據安全",
    "企業 AI 節點",
    "ASUS ASCENT GX10",
  ],
};

export default function OnPremisePricingPage() {
  return (
    <PricingContainer activeTab="on_premise">
      <OnPremiseContent />
    </PricingContainer>
  );
}
