import { useTranslation } from '@/i18n/i18n_context';
import { Check, HelpCircle } from 'lucide-react';

// Info: (20260102 - Luphia) Renamed to IPricingProps for lint compliance
interface IPricingProps {
  planKey: 'free' | 'team' | 'business';
  billingInterval: 'month' | 'year';
  features: (string | { text: string; tooltip?: string })[];
  popular?: boolean;
  currentPlan?: string;
  onSelect?: () => void;
}

export default function PricingCard({ planKey, billingInterval, features, popular, currentPlan, onSelect }: IPricingProps) {
  const { t } = useTranslation();
  const isCurrentPlan = currentPlan === planKey;

  // Info: (20260102 - Luphia) Dynamic keys are safe here as planKey is typed
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const price = billingInterval === 'month'
    ? t(`pricing.plans.${planKey}.price_monthly` as any)
    : t(`pricing.plans.${planKey}.price_yearly` as any);

  return (
    <div className={`relative isolate flex flex-col justify-between rounded-3xl bg-white p-8 ring-1 xl:p-10 ${popular ? 'ring-2 ring-orange-600' : 'ring-gray-200'}`}>
      {popular && (
        <div className="absolute -top-4 left-0 right-0 mx-auto w-32 rounded-full bg-orange-600 px-3 py-1 text-center text-sm font-semibold text-white shadow-sm">
          Most Popular
        </div>
      )}
      <div>
        <div className="flex items-center justify-between gap-x-4">
          <h3 id={planKey} className={`text-lg font-semibold leading-8 ${popular ? 'text-orange-600' : 'text-gray-900'}`}>
            {t(`pricing.plans.${planKey}.name` as any)}
          </h3>
          {isCurrentPlan && (
            <span className="rounded-full bg-orange-600/10 px-2.5 py-0.5 text-xs font-semibold text-orange-600 ring-1 ring-inset ring-orange-600/20">
              {t('pricing.current_plan')}
            </span>
          )}
        </div>
        <p className="mt-4 text-sm leading-6 text-gray-600">
          {t(`pricing.plans.${planKey}.desc` as any)}
        </p>
        <p className="mt-6 flex items-baseline gap-x-1">
          <span className="text-4xl font-bold tracking-tight text-gray-900">{price}</span>
          <span className="text-sm font-semibold leading-6 text-gray-600">
            / {billingInterval === 'month' ? t('pricing.monthly') : t('pricing.yearly')}
          </span>
        </p>
        <ul className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
          {features.map((feature, index) => {
            const isObject = typeof feature === 'object';
            const text = isObject ? feature.text : feature;
            const tooltip = isObject ? feature.tooltip : undefined;

            return (
              <li key={index} className="flex gap-x-3 items-center">
                <Check className="h-6 w-5 flex-none text-orange-600" aria-hidden="true" />
                <span>{text}</span>
                {tooltip && (
                  <div className="group relative flex items-center">
                    <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 w-max max-w-xs rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 shadow-lg z-10">
                      {tooltip}
                      <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></span>
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      <button
        aria-describedby={planKey}
        disabled={isCurrentPlan}
        onClick={onSelect}
        className={`mt-8 block w-full rounded-md px-3 py-2 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 
          ${isCurrentPlan
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed ring-1 ring-gray-200'
            : popular
              ? 'bg-orange-600 text-white shadow-sm hover:bg-orange-500 focus-visible:outline-orange-600'
              : 'bg-orange-50 text-orange-600 hover:bg-orange-100 focus-visible:outline-orange-600'
          }`}
      >
        {isCurrentPlan ? t('pricing.current_plan') : t('pricing.select_plan')}
      </button>
    </div>
  );
}
