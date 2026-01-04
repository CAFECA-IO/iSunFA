'use client';

import { Lock, Cpu, Globe } from 'lucide-react';
import { useTranslation } from '@/i18n/i18n_context';

export default function TechSpecs() {
  const { t } = useTranslation();

  const specs = [
    {
      key: 'zkp',
      icon: Lock,
    },
    {
      key: 'faith',
      icon: Cpu,
    },
    {
      key: 'locutus',
      icon: Globe,
    },
  ];

  return (
    <div className="bg-slate-800 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-orange-400">{t('tech_specs.title')}</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {t('tech_specs.subtitle')}
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-300">
            {t('tech_specs.description')}
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <div className="grid grid-cols-1 gap-x-8 gap-y-16 lg:grid-cols-3">
            {specs.map((spec) => (
              <div key={spec.key} className="flex flex-col items-start">
                <div className="rounded-xl bg-white/10 p-2 ring-1 ring-white/20 mb-4">
                  <spec.icon className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <dt className="text-xl font-semibold leading-7 text-white">
                  {t(`tech_specs.items.${spec.key}.title`)}
                </dt>
                <dd className="mt-1 flex flex-auto flex-col text-base leading-7 text-gray-400">
                  <p className="flex-auto">{t(`tech_specs.items.${spec.key}.desc`)}</p>
                </dd>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
