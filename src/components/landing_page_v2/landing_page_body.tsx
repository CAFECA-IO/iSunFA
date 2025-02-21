import React from 'react';
import LandingNavbar from '@/components/landing_page_v2/landing_navbar';
import LandingFooter from '@/components/landing_page_v2/landing_footer';
import CTA from '@/components/landing_page_v2/cta';
import EasyToUse from '@/components/landing_page_v2/easy_to_use';
import GlobalMap from '@/components/landing_page_v2/global_map';
import FinancialReport from '@/components/landing_page_v2/financial_report';
import FlexibleFeatureSelection from '@/components/landing_page_v2/flexible_feature_selection';
import TechnicalFeatures from '@/components/landing_page_v2/technical_features';
import TechnicalCarousel from '@/components/landing_page_v2/technical_carousel';
import HappyCustomer from '@/components/landing_page_v2/happy_customer';
import ScrollToTopButton from '@/components/landing_page_v2/scroll_to_top';

const LandingPageBody: React.FC = () => {
  return (
    <div className="relative flex flex-auto flex-col bg-landing-page-black py-32px font-dm-sans text-landing-page-white">
      {/* Info: (20241204 - Julian) Background */}
      <div className="absolute inset-x-0 top-0 h-546px w-full bg-cta bg-contain bg-top bg-no-repeat md:h-670px lg:h-1024px"></div>

      {/* Info: (20241204 - Julian) Header */}
      <LandingNavbar />

      {/* Info: (20241204 - Julian) Navbar */}
      <main className="z-10 overflow-y-auto overflow-x-hidden pt-70px lg:pt-100px">
        {/* Info: (20241205 - Julian) CTA */}
        <CTA />

        {/* Info: (20241205 - Julian) Easy to Use */}
        <EasyToUse />

        {/* Info: (20241205 - Julian) Multinational Corporations */}
        <GlobalMap />

        {/* Info: (20241205 - Julian) Financial Report */}
        <FinancialReport />

        {/* Info: (20241205 - Julian) Flexible Feature Selection */}
        <FlexibleFeatureSelection />

        {/* Info: (20241223 - Julian) Sunrise */}
        <div className="h-600px w-full bg-sunrise bg-contain bg-top bg-no-repeat md:h-700px lg:h-850px"></div>

        {/* Info: (20241205 - Julian) Technical Features */}
        <TechnicalFeatures />

        {/* Info: (20241205 - Julian) Technical Carousel */}
        <TechnicalCarousel />

        {/* Info: (20241205 - Julian) Trusted by Happy Customer */}
        <HappyCustomer />

        {/* Info: (20241205 - Julian) Footer */}
        <LandingFooter />
        <ScrollToTopButton />
      </main>
    </div>
  );
};

export default LandingPageBody;
