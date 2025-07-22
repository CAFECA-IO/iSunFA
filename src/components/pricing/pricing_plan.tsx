import React from 'react';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import { LandingButton } from '@/components/landing_page_v2/landing_button';
import {
  LinearGradientText,
  LinearTextSize,
  TextAlign,
} from '@/components/landing_page_v2/linear_gradient_text';
import { PLANS } from '@/constants/subscription';

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="relative mx-auto w-320px overflow-hidden rounded-sm border-x border-b bg-cloudy-glass px-lv-6 py-lv-8 text-left backdrop-blur-md lg:w-full">
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
  planId: 'BEGINNER' | 'PROFESSIONAL' | 'ENTERPRISE';
  title: string;
  price: { value: string; unit: string; additional: string };
  features: { icon: string | null; description: string }[];
  buttonText: string;
  onClick: () => void;
}

const PlanCard: React.FC<PlanProps> = ({ planId, title, price, features, buttonText, onClick }) => {
  const { t } = useTranslation(['pricing', 'subscriptions']);

  // Info: (20250522 - Anna) 用語言判斷 min-h 為多少
  const { i18n } = useTranslation();
  const isChinese = i18n.language === 'tw' || i18n.language === 'cn';

  return (
    <Card>
      <h3 className="text-28px font-bold text-text-brand-primary-lv3">{title}</h3>
      <div className="mt-4 whitespace-nowrap md:h-74px">
        <LinearGradientText size={LinearTextSize.MD} align={TextAlign.LEFT}>
          {price.value}
          <span className="pl-2 text-base font-medium leading-loose text-neutral-150">
            {price.unit}
          </span>
        </LinearGradientText>
        <p className="text-base text-white">{price.additional}</p>
      </div>
      <LandingButton
        type="button"
        variant="primary"
        className="my-lv-5 w-full justify-center whitespace-nowrap text-base font-bold"
        onClick={onClick}
      >
        {buttonText}
      </LandingButton>
      <ul
        className={`mt-6 space-y-2 text-left text-gray-300 ${
          isChinese ? 'min-h-300px' : 'min-h-400px'
        }`}
      >
        {features.map((feature, index) => (
          <li key={`feature-${index + 1}`} className="flex items-start gap-2">
            {feature.icon && (
              <Image
                src={feature.icon}
                alt="check"
                width={16}
                height={16}
                className="inline-block min-w-16px"
              />
            )}
            <p className="whitespace-pre-line text-xs">{feature.description}</p>
          </li>
        ))}
      </ul>
      {planId === 'PROFESSIONAL' && (
        <p className="mt-auto flex flex-col text-xs">
          <span className="text-xs font-semibold leading-5 text-text-brand-primary-lv1">
            {t('subscriptions:PLANS_FEATURES_NAME.FREE_TRIAL')}
          </span>
          <span
            className={`text-xs font-medium leading-5 text-text-neutral-tertiary ${
              isChinese ? 'min-h-270px' : 'min-h-550px'
            }`}
          >
            {`* ${t('subscriptions:PLANS_FEATURES_VALUE.30_DAYS_ON_TEAM_CREATION')}`}
          </span>
        </p>
      )}
      {planId === 'ENTERPRISE' && (
        <p className="mt-auto flex flex-col text-xs">
          <span className="text-xs font-semibold leading-5 text-text-brand-primary-lv1">
            {t('subscriptions:PLANS_FEATURES_NAME.NOTE')}
          </span>
          <span
            className={`whitespace-pre-line text-xs font-medium leading-5 text-text-neutral-tertiary ${
              isChinese ? 'min-h-270px' : 'min-h-550px'
            }`}
          >
            {`* ${t('subscriptions:PLANS_FEATURES_VALUE.NOTE_DES')}`}
          </span>
        </p>
      )}
      {planId !== 'BEGINNER' && (
        <p className="mt-auto flex flex-col text-xs">
          <span className="text-xs font-semibold leading-5 text-text-brand-primary-lv1">
            {t('subscriptions:SUBSCRIPTION_PLAN_CONTENT.YOU_CAN_CANCEL_YOUR_SUBSCRIPTION_ANYTIME')}
          </span>
          <span className="text-xs font-medium leading-5 text-text-neutral-tertiary">
            {`* ${t('subscriptions:SUBSCRIPTION_PLAN_CONTENT.NOTE')}`}
          </span>
        </p>
      )}
    </Card>
  );
};

const PricingPlan: React.FC = () => {
  const { t } = useTranslation(['pricing', 'subscriptions']);

  const beginnerPlan = PLANS.find((p) => p.id === 'BEGINNER');
  const professionalPlan = PLANS.find((p) => p.id === 'PROFESSIONAL');
  const enterprisePlan = PLANS.find((p) => p.id === 'ENTERPRISE');

  const beginnerFeatures = PLANS.find((p) => p.id === 'BEGINNER')?.features ?? [];
  const professionalFeatures = PLANS.find((p) => p.id === 'PROFESSIONAL')?.features ?? [];
  const enterpriseFeatures = PLANS.find((p) => p.id === 'ENTERPRISE')?.features ?? [];

  const plans = [
    {
      planId: beginnerPlan?.id as 'BEGINNER',
      title: t('pricing:BEGINNER.TITLE'),
      price: {
        value: beginnerPlan?.price
          ? `$ ${beginnerPlan.price.toLocaleString('zh-TW')}`
          : t('subscriptions:SUBSCRIPTION_PLAN_CONTENT.FREE'),
        unit: t('pricing:BEGINNER.PRICE_UNIT'),
        additional: beginnerPlan?.extraMemberPrice
          ? `${t('subscriptions:SUBSCRIPTION_PLAN_CONTENT.PER_EXTRA_TEAM_MEMBER_PREFIX')}+ $${beginnerPlan.extraMemberPrice}${t('subscriptions:SUBSCRIPTION_PLAN_CONTENT.PER_EXTRA_TEAM_MEMBER_SUFFIX')}`
          : '',
      },
      description: t('pricing:BEGINNER.DESCRIPTION'),
      features: beginnerFeatures.map((f) => ({
        icon: '/icons/check.svg',
        description: `${t(`subscriptions:PLANS_FEATURES_NAME.${f.name}`)}：${t(`subscriptions:PLANS_FEATURES_VALUE.${f.value}`)}`,
      })),
      buttonText: t('pricing:BEGINNER.BUTTON_TEXT'),
      onClick: () => {},
    },
    {
      planId: professionalPlan?.id as 'PROFESSIONAL',
      title: t('pricing:PROFESSIONAL.TITLE'),
      price: {
        value: professionalPlan?.price
          ? `$ ${professionalPlan.price.toLocaleString('zh-TW')}`
          : t('subscriptions:SUBSCRIPTION_PLAN_CONTENT.FREE'),
        unit: t('pricing:PROFESSIONAL.PRICE_UNIT'),
        additional: professionalPlan?.extraMemberPrice
          ? `${t('subscriptions:SUBSCRIPTION_PLAN_CONTENT.PER_EXTRA_TEAM_MEMBER_PREFIX')}+ $${professionalPlan.extraMemberPrice}${t('subscriptions:SUBSCRIPTION_PLAN_CONTENT.PER_EXTRA_TEAM_MEMBER_SUFFIX')}`
          : '',
      },
      description: t('pricing:PROFESSIONAL.DESCRIPTION'),
      features: [
        {
          icon: '/icons/star.svg',
          description: t('pricing:PROFESSIONAL.FEATURES.EVERYTHING_IN_BEGINNER'),
        },
        ...professionalFeatures.map((f) => ({
          icon: '/icons/check.svg',
          description: `${t(`subscriptions:PLANS_FEATURES_NAME.${f.name}`)}：${t(`subscriptions:PLANS_FEATURES_VALUE.${f.value}`)}`,
        })),
      ],
      buttonText: t('pricing:PROFESSIONAL.BUTTON_TEXT'),
      onClick: () => {},
      highlight: true,
    },
    {
      planId: enterprisePlan?.id as 'ENTERPRISE',
      title: t('pricing:ENTERPRISE.TITLE'),
      price: {
        value: enterprisePlan?.price
          ? `$ ${enterprisePlan.price.toLocaleString('zh-TW')}`
          : t('subscriptions:SUBSCRIPTION_PLAN_CONTENT.FREE'),
        unit: t('pricing:ENTERPRISE.PRICE_UNIT'),
        additional: enterprisePlan?.extraMemberPrice
          ? `${t('subscriptions:SUBSCRIPTION_PLAN_CONTENT.PER_EXTRA_TEAM_MEMBER_PREFIX')}+ $${enterprisePlan.extraMemberPrice}${t('subscriptions:SUBSCRIPTION_PLAN_CONTENT.PER_EXTRA_TEAM_MEMBER_SUFFIX')}`
          : '',
      },
      description: t('pricing:ENTERPRISE.DESCRIPTION'),
      features: [
        {
          icon: '/icons/star.svg',
          description: t('pricing:ENTERPRISE.FEATURES.EVERYTHING_IN_PROFESSIONAL'),
        },
        ...enterpriseFeatures.map((f) => ({
          icon: '/icons/check.svg',
          description: `${t(`subscriptions:PLANS_FEATURES_NAME.${f.name}`)}：${t(`subscriptions:PLANS_FEATURES_VALUE.${f.value}`)}`,
        })),
      ],
      buttonText: t('pricing:ENTERPRISE.BUTTON_TEXT'),
      onClick: () => {},
    },
  ];

  return (
    <div className="flex flex-col items-center gap-80px px-4 py-120px md:px-12 lg:px-24">
      <div>
        <LinearGradientText size={LinearTextSize.XL} align={TextAlign.CENTER}>
          {t('pricing:MAIN.TITLE')}
        </LinearGradientText>
        <p className="mt-lv-3 text-center text-xl font-medium transition-all duration-500 md:text-lg lg:text-xl">
          {t('pricing:MAIN.SUBTITLE')}
        </p>
      </div>
      <div className="grid w-full max-w-7xl grid-cols-1 gap-8 lg:grid-cols-3">
        {plans.map((plan, index) => (
          <PlanCard key={`plan-${index + 1}`} {...plan} />
        ))}
      </div>
    </div>
  );
};

export default PricingPlan;
