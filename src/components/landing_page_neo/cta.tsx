import React from 'react';
import Image from 'next/image';
import { BsFillRocketTakeoffFill } from 'react-icons/bs';
import {
  LinearGradientText,
  LinearTextSize,
  TextAlign,
} from '@/components/landing_page_neo/linear_gradient_text';
import { LandingButton } from '@/components/landing_page_neo/landing_button';

const CTAIntroCard: React.FC<{
  imageSrc: string;
  imageAlt: string;
  description: string;
  buttonText: string;
}> = ({ imageSrc, imageAlt, description, buttonText }) => {
  return (
    <div className="relative flex max-w-300px flex-col items-center gap-24px overflow-hidden rounded-lg border-x border-b bg-landing-page-white/30 px-40px py-20px text-center backdrop-blur-md">
      {/* Info: (20241205 - Julian) Nail Icon */}
      <Image
        src="/icons/nail.svg"
        width={24}
        height={24}
        alt="nail_icon"
        className="absolute left-10px top-10px" // Info: (20241211 - Julian) 左上角
      />
      <Image
        src="/icons/nail.svg"
        width={24}
        height={24}
        alt="nail_icon"
        className="absolute bottom-10px left-10px" // Info: (20241211 - Julian) 左下角
      />
      <Image
        src="/icons/nail.svg"
        width={24}
        height={24}
        alt="nail_icon"
        className="absolute right-10px top-10px" // Info: (20241211 - Julian) 右上角
      />
      <Image
        src="/icons/nail.svg"
        width={24}
        height={24}
        alt="nail_icon"
        className="absolute bottom-10px right-10px" // Info: (20241211 - Julian) 右下角
      />
      {/* Info: (20241218 - Julian) Highlight */}
      <Image
        src="/elements/light.svg"
        width={162}
        height={9}
        alt="light"
        className="absolute -top-4px left-0"
      />

      {/* Info: (20241205 - Julian) Content */}
      <Image src={imageSrc} width={64} height={64} alt={imageAlt} />
      <p className="flex-1">{description}</p>
      <LandingButton type="button" variant="primary" className="whitespace-nowrap font-bold">
        {buttonText}
      </LandingButton>
    </div>
  );
};

const CTA: React.FC = () => {
  // Info: (20241218 - Julian) 卡片內容
  const introCards = [
    {
      imageSrc: '/icons/calculation.svg',
      imageAlt: 'calculation_icon',
      description: 'Helping companies with bookkeeping and tax operations',
      buttonText: 'Apply Business Account',
    },
    {
      imageSrc: '/icons/pie_chart.svg',
      imageAlt: 'pie_chart_icon',
      description: 'Providing clients with financial statements and audit reports',
      buttonText: 'Apply Firm Account',
    },
    {
      imageSrc: '/icons/case.svg',
      imageAlt: 'case_icon',
      description: 'Outsourcing financial work through the platform',
      buttonText: 'Apply Personal Account',
    },
  ];

  const displayIntroCards = introCards.map((card) => (
    <CTAIntroCard
      key={card.imageAlt}
      imageSrc={card.imageSrc}
      imageAlt={card.imageAlt}
      description={card.description}
      buttonText={card.buttonText}
    />
  ));

  return (
    <div className="flex flex-col items-center py-14px md:px-50px md:py-20px lg:py-70px">
      {/* Info: (20241211 - Julian) CTA Main */}
      <div className="flex flex-col items-center">
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

      {/* Info: (20241211 - Julian) CTA Intro Card */}
      <div className="mt-140px grid grid-cols-1 gap-36px md:mt-80px lg:mt-120px lg:grid-cols-3">
        {displayIntroCards}
      </div>
    </div>
  );
};

export default CTA;
