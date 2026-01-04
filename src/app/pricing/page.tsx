'use client';

import { useState } from 'react';
import { useTranslation } from '@/i18n/i18n_context';
import PricingCard from '@/components/pricing/pricing_card';
import Header from '@/components/landing_page/header';
import Footer from '@/components/landing_page/footer';
import { Check } from 'lucide-react';
import Image from 'next/image';

export default function PricingPage() {
  const { t } = useTranslation();
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  const [activeTab, setActiveTab] = useState<'subscription' | 'credits'>('subscription');

  return (
    <div className="bg-white">
      <Header />

      <main className="isolate">
        <div className="relative pt-14 text-center sm:pt-20 lg:pt-32">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            {activeTab === 'subscription' ? t('pricing.title') : t('pricing.credits.title')}
          </h1>
          <p className="mt-4 text-lg leading-8 text-gray-600">
            {activeTab === 'subscription' ? t('pricing.subtitle') : t('pricing.credits.subtitle')}
          </p>
        </div>

        {/* Info: (20260104 - Luphia) Tab Switcher */}
        <div className="mt-8 flex justify-center">
          <div className="flex rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => setActiveTab('subscription')}
              className={`${activeTab === 'subscription' ? 'bg-white shadow-sm' : 'hover:bg-gray-50'
                } rounded-md px-8 py-2 text-sm font-semibold text-gray-900 transition-all duration-200 focus:outline-none`}
            >
              {t('pricing.credits.tab_subscription')}
            </button>
            <button
              onClick={() => setActiveTab('credits')}
              className={`${activeTab === 'credits' ? 'bg-white shadow-sm' : 'hover:bg-gray-50'
                } rounded-md px-8 py-2 text-sm font-semibold text-gray-900 transition-all duration-200 focus:outline-none`}
            >
              {t('pricing.credits.tab_credits')}
            </button>
          </div>
        </div>

        {activeTab === 'subscription' ? (
          <>
            {/* Info: (20260104 - Luphia) Billing Interval Toggle */}
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
                  planKey="free"
                  billingInterval={billingInterval}
                  features={[
                    t('pricing.plans.free.features.fido'),
                    {
                      text: t('pricing.plans.free.features.vouchers'),
                      tooltip: t('pricing.plans.free.features.vouchers_overage_tooltip'),
                    },
                    {
                      text: t('pricing.plans.free.features.ai_reports'),
                      tooltip: t('pricing.plans.free.features.ai_overage_tooltip'),
                    },
                  ]}
                />
                <PricingCard
                  planKey="team"
                  billingInterval={billingInterval}
                  popular={true}
                  features={[
                    {
                      text: t('pricing.plans.team.features.fido'),
                      tooltip: t('pricing.plans.team.features.fido_tooltip'),
                    },
                    {
                      text: t('pricing.plans.team.features.vouchers'),
                      tooltip: t('pricing.plans.team.features.vouchers_overage_tooltip'),
                    },
                    {
                      text: t('pricing.plans.team.features.ai_reports'),
                      tooltip: t('pricing.plans.team.features.ai_overage_tooltip'),
                    },
                    t('pricing.plans.team.features.analytics'),
                    t('pricing.plans.team.features.support'),
                  ]}
                />
                <PricingCard
                  planKey="business"
                  billingInterval={billingInterval}
                  features={[
                    {
                      text: t('pricing.plans.business.features.fido'),
                      tooltip: t('pricing.plans.business.features.fido_tooltip'),
                    },
                    {
                      text: t('pricing.plans.business.features.vouchers'),
                      tooltip: t('pricing.plans.business.features.vouchers_overage_tooltip'),
                    },
                    {
                      text: t('pricing.plans.business.features.ai_reports'),
                      tooltip: t('pricing.plans.business.features.ai_overage_tooltip'),
                    },
                    t('pricing.plans.business.features.analytics'),
                    t('pricing.plans.business.features.support'),
                    {
                      text: t('pricing.plans.business.features.migration'),
                      tooltip: t('pricing.plans.business.features.migration_tooltip'),
                    },
                    {
                      text: t('pricing.plans.business.features.local_node'),
                      tooltip: t('pricing.plans.business.features.local_node_tooltip'),
                    },
                  ]}
                />
              </div>

              {/* Info: (20260104 - Luphia) Hardware Lease Section */}
              <div className="mt-16 rounded-3xl bg-gray-900 px-6 py-8 shadow-2xl ring-1 ring-white/10 sm:px-12 lg:px-12 lg:py-12">
                <div className="mx-auto flex max-w-2xl flex-col gap-16 lg:mx-0 lg:max-w-none lg:flex-row lg:items-center">
                  <div className="w-full flex-auto">
                    <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                      {t('pricing.hardware_lease.title')}
                    </h2>
                    <p className="mt-6 text-lg leading-8 text-gray-300">
                      {t('pricing.hardware_lease.description')}
                    </p>
                    <ul className="mt-10 grid grid-cols-1 gap-x-8 gap-y-3 text-base leading-7 text-white sm:grid-cols-2">
                      {(t('pricing.hardware_lease.features') as unknown as string[]).map((feature, index) => (
                        <li key={index} className="flex gap-x-3">
                          <Check className="h-7 w-5 flex-none text-orange-400" aria-hidden="true" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-10 flex items-center gap-x-4">
                      <h3 className="flex-none text-4xl font-bold tracking-tight text-white">
                        {t('pricing.hardware_lease.price')}
                      </h3>
                      <span className="text-base font-semibold leading-7 text-gray-300">
                        {t('pricing.hardware_lease.period')}
                      </span>
                    </div>
                  </div>
                  <div className="w-full flex-none lg:w-96">
                    <div className="relative aspect-[4/3] w-full rounded-2xl bg-gray-800 object-cover shadow-2xl overflow-hidden">
                      <Image
                        src="/images/hardware_lease.png"
                        alt="Hardware Lease"
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="mx-auto max-w-7xl px-6 lg:px-8 pb-24 pt-10">
            <div className="mx-auto mt-4 grid max-w-md grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
              {['tier1', 'tier2', 'tier3', 'tier4', 'tier5', 'tier6'].map((tier) => {
                const popular = tier === 'tier2';
                return (
                  <div key={tier} className={`relative flex flex-col justify-between rounded-3xl bg-white p-8 ring-1 xl:p-10 ${popular ? 'ring-2 ring-orange-600' : 'ring-gray-200'}`}>
                    {popular && (
                      <div className="absolute -top-4 left-0 right-0 mx-auto w-32 rounded-full bg-orange-600 px-3 py-1 text-center text-sm font-semibold text-white shadow-sm">
                        Most Popular
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-semibold leading-8 text-gray-900">
                        {t(`pricing.credits.plans.${tier}.credits`)}
                      </h3>
                      <p className="mt-4 text-sm leading-6 text-gray-600">
                        {t(`pricing.credits.plans.${tier}.desc`)}
                      </p>
                      <p className="mt-6 flex items-baseline gap-x-1">
                        <span className="text-4xl font-bold tracking-tight text-gray-900">
                          {t(`pricing.credits.plans.${tier}.price`)}
                        </span>
                      </p>
                      <ul className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
                        <li className="flex gap-x-3">
                          <Check className="h-6 w-5 flex-none text-orange-600" aria-hidden="true" />
                          {t('pricing.credits.items.validity')}
                        </li>
                        <li className="flex gap-x-3">
                          <Check className="h-6 w-5 flex-none text-orange-600" aria-hidden="true" />
                          {t('pricing.credits.items.all_features')}
                        </li>
                      </ul>
                    </div>
                    <button
                      className={`mt-8 block w-full rounded-md px-3 py-2 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${popular
                        ? 'bg-orange-600 text-white shadow-sm hover:bg-orange-500 focus-visible:outline-orange-600'
                        : 'bg-orange-50 text-orange-600 hover:bg-orange-100 focus-visible:outline-orange-600'
                        }`}
                    >
                      {t('pricing.credits.buy_btn')}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}
