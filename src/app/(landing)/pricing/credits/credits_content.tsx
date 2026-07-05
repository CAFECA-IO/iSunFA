"use client";

import { useState, useEffect } from "react";
import { Check, Loader2 } from "lucide-react";
import { request } from "@/lib/utils/request";
import { CREDIT_PLANS } from "@/config/credit_plans";
import { MoneyUtil } from "@/lib/utils/money";
import { usePricing } from "@/contexts/pricing_context";
import { useTranslation } from "@/i18n/i18n_context";

export default function CreditsContent() {
  const { onSelectCredit } = usePricing();
  const { t, language } = useTranslation();
  const [pricingPlans, setPricingPlans] = useState<typeof CREDIT_PLANS>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoadingPlans(true);
        const response = await request<{ payload: typeof CREDIT_PLANS }>(
          "/api/v1/pricing/plans",
        );
        if (response && response.payload) {
          setPricingPlans(response.payload);
        }
      } catch (e) {
        console.error("Failed to fetch plans", e);
      } finally {
        setLoadingPlans(false);
      }
    };
    fetchPlans();
  }, []);

  const getPrice = (plan: (typeof CREDIT_PLANS)[0]) => {
    switch (language) {
      case "zh-TW":
        return `NT$ ${plan.price.twd.toLocaleString()}`;
      case "zh-CN":
        return `¥ ${plan.price.cny.toLocaleString()}`;
      case "ja":
        return `¥ ${plan.price.jpy.toLocaleString()}`;
      case "ko":
        return `₩ ${plan.price.krw.toLocaleString()}`;
      default:
        return `$${plan.price.usd.toLocaleString()}`;
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-6 pt-10 pb-24 lg:px-8">
      {loadingPlans ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-orange-600" />
        </div>
      ) : (
        <div className="mx-auto mt-4 grid max-w-md grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {pricingPlans.map((plan, index) => {
            const tierKey = `tier${index + 1}` as string;
            const baseCredits = MoneyUtil.toDecimal(plan.price.usd)
              .times(30)
              .toNumber();
            const bonus = plan.credits - baseCredits;
            const percent = Math.round((bonus / baseCredits) * 100);

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between rounded-3xl bg-white p-8 ring-1 xl:p-10 ${plan.popular ? "ring-2 ring-orange-600" : "ring-gray-200"}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 right-0 left-0 mx-auto w-32 rounded-full bg-orange-600 px-3 py-1 text-center text-sm font-semibold text-white shadow-sm">
                    Most Popular
                  </div>
                )}
                <div>
                  <h3 className="text-lg leading-8 font-semibold text-gray-900">
                    {t(`pricing.credits.plans.${tierKey}.credits`, {
                      count: plan.credits.toLocaleString(),
                    })}
                  </h3>
                  <p className="mt-4 text-sm leading-6 text-gray-600">
                    {t(`pricing.credits.plans.${tierKey}.desc`, {
                      bonus: bonus.toLocaleString(),
                      percent: percent.toString(),
                    })}
                  </p>
                  <p className="mt-6 flex items-baseline gap-x-1">
                    <span className="text-4xl font-bold tracking-tight text-gray-900">
                      {t(`pricing.credits.plans.${tierKey}.price`, {
                        price: getPrice(plan),
                      })}
                    </span>
                  </p>
                  <ul className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
                    <li className="flex gap-x-3">
                      <Check
                        className="h-6 w-5 flex-none text-orange-600"
                        aria-hidden="true"
                      />
                      {t("pricing.credits.items.validity")}
                    </li>
                    <li className="flex gap-x-3">
                      <Check
                        className="h-6 w-5 flex-none text-orange-600"
                        aria-hidden="true"
                      />
                      {t("pricing.credits.items.all_features")}
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => onSelectCredit(plan, getPrice(plan))}
                  className={`mt-8 block rounded-md px-3 py-2 text-center text-sm leading-6 font-semibold shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                    plan.popular
                      ? "bg-orange-600 text-white hover:bg-orange-500 focus-visible:outline-orange-600"
                      : "bg-orange-50 text-orange-600 hover:bg-orange-100 focus-visible:outline-orange-50"
                  }`}
                >
                  {t("pricing.credits.plans.buy_now")}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
