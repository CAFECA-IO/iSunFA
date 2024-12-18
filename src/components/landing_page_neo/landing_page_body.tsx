import React from 'react';
import LandingNavbar from '@/components/landing_page_neo/landing_navbar';
import LandingFooter from '@/components/landing_page_neo/landing_footer';
import {
  LinearGradientText,
  LinearTextSize,
  TextAlign,
} from '@/components/landing_page_neo/linear_gradient_text';
import CTA from '@/components/landing_page_neo/cta';
import EasyToUse from '@/components/landing_page_neo/easy_to_use';

const LandingPageBody: React.FC = () => {
  return (
    <div className="relative flex flex-auto flex-col bg-landing-page-black px-36px py-32px font-dm-sans text-landing-page-white">
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
        <div className="flex flex-col">
          <LinearGradientText size={LinearTextSize.LG} align={TextAlign.LEFT}>
            Suitable for Local Businesses to <br />
            Multinational Corporations
          </LinearGradientText>
        </div>

        {/* Info: (20241205 - Julian) Financial Report */}
        <div className="flex flex-col">
          <LinearGradientText size={LinearTextSize.LG} align={TextAlign.LEFT}>
            Real-Time <br />
            Financial Report
          </LinearGradientText>
        </div>

        {/* Info: (20241205 - Julian) Flexible Feature Selection */}
        <div className="flex flex-col">
          <LinearGradientText size={LinearTextSize.LG} align={TextAlign.CENTER}>
            Flexible Feature Selection
          </LinearGradientText>
        </div>

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
