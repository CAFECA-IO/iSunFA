import React from 'react';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import { BsFillRocketTakeoffFill } from 'react-icons/bs';
import {
  LinearGradientText,
  LinearTextSize,
  TextAlign,
} from '@/components/landing_page_v2/linear_gradient_text';
import { LandingButton } from '@/components/landing_page_v2/landing_button';

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
  const { t } = useTranslation('common');

  // Info: (20241218 - Julian) 卡片內容
  const introCards = [
    {
      imageSrc: '/icons/calculation.svg',
      imageAlt: 'calculation_icon',
      description: t('landing_page_v2:CTA.BUSINESS_DESCRIPTION'),
      buttonText: t('landing_page_v2:CTA.BUSINESS_BTN'),
    },
    {
      imageSrc: '/icons/pie_chart.svg',
      imageAlt: 'pie_chart_icon',
      description: t('landing_page_v2:CTA.FIRM_DESCRIPTION'),
      buttonText: t('landing_page_v2:CTA.FIRM_BTN'),
    },
    {
      imageSrc: '/icons/case.svg',
      imageAlt: 'case_icon',
      description: t('landing_page_v2:CTA.PERSONAL_DESCRIPTION'),
      buttonText: t('landing_page_v2:CTA.PERSONAL_BTN'),
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
            {t('landing_page_v2:CTA.MAIN_TITLE')}
          </LinearGradientText>
          <p className="text-center text-xs font-medium md:text-lg lg:text-xl">
            {t('landing_page_v2:CTA.MAIN_DESCRIPTION')}
          </p>
        </div>

        <div className="mt-20px md:mt-30px lg:mt-60px">
          <LandingButton type="button" variant="primary">
            <BsFillRocketTakeoffFill size={20} />
            <p className="text-base font-bold">{t('landing_page_v2:CTA.FREE_TRIAL_BTN')}</p>
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
