'use client';

import { useState } from 'react';
import { useTranslation } from '@/i18n/i18n_context';
import PricingCard from '@/components/pricing/pricing_card';
import Header from '@/components/landing_page/header';
import Footer from '@/components/landing_page/footer';

export default function PricingPage() {
  const { t } = useTranslation();
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');

  return (
    <div className="bg-white">
      <Header />

      <main className="isolate">
        <div className="relative pt-14 text-center sm:pt-20 lg:pt-32">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            {t('pricing.title')}
          </h1>
          <p className="mt-4 text-lg leading-8 text-gray-600">
            {t('pricing.subtitle')}
          </p>
        </div>

        <div className="mt-8 flex justify-center">
          <div className="relative flex rounded-full bg-gray-100 p-1">
            <button
              onClick={() => setBillingInterval('month')}
              className={`${billingInterval === 'month' ? 'bg-white shadow-sm' : 'hover:bg-gray-50'
                } relative rounded-full px-4 py-2 text-sm font-semibold text-gray-900 transition-all duration-200 focus:outline-none`}
            >
              {t('pricing.monthly')}
            </button>
            <button
              onClick={() => setBillingInterval('year')}
              className={`${billingInterval === 'year' ? 'bg-white shadow-sm' : 'hover:bg-gray-50'
                } relative rounded-full px-4 py-2 text-sm font-semibold text-gray-900 transition-all duration-200 focus:outline-none`}
            >
              {t('pricing.yearly')}
            </button>
            {billingInterval === 'year' && (
              <span className="absolute -right-20 top-2 -rotate-12 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                {t('pricing.save_percent')}
              </span>
            )}
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-6 lg:px-8 pb-24 pt-10">
          <div className="mx-auto mt-4 grid max-w-md grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            <PricingCard
              planKey="personal"
              billingInterval={billingInterval}
              features={[
                '1 FIDO2 Key',
                '10 Accounting Vouchers / Month',
                '3 AI Reports / Month',
              ]}
            />
            <PricingCard
              planKey="business"
              billingInterval={billingInterval}
              popular={true}
              features={[
                'Unlimited FIDO2 Keys',
                '300 Accounting Vouchers / Month',
                '30 AI Reports / Month',
                'Advanced Analytics',
                'Priority Support',
                'Custom Branding'
              ]}
            />
            <PricingCard
              planKey="agency"
              billingInterval={billingInterval}
              features={[
                'Unlimited FIDO2 Keys',
                'Unlimited Accounting Vouchers',
                'Unlimited AI Reports',
                'Dedicated Account Manager',
                'API Access',
                'White-label Option'
              ]}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
