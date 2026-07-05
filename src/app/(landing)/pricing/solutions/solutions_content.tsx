"use client";

import SolutionsPricingSection from "@/components/pricing/solutions_pricing_section";
import { usePricing } from "@/contexts/pricing_context";

export default function SolutionsContent() {
  const { onSelectCustomPlan } = usePricing();
  return (
    <>
      <SolutionsPricingSection onSelect={onSelectCustomPlan} />
    </>
  );
}
