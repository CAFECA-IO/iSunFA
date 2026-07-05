"use client";

import { useState } from "react";
import PricingCard from "@/components/pricing/pricing_card";
import {
  REWARD_AMOUNTS,
  ANALYSIS_BASE_COSTS,
  SUBSCRIPTION_PLAN_CREDITS,
} from "@/constants/price";
import { usePricing } from "@/contexts/pricing_context";
import { useAuth } from "@/contexts/auth_context";
import { useTranslation } from "@/i18n/i18n_context";

export default function SubscriptionContent() {
  const { onSelectSubscription, setAuthModalOpen, setConfirmModal } =
    usePricing();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [billingInterval, setBillingInterval] = useState<"month" | "year">(
    "month",
  );

  const currentPlan = user
    ? user.plan === "personal" || !user.plan
      ? "free"
      : user.plan
    : undefined;

  const showComingSoon = () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: t("pricing.coming_soon_title"),
      message: (
        <span>
          {t("pricing.coming_soon_prefix")}
          <a
            href="https://www.economic.ntpc.gov.tw/Api/News/Page?id=8173"
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-600 underline decoration-orange-600/30 hover:text-orange-500 hover:decoration-orange-500"
          >
            {t("pricing.coming_soon_program")}
          </a>
          {t("pricing.coming_soon_middle")}
          <a
            href="mailto:contact@isunfa.com"
            className="text-orange-600 underline decoration-orange-600/30 hover:text-orange-500 hover:decoration-orange-500"
          >
            {t("pricing.coming_soon_email")}
          </a>
          {t("pricing.coming_soon_suffix")}
        </span>
      ),
    });
  };

  return (
    <>
      <div className="mt-8 flex justify-center">
        <div className="relative flex rounded-full bg-gray-100 p-1">
          <button
            onClick={() => setBillingInterval("month")}
            className={`${
              billingInterval === "month"
                ? "bg-white shadow-sm"
                : "hover:bg-gray-50"
            } relative rounded-full px-4 py-2 text-sm font-semibold text-gray-900 transition-all duration-200 focus:outline-none`}
          >
            {t("pricing.monthly")}
          </button>
          <button
            onClick={() => setBillingInterval("year")}
            className={`${
              billingInterval === "year"
                ? "bg-white shadow-sm"
                : "hover:bg-gray-50"
            } relative rounded-full px-4 py-2 text-sm font-semibold text-gray-900 transition-all duration-200 focus:outline-none`}
          >
            {t("pricing.yearly")}
          </button>
          {billingInterval === "year" && (
            <span className="absolute top-2 -right-20 -rotate-12 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
              {t("pricing.save_percent")}
            </span>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 pt-10 pb-24 lg:px-8">
        <div className="mx-auto mt-4 grid max-w-md grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          <PricingCard
            planKey="free"
            billingInterval={billingInterval}
            currentPlan={currentPlan}
            features={[
              t("pricing.plans.free.features.fido"),
              {
                text: t("pricing.plans.free.features.daily_credits", {
                  amount: REWARD_AMOUNTS.DAILY_CHECKIN_REWARD,
                }),
                tooltip: t("pricing.plans.free.features.credit_limit"),
              },
              {
                text: t("pricing.plans.free.features.consults", {
                  amount: Math.floor(
                    SUBSCRIPTION_PLAN_CREDITS.free /
                      ANALYSIS_BASE_COSTS.AI_CONSULTING,
                  ),
                }),
                tooltip: t("pricing.plans.free.features.consults_tooltip", {
                  price: ANALYSIS_BASE_COSTS.AI_CONSULTING,
                }),
              },
              {
                text: t("pricing.plans.free.features.vouchers", {
                  amount: Math.floor(
                    SUBSCRIPTION_PLAN_CREDITS.free /
                      ANALYSIS_BASE_COSTS.CERTIFICATE_ANALYSIS,
                  ),
                }),
                tooltip: t(
                  "pricing.plans.free.features.vouchers_overage_tooltip",
                  { price: ANALYSIS_BASE_COSTS.CERTIFICATE_ANALYSIS },
                ),
              },
              {
                text: t("pricing.plans.free.features.logistics", {
                  amount: Math.floor(
                    SUBSCRIPTION_PLAN_CREDITS.free /
                      ANALYSIS_BASE_COSTS.TRANSPORTATION_CARBON_FOOTPRINT,
                  ),
                }),
                tooltip: t("pricing.plans.free.features.logistics_tooltip", {
                  price: ANALYSIS_BASE_COSTS.TRANSPORTATION_CARBON_FOOTPRINT,
                }),
              },
              {
                text: t("pricing.plans.free.features.ai_reports", {
                  amount: Math.floor(
                    SUBSCRIPTION_PLAN_CREDITS.free /
                      ANALYSIS_BASE_COSTS.AI_REPORT,
                  ),
                }),
                tooltip: t("pricing.plans.free.features.ai_overage_tooltip"),
              },
            ]}
            onSelect={showComingSoon}
          />
          <PricingCard
            planKey="team"
            billingInterval={billingInterval}
            popular={true}
            currentPlan={currentPlan}
            onSelect={() =>
              onSelectSubscription(
                "team",
                t("pricing.plans.team.name"),
                billingInterval,
              )
            }
            features={[
              {
                text: t("pricing.plans.team.features.fido"),
                tooltip: t("pricing.plans.team.features.fido_tooltip"),
              },
              {
                text: t("pricing.plans.team.features.monthly_credits", {
                  amount: SUBSCRIPTION_PLAN_CREDITS.team,
                }),
                tooltip: t(
                  "pricing.plans.team.features.monthly_credits_tooltip",
                ),
              },
              {
                text: t("pricing.plans.team.features.consults", {
                  amount: Math.floor(
                    SUBSCRIPTION_PLAN_CREDITS.team /
                      ANALYSIS_BASE_COSTS.AI_CONSULTING,
                  ),
                }),
                tooltip: t("pricing.plans.team.features.consults_tooltip", {
                  price: ANALYSIS_BASE_COSTS.AI_CONSULTING,
                }),
              },
              {
                text: t("pricing.plans.team.features.vouchers", {
                  amount: Math.floor(
                    SUBSCRIPTION_PLAN_CREDITS.team /
                      ANALYSIS_BASE_COSTS.CERTIFICATE_ANALYSIS,
                  ),
                }),
                tooltip: t(
                  "pricing.plans.team.features.vouchers_overage_tooltip",
                  { price: ANALYSIS_BASE_COSTS.CERTIFICATE_ANALYSIS },
                ),
              },
              {
                text: t("pricing.plans.team.features.logistics", {
                  amount: Math.floor(
                    SUBSCRIPTION_PLAN_CREDITS.team /
                      ANALYSIS_BASE_COSTS.TRANSPORTATION_CARBON_FOOTPRINT,
                  ),
                }),
                tooltip: t("pricing.plans.team.features.logistics_tooltip", {
                  price: ANALYSIS_BASE_COSTS.TRANSPORTATION_CARBON_FOOTPRINT,
                }),
              },
              {
                text: t("pricing.plans.team.features.ai_reports", {
                  amount: Math.floor(
                    SUBSCRIPTION_PLAN_CREDITS.team /
                      ANALYSIS_BASE_COSTS.AI_REPORT,
                  ),
                }),
                tooltip: t("pricing.plans.team.features.ai_overage_tooltip"),
              },
              t("pricing.plans.team.features.analytics"),
              t("pricing.plans.team.features.support"),
            ]}
          />
          <PricingCard
            planKey="business"
            billingInterval={billingInterval}
            currentPlan={currentPlan}
            onSelect={() =>
              onSelectSubscription(
                "business",
                t("pricing.plans.business.name"),
                billingInterval,
              )
            }
            features={[
              {
                text: t("pricing.plans.business.features.fido"),
                tooltip: t("pricing.plans.business.features.fido_tooltip"),
              },
              {
                text: t("pricing.plans.business.features.monthly_credits", {
                  amount: SUBSCRIPTION_PLAN_CREDITS.business,
                }),
                tooltip: t(
                  "pricing.plans.business.features.monthly_credits_tooltip",
                ),
              },
              {
                text: t("pricing.plans.business.features.consults", {
                  amount: Math.floor(
                    SUBSCRIPTION_PLAN_CREDITS.business /
                      ANALYSIS_BASE_COSTS.AI_CONSULTING,
                  ),
                }),
                tooltip: t("pricing.plans.business.features.consults_tooltip", {
                  price: ANALYSIS_BASE_COSTS.AI_CONSULTING,
                }),
              },
              {
                text: t("pricing.plans.business.features.vouchers", {
                  amount: Math.floor(
                    SUBSCRIPTION_PLAN_CREDITS.business /
                      ANALYSIS_BASE_COSTS.CERTIFICATE_ANALYSIS,
                  ),
                }),
                tooltip: t(
                  "pricing.plans.business.features.vouchers_overage_tooltip",
                  { price: ANALYSIS_BASE_COSTS.CERTIFICATE_ANALYSIS },
                ),
              },
              {
                text: t("pricing.plans.business.features.logistics", {
                  amount: Math.floor(
                    SUBSCRIPTION_PLAN_CREDITS.business /
                      ANALYSIS_BASE_COSTS.TRANSPORTATION_CARBON_FOOTPRINT,
                  ),
                }),
                tooltip: t(
                  "pricing.plans.business.features.logistics_tooltip",
                  {
                    price: ANALYSIS_BASE_COSTS.TRANSPORTATION_CARBON_FOOTPRINT,
                  },
                ),
              },
              {
                text: t("pricing.plans.business.features.ai_reports", {
                  amount: Math.floor(
                    SUBSCRIPTION_PLAN_CREDITS.business /
                      ANALYSIS_BASE_COSTS.AI_REPORT,
                  ),
                }),
                tooltip: t(
                  "pricing.plans.business.features.ai_overage_tooltip",
                ),
              },
              t("pricing.plans.business.features.analytics"),
              t("pricing.plans.business.features.support"),
              {
                text: t("pricing.plans.business.features.migration"),
                tooltip: t("pricing.plans.business.features.migration_tooltip"),
              },
              {
                text: t("pricing.plans.business.features.custom_tools"),
                tooltip: t(
                  "pricing.plans.business.features.custom_tools_tooltip",
                ),
              },
            ]}
          />
        </div>
      </div>
    </>
  );
}
