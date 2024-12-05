import React from 'react';
import { BsFillRocketTakeoffFill } from 'react-icons/bs';
import {
  LinearGradientText,
  LinearTextSize,
  TextAlign,
} from '@/components/landing_page_neo/linear_gradient_text';
import { LandingButton } from '@/components/landing_page_neo/landing_button';

const CTA: React.FC = () => {
  return (
    <div className="flex flex-col items-center py-14px md:py-20px lg:py-70px">
      {/* Info: (20241205 - Julian) CTA Main */}
      <div className="flex flex-col items-center gap-12px lg:gap-24px">
        <LinearGradientText size={LinearTextSize.XL} align={TextAlign.CENTER}>
          Your Gateway to the <br />
          Future of Accounting
        </LinearGradientText>
        <p className="text-center text-xs font-medium md:text-lg lg:text-xl">
          A comprehensive accounting service platform that <br /> addresses all financial matters.
        </p>
      </div>

      <div className="mt-20px md:mt-30px lg:mt-60px">
        <LandingButton type="button" variant="primary">
          <BsFillRocketTakeoffFill size={20} />
          <p className="text-base font-bold">Start Your Free Trial Now</p>
        </LandingButton>
      </div>
    </div>
  );
};

export default CTA;
