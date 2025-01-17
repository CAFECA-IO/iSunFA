import React from 'react';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import { LandingButton } from '@/components/landing_page_v2/landing_button';
import {
  LinearGradientText,
  LinearTextSize,
  TextAlign,
} from '@/components/landing_page_v2/linear_gradient_text';

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="relative w-full overflow-hidden rounded-lg border-x border-b bg-cloudy-glass px-lv-6 py-lv-8 text-left backdrop-blur-md">
      <Image
        src="/icons/nail.svg"
        width={24}
        height={24}
        alt="nail_icon"
        className="absolute left-10px top-10px"
      />
      <Image
        src="/icons/nail.svg"
        width={24}
        height={24}
        alt="nail_icon"
        className="absolute bottom-10px left-10px"
      />
      <Image
        src="/icons/nail.svg"
        width={24}
        height={24}
        alt="nail_icon"
        className="absolute right-10px top-10px"
      />
      <Image
        src="/icons/nail.svg"
        width={24}
        height={24}
        alt="nail_icon"
        className="absolute bottom-10px right-10px"
      />
      <Image
        src="/elements/light.svg"
        width={162}
        height={9}
        alt="light"
        className="absolute -top-4px left-1/4"
      />
      {children}
    </div>
  );
};

interface PlanProps {
  title: string;
  price: { value: string; unit: string; additional: string };
  description: string;
  features: { icon: string; description: string }[];
  buttonText: string;
  onClick: () => void;
}

const PlanCard: React.FC<PlanProps> = ({
  title,
  price,
  description,
  features,
  buttonText,
  onClick,
}) => {
  return (
    <Card>
      <h3 className="text-xl font-bold text-text-brand-primary-lv3">{title}</h3>
      <p className="mt-2 text-sm text-white">{description}</p>
      <div className="mt-4 h-74px">
        <LinearGradientText size={LinearTextSize.MD} align={TextAlign.LEFT}>
          {price.value}
          <span className="pl-2 text-sm font-medium leading-loose text-gray-300">{price.unit}</span>
        </LinearGradientText>
        <p className="text-sm text-gray-300">{price.additional}</p>
      </div>
      <LandingButton
        type="button"
        variant="primary"
        className="my-lv-5 w-full justify-center whitespace-nowrap font-bold"
        onClick={onClick}
      >
        {buttonText}
      </LandingButton>
      <ul className="mt-6 space-y-2 text-left text-gray-300">
        {features.map((feature, index) => (
          <li key={`feature-${index + 1}`} className="flex items-center gap-2">
            <Image
              src={feature.icon}
              alt="check"
              width={16}
              height={16}
              className="inline-block min-w-16px"
            />
            {feature.description}
          </li>
        ))}
      </ul>
    </Card>
  );
};

const PricingPlan: React.FC = () => {
  const { t } = useTranslation('pricing');

  const plans = [
    {
      title: t('pricing:BEGINNER.TITLE'),
      price: {
        value: t('pricing:BEGINNER.PRICE'),
        unit: t('pricing:BEGINNER.PRICE_UNIT'),
        additional: t('pricing:BEGINNER.PRICE_ADDITIONAL'),
      },
      description: t('pricing:BEGINNER.DESCRIPTION'),
      features: [
        { icon: '/icons/check.svg', description: t('pricing:BEGINNER.FEATURES.AI_UPLOADS') },
        { icon: '/icons/check.svg', description: t('pricing:BEGINNER.FEATURES.AUTO_SUGGESTIONS') },
        { icon: '/icons/check.svg', description: t('pricing:BEGINNER.FEATURES.LIMIT_STORAGE') },
        { icon: '/icons/check.svg', description: t('pricing:BEGINNER.FEATURES.MANAGE_LEDGER') },
        {
          icon: '/icons/check.svg',
          description: t('pricing:BEGINNER.FEATURES.GENERATE_STATEMENTS'),
        },
        { icon: '/icons/check.svg', description: t('pricing:BEGINNER.FEATURES.CREATE_TEAMS') },
        { icon: '/icons/check.svg', description: t('pricing:BEGINNER.FEATURES.AUTO_FILL_TAX') },
        { icon: '/icons/check.svg', description: t('pricing:BEGINNER.FEATURES.ACCEPT_TASKS') },
        { icon: '/icons/check.svg', description: t('pricing:BEGINNER.FEATURES.SUPPORT_USER') },
        { icon: '/icons/check.svg', description: t('pricing:BEGINNER.FEATURES.CUSTOMER_SUPPORT') },
      ],
      buttonText: t('pricing:BEGINNER.BUTTON_TEXT'),
      onClick: () => {},
    },
    {
      title: t('pricing:PROFESSIONAL.TITLE'),
      price: {
        value: t('pricing:PROFESSIONAL.PRICE'),
        unit: t('pricing:PROFESSIONAL.PRICE_UNIT'),
        additional: t('pricing:PROFESSIONAL.PRICE_ADDITIONAL'),
      },
      description: t('pricing:PROFESSIONAL.DESCRIPTION'),
      features: [
        {
          icon: '/icons/star.svg',
          description: t('pricing:PROFESSIONAL.FEATURES.EVERYTHING_IN_BEGINNER'),
        },
        {
          icon: '/icons/check.svg',
          description: t('pricing:PROFESSIONAL.FEATURES.UNLIMITED_AI_UPLOADS'),
        },
        { icon: '/icons/check.svg', description: t('pricing:PROFESSIONAL.FEATURES.LARGE_STORAGE') },
        {
          icon: '/icons/check.svg',
          description: t('pricing:PROFESSIONAL.FEATURES.UNLIMITED_LEDGER'),
        },
        { icon: '/icons/check.svg', description: t('pricing:PROFESSIONAL.FEATURES.POST_REQUESTS') },
        {
          icon: '/icons/check.svg',
          description: t('pricing:PROFESSIONAL.FEATURES.AUTO_GENERATE_STATEMENTS'),
        },
        { icon: '/icons/check.svg', description: t('pricing:PROFESSIONAL.FEATURES.ASSET_TAGS') },
        { icon: '/icons/check.svg', description: t('pricing:PROFESSIONAL.FEATURES.SUPPORT_USERS') },
        {
          icon: '/icons/check.svg',
          description: t('pricing:PROFESSIONAL.FEATURES.TECHNICAL_ASSISTANCE'),
        },
      ],
      buttonText: t('pricing:PROFESSIONAL.BUTTON_TEXT'),
      onClick: () => {},
      highlight: true,
    },
    {
      title: t('pricing:ENTERPRISE.TITLE'),
      price: {
        value: t('pricing:ENTERPRISE.PRICE'),
        unit: t('pricing:ENTERPRISE.PRICE_UNIT'),
        additional: t('pricing:ENTERPRISE.PRICE_ADDITIONAL'),
      },
      description: t('pricing:ENTERPRISE.DESCRIPTION'),
      features: [
        {
          icon: '/icons/star.svg',
          description: t('pricing:ENTERPRISE.FEATURES.EVERYTHING_IN_PROFESSIONAL'),
        },
        {
          icon: '/icons/check.svg',
          description: t('pricing:ENTERPRISE.FEATURES.COLLABORATION_TOOLS'),
        },
        {
          icon: '/icons/check.svg',
          description: t('pricing:ENTERPRISE.FEATURES.CUSTOM_WORKFLOWS'),
        },
        {
          icon: '/icons/check.svg',
          description: t('pricing:ENTERPRISE.FEATURES.UNLIMITED_STORAGE'),
        },
        { icon: '/icons/check.svg', description: t('pricing:ENTERPRISE.FEATURES.ASSET_TAGS') },
        {
          icon: '/icons/check.svg',
          description: t('pricing:ENTERPRISE.FEATURES.SERVER_INTEGRATION'),
        },
        { icon: '/icons/check.svg', description: t('pricing:ENTERPRISE.FEATURES.UNLIMITED_USERS') },
        { icon: '/icons/check.svg', description: t('pricing:ENTERPRISE.FEATURES.API_INTEGRATION') },
        {
          icon: '/icons/check.svg',
          description: t('pricing:ENTERPRISE.FEATURES.TECHNICAL_ASSISTANCE'),
        },
      ],
      buttonText: t('pricing:ENTERPRISE.BUTTON_TEXT'),
      onClick: () => {},
    },
  ];

  return (
    <div className="flex flex-col items-center gap-80px px-112px py-120px md:px-12 lg:px-24">
      <LinearGradientText size={LinearTextSize.XL} align={TextAlign.CENTER}>
        {t('pricing:MAIN.TITLE')}
      </LinearGradientText>
      <p className="text-center text-xs font-medium transition-all duration-500 md:text-lg lg:text-xl">
        {t('pricing:MAIN.SUBTITLE')}
      </p>
      <div className="mt-10 grid w-full max-w-7xl grid-cols-1 gap-8 md:grid-cols-3">
        {plans.map((plan, index) => (
          <PlanCard key={`plan-${index + 1}`} {...plan} />
        ))}
      </div>
    </div>
  );
};

export default PricingPlan;
