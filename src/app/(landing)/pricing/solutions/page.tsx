import PricingContainer from "@/components/pricing/pricing_container";
import SolutionsContent from "@/app/(landing)/pricing/solutions/solutions_content";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "iSunFA 專業碳盤查解決方案 | 組織、產品與碳足跡標章",
  description:
    "iSunFA 提供專業的碳管理解決方案，包含 ISO 14064-1 組織碳盤查、ISO 14067 產品碳足跡計算及碳足跡標章申請。專為微型、中小企業及大型企業設計的靜態價格與服務流程。",
  keywords: [
    "組織碳盤查",
    "產品碳足跡",
    "碳標章申請",
    "ISO 14064",
    "ISO 14067",
    "永續解決方案",
  ],
};

export default function SolutionsPricingPage() {
  return (
    <PricingContainer activeTab="solutions">
      <SolutionsContent />
    </PricingContainer>
  );
}
