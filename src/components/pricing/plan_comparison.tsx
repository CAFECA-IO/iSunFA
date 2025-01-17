import React from 'react';
import { useTranslation } from 'next-i18next';

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
    'AI_FEATURES',
  ];

  const plans = ['BEGINNER', 'PROFESSIONAL', 'ENTERPRISE'];

  return (
    <div className="flex flex-col items-center px-6 py-12 md:px-12 lg:px-24">
      <h2 className="text-4xl font-extrabold text-white">{t('COMPARISON.TITLE')}</h2>
      <p className="mt-4 text-lg text-gray-400">{t('COMPARISON.SUBTITLE')}</p>
      <div className="mt-10 overflow-x-auto">
        <table className="w-full border-collapse border border-gray-700 text-left text-white">
          <thead>
            <tr>
              <th className="border border-gray-700 px-4 py-2">{t('COMPARISON.FEATURES')}</th>
              {plans.map((plan) => (
                <th key={plan} className="border border-gray-700 px-4 py-2 text-center">
                  {t(`${plan}.TITLE`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {features.map((feature) => (
              <tr key={feature}>
                <td className="border border-gray-700 px-4 py-2">{t(`FEATURES.${feature}`)}</td>
                {plans.map((plan) => (
                  <td
                    key={`${plan}-${feature}`}
                    className="border border-gray-700 px-4 py-2 text-center"
                  >
                    {t(`${plan}.FEATURES.${feature}`)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PlanComparison;
