import React from 'react';
import { useTranslation } from 'next-i18next';
import {
  LinearGradientText,
  LinearTextSize,
  TextAlign,
} from '@/components/landing_page_v2/linear_gradient_text';
import Divider from '@/components/landing_page/divider';
import { PLANS } from '@/constants/subscription';

const PlanComparison: React.FC = () => {
  const { t } = useTranslation('pricing');

  const features = [
    'PRICE',
    'FREE_TRIAL',
    'JOINABLE_TEAM_LIMIT',
    'OWNED_TEAM_MEMBER_LIMIT',
    'OWNED_TEAM_LEDGER_LIMIT',
    'CERTIFICATE_MANAGEMENT',
    'VOUCHER_MANAGEMENT',
    'STORAGE',
    'TRIAL_BALANCE',
    'GENERAL_LEDGER',
    'FINANCIAL_REPORTS',
    'TECH_ADVANTAGE',
    'CONTINUOUS_AUDIT',
    'EARLY_ACCESS',
    'AI_MODEL_ASSISTANCE',
    'ENTERPRISE_SUPPORT',
    'UNSUBSCRIBE',
  ];

  const plans = ['TRIAL', 'BEGINNER', 'PROFESSIONAL', 'ENTERPRISE'];
  const comparisonPlans = plans.filter((plan) => plan !== 'TRIAL');

  const formatText = (text: string) => {
    return text.split(/(\*\*.*?\*\*)/g).map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          // Deprecated: (20250325 - Luphia) remove eslint-disable
          // eslint-disable-next-line react/no-array-index-key
          <span key={index} className="font-bold text-text-brand-primary-lv3">
            {part.slice(2, -2)}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="flex flex-col items-center gap-80px px-4 py-120px md:px-12 lg:px-24">
      <LinearGradientText size={LinearTextSize.XL} align={TextAlign.CENTER}>
        {t('COMPARISON.TITLE')}
      </LinearGradientText>
      <div className="hide-scrollbar w-full overflow-x-auto">
        <table className="mb-200px shrink-0 border-collapse border border-white text-left text-white">
          <thead>
            <tr>
              <th className="pricing-header h-80px min-w-200px border border-white px-4 py-2 text-xl backdrop-blur-pricing">
                {t('COMPARISON.FEATURES')}
              </th>
              {comparisonPlans.map((plan) => (
                <th
                  key={plan}
                  className="pricing-header min-w-330px border border-white px-4 py-2 text-center text-base backdrop-blur-pricing"
                >
                  {t(`${plan}.TITLE`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {features.map((feature) => (
              <tr key={feature} className="text-base">
                <td className="pricing-subtitle h-80px border border-white px-4 py-2 backdrop-blur-pricing">
                  {t(`FEATURES.${feature}`)}
                </td>
                {comparisonPlans.map((planId) => {
                  const plan = PLANS.find((p) => p.id === planId);
                  const comparisonValue = plan?.comparison?.[feature];

                  return (
                    <td
                      key={`${planId}-${feature}`}
                      className="pricing-cell h-80px whitespace-pre-line border border-white px-4 py-2 backdrop-blur-pricing"
                    >
                      {comparisonValue ? t(`${planId}.FEATURES.${comparisonValue}`) : '-'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="hidden w-full text-left">
        <LinearGradientText size={LinearTextSize.SM} align={TextAlign.LEFT}>
          <p>{t('pricing:CONTACT.TITLE')}</p>
        </LinearGradientText>
        <p className="text-base">{t('pricing:CONTACT.SUBTITLE')}</p>
      </div>

      {/* Subscription Plan Refund Policy */}
      <div className="flex flex-col items-stretch gap-80px pb-300px tracking-wide">
        <LinearGradientText size={LinearTextSize.XL} align={TextAlign.CENTER}>
          {t('REFUND.TITLE')}
        </LinearGradientText>

        <div className="flex flex-col gap-40px">
          <Divider text={t('REFUND.CANCELLATION_DIVIDER')} />
          <ul className="ml-24px flex list-disc flex-col gap-20px text-xl leading-10 text-landing-page-white">
            <li>{t('REFUND.CANCELLATION_1')}</li>
            <li>{t('REFUND.CANCELLATION_2')}</li>
          </ul>
        </div>

        <div className="flex flex-col gap-40px">
          <Divider text={t('REFUND.REFUND_DIVIDER')} />
          <ul className="ml-24px flex list-disc flex-col gap-20px text-xl leading-10 text-landing-page-white">
            <li>{formatText(t('REFUND.REFUND_1'))}</li>
            <li>{formatText(t('REFUND.REFUND_2'))}</li>
            <li>{formatText(t('REFUND.REFUND_3'))}</li>
          </ul>
        </div>

        <div className="flex flex-col gap-40px">
          <Divider text={t('REFUND.SPECIAL_DIVIDER')} />
          <ul className="ml-24px flex list-disc flex-col gap-20px text-xl leading-10 text-landing-page-white">
            <li>{formatText(t('REFUND.SPECIAL_1'))}</li>
            <li>{formatText(t('REFUND.SPECIAL_2'))}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PlanComparison;
