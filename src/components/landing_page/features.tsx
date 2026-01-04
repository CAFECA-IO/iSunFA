'use client';

import {
  BookOpen,
  Sliders,
  Wallet,
  PieChart,
  Landmark,
  Users,
  FileText
} from 'lucide-react';

import { useTranslation } from '@/i18n/i18n_context';

const featureKeys = [
  { key: 'bookkeeping', icon: BookOpen },
  { key: 'adjustment', icon: Sliders },
  { key: 'cashier', icon: Wallet },
  { key: 'analysis', icon: PieChart },
  { key: 'tax', icon: Landmark },
  { key: 'salary', icon: Users },
  { key: 'financial_report', icon: FileText },
];

export default function Features() {
  const { t } = useTranslation();

  return (
    <div className="bg-gray-50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-orange-600">{t('features.title')}</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            {t('features.subtitle')}
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            {t('features.description')}
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-3 xl:grid-cols-4">
            {featureKeys.map((feature) => (
              <div key={feature.key} className="relative flex flex-col bg-white p-8 rounded-2xl shadow-sm ring-1 ring-gray-200/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-600">
                    <feature.icon className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                  {t(`features.items.${feature.key}.title`)}
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">{t(`features.items.${feature.key}.desc`)}</p>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
