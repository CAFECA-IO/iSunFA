import React from 'react';
import { useTranslation } from 'next-i18next';
import {
  LinearGradientText,
  LinearTextSize,
  TextAlign,
} from '@/components/landing_page_v2/linear_gradient_text';

const PlanComparison: React.FC = () => {
  const { t } = useTranslation('pricing');

  const features = [
    'PRICE',
    'BEST_FOR',
    'STORAGE',
    'LEDGER',
    'CERTIFICATE',
    'FINANCIAL_REPORTS',
    'MATCHING_PLATFORM',
    'TEAM_COLLABORATION',
    'API_INTEGRATION',
    'AUDITING',
    'CUSTOMER_SUPPORT',
    'EXTRAS',
    // 'AI_FEATURES',
  ];

  const plans = ['BEGINNER', 'PROFESSIONAL', 'ENTERPRISE'];

  return (
    <div className="flex flex-col items-center gap-80px px-4 py-120px md:px-12 lg:px-24">
      <LinearGradientText size={LinearTextSize.XL} align={TextAlign.CENTER}>
        {t('COMPARISON.TITLE')}
      </LinearGradientText>
      <div className="hide-scrollbar w-full overflow-x-auto">
        <table className="mb-200px w-full border-collapse border border-white text-left text-white">
          <thead>
            <tr>
              <th className="pricing-header h-80px border border-white px-4 py-2 text-xl backdrop-blur-pricing">
                {t('COMPARISON.FEATURES')}
              </th>
              {plans.map((plan) => (
                <th
                  key={plan}
                  className="pricing-header border border-white px-4 py-2 text-center text-base backdrop-blur-pricing"
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
                {plans.map((plan) => (
                  <td
                    key={`${plan}-${feature}`}
                    className="pricing-cell h-80px border border-white px-4 py-2 backdrop-blur-pricing"
                  >
                    {t(`${plan}.FEATURES.${feature}`)}
                  </td>
                ))}
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
    </div>
  );
};

export default PlanComparison;
