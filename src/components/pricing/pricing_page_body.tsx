import React from 'react';
import LandingNavbar from '@/components/landing_page_v2/landing_navbar';
import LandingFooter from '@/components/landing_page_v2/landing_footer';
import ScrollToTopButton from '@/components/landing_page_v2/scroll_to_top';
import PricingPlan from '@/components/pricing/pricing_plan';
import PlanComparison from '@/components/pricing/plan_comparison';

const PricingPageBody: React.FC = () => {
  return (
    <div className="relative flex flex-auto flex-col bg-landing-page-black py-32px font-dm-sans text-landing-page-white">
      {/* Info: (20240116 - Tzuhan) Background */}
      <div className="bg-pricing absolute inset-0"></div>

      {/* Info: (20240116 - Tzuhan) Header */}
      <LandingNavbar />

      {/* Info: (20240116 - Tzuhan) Navbar */}
      <main className="z-10 overflow-y-auto overflow-x-hidden pt-70px lg:pt-100px">
        {/* Info: (20240116 - Tzuhan) Pricing */}
        <PricingPlan />
        <PlanComparison />

        {/* Info: (20240116 - Tzuhan) Footer */}
        <LandingFooter />
        <ScrollToTopButton />
      </main>
    </div>
  );
};

export default PricingPageBody;
