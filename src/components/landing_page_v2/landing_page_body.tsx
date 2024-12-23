import React from 'react';
import LandingNavbar from '@/components/landing_page_v2/landing_navbar';
import LandingFooter from '@/components/landing_page_v2/landing_footer';
import {
  LinearGradientText,
  LinearTextSize,
  TextAlign,
} from '@/components/landing_page_v2/linear_gradient_text';
import CTA from '@/components/landing_page_v2/cta';
import EasyToUse from '@/components/landing_page_v2/easy_to_use';
import GlobalMap from '@/components/landing_page_v2/global_map';
import FinancialReport from '@/components/landing_page_v2/financial_report';
import FlexibleFeatureSelection from '@/components/landing_page_v2/flexible_feature_selection';

const LandingPageBody: React.FC = () => {
  return (
    <div className="relative flex flex-auto flex-col bg-landing-page-black py-32px font-dm-sans text-landing-page-white">
      {/* Info: (20241204 - Julian) Background */}
      <div className="absolute inset-x-0 top-0 h-546px w-full bg-cta bg-cover bg-top bg-no-repeat md:h-670px lg:h-1024px"></div>

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
        <div className="h-600px w-full bg-sunrise bg-cover bg-center bg-no-repeat md:h-700px lg:h-850px"></div>

        {/* Info: (20241205 - Julian) Technical Features */}
        <div className="flex flex-col">
          {/* Info: (20241205 - Julian) Title */}
          <LinearGradientText size={LinearTextSize.LG} align={TextAlign.CENTER}>
            Technical Features
          </LinearGradientText>

          {/* Info: (20241205 - Julian) Content */}
          <div className="">
            <LinearGradientText size={LinearTextSize.SM} align={TextAlign.CENTER}>
              Precise Decision-Making
            </LinearGradientText>
          </div>
        </div>

        {/* Info: (20241205 - Julian) Carousel */}
        <div className="flex flex-col">
          <LinearGradientText size={LinearTextSize.MD} align={TextAlign.CENTER}>
            Technical Patents
          </LinearGradientText>
        </div>

        {/* Info: (20241205 - Julian) Trusted by Happy Customer */}
        <div className="flex flex-col">
          {/* Info: (20241205 - Julian) Title */}
          <div className="flex flex-col items-center">
            <p className="text-28px font-medium text-landing-page-white">iSunFA</p>
            <LinearGradientText size={LinearTextSize.LG} align={TextAlign.CENTER}>
              Trusted by Happy Customer
            </LinearGradientText>
          </div>
        </div>

        {/* Info: (20241205 - Julian) Footer */}
        <LandingFooter />
      </main>
    </div>
  );
};

export default LandingPageBody;
