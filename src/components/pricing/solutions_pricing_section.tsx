import React, { useState } from "react";
import { useTranslation } from "@/i18n/i18n_context";
import { CheckCircle2, Building, Building2, BuildingIcon } from "lucide-react";
import { SOLUTION_PLAN_PRICE } from "@/constants/price";
import { ISolutionsPricingSectionProps, SolutionTab } from "@/types/pricing";

type SizeTier = "basic" | "pro" | "enterprise";

export default function SolutionsPricingSection({
  onSelect,
}: ISolutionsPricingSectionProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<SolutionTab>("iso14064");
  const [selectedSize, setSelectedSize] = useState<SizeTier>("pro");

  const solutions = {
    iso14064: {
      title: t("pricing.solutions.iso14064.title"),
      desc: t("pricing.solutions.iso14064.desc"),
      type: t("pricing.solutions.iso14064.type"),
      features: [
        t("pricing.solutions.iso14064.f1"),
        t("pricing.solutions.iso14064.f2"),
        t("pricing.solutions.iso14064.f3"),
        t("pricing.solutions.iso14064.f4"),
      ],
    },
    iso14067: {
      title: t("pricing.solutions.iso14067.title"),
      desc: t("pricing.solutions.iso14067.desc"),
      type: t("pricing.solutions.iso14067.type"),
      features: [
        t("pricing.solutions.iso14067.f1"),
        t("pricing.solutions.iso14067.f2"),
        t("pricing.solutions.iso14067.f3"),
        t("pricing.solutions.iso14067.f4"),
      ],
    },
    carbon_label: {
      title: t("pricing.solutions.carbon_label.title"),
      desc: t("pricing.solutions.carbon_label.desc"),
      type: t("pricing.solutions.carbon_label.type"),
      features: [
        t("pricing.solutions.carbon_label.f1"),
        t("pricing.solutions.carbon_label.f2"),
        t("pricing.solutions.carbon_label.f3"),
        t("pricing.solutions.carbon_label.f4"),
      ],
    },
  };

  const sizes = [
    {
      id: "basic" as SizeTier,
      icon: Building,
      badge: t("pricing.solutions.tier1.badge"),
      title: t("pricing.solutions.tier1.title"),
      desc: t("pricing.solutions.tier1.desc", {
        type: solutions[activeTab].type,
      }),
      price: SOLUTION_PLAN_PRICE.BASIC,
      area: t("pricing.solutions.tier1.area"),
      revenue: t("pricing.solutions.tier1.revenue"),
    },
    {
      id: "pro" as SizeTier,
      icon: Building2,
      badge: t("pricing.solutions.tier2.badge"),
      title: t("pricing.solutions.tier2.title"),
      desc: t("pricing.solutions.tier2.desc", {
        type: solutions[activeTab].type,
      }),
      price: SOLUTION_PLAN_PRICE.PRO,
      area: t("pricing.solutions.tier2.area"),
      revenue: t("pricing.solutions.tier2.revenue"),
    },
    {
      id: "enterprise" as SizeTier,
      icon: BuildingIcon,
      badge: t("pricing.solutions.tier3.badge"),
      title: t("pricing.solutions.tier3.title"),
      desc: t("pricing.solutions.tier3.desc", {
        type: solutions[activeTab].type,
      }),
      price: SOLUTION_PLAN_PRICE.ENTERPRISE,
      area: t("pricing.solutions.tier3.area"),
      revenue: t("pricing.solutions.tier3.revenue"),
    },
  ];

  const currentSolution = solutions[activeTab];
  const currentSizeObj = sizes.find((s) => s.id === selectedSize)!;

  const handleCheckout = () => {
    // Generate the details array for the payment modal
    const details = [currentSolution.title, currentSizeObj.title];
    onSelect(
      `${activeTab}_${selectedSize}`,
      `${currentSolution.title} - ${currentSizeObj.title}`,
      currentSizeObj.price,
      undefined,
      details,
    );
  };

  return (
    <div className="mx-auto max-w-4xl px-6 pt-10 pb-24 lg:px-8">
      <div className="mb-12 text-center">
        <h2 className="mb-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          {t("pricing.solutions.page_title")}
        </h2>
        <p className="text-lg text-gray-600">
          {t("pricing.solutions.description")}
        </p>
      </div>

      <div className="space-y-16">
        {/* Step 1: Solution Type */}
        <section>
          <div className="mb-6 flex items-baseline justify-between">
            <h3 className="text-xl font-bold text-gray-900">{t("pricing.solutions.step1_title")}</h3>
          </div>

          <div className="mb-8 flex justify-center">
            <div className="flex w-full flex-col gap-2 rounded-[1rem] bg-gray-100 p-1.5 sm:flex-row">
              <button
                onClick={() => setActiveTab("iso14064")}
                className={`flex-1 rounded-xl py-3.5 text-center text-[15px] font-semibold transition-all duration-300 focus:outline-none ${
                  activeTab === "iso14064"
                    ? "bg-white text-orange-600 shadow-[0_2px_10px_rgba(0,0,0,0.06)]"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {t("pricing.solutions.iso14064.tab")}
              </button>
              <button
                onClick={() => setActiveTab("iso14067")}
                className={`flex-1 rounded-xl py-3.5 text-center text-[15px] font-semibold transition-all duration-300 focus:outline-none ${
                  activeTab === "iso14067"
                    ? "bg-white text-orange-600 shadow-[0_2px_10px_rgba(0,0,0,0.06)]"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {t("pricing.solutions.iso14067.tab")}
              </button>
              <button
                onClick={() => setActiveTab("carbon_label")}
                className={`flex-1 rounded-xl py-3.5 text-center text-[15px] font-semibold transition-all duration-300 focus:outline-none ${
                  activeTab === "carbon_label"
                    ? "bg-white text-orange-600 shadow-[0_2px_10px_rgba(0,0,0,0.06)]"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {t("pricing.solutions.carbon_label.tab")}
              </button>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
            <h4 className="text-2xl font-bold text-gray-900">
              {currentSolution.title}
            </h4>
            <p className="mt-3 text-[15px] leading-relaxed text-gray-600">
              {currentSolution.desc}
            </p>
            <div className="mt-6 border-t border-gray-100 pt-6">
              <h5 className="mb-4 text-sm font-semibold text-gray-900">
                {t("pricing.solutions.includes_title")}
              </h5>
              <ul className="grid grid-cols-1 gap-y-3 sm:grid-cols-2 sm:gap-x-8">
                {currentSolution.features.map((feature, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-x-3 text-[15px] text-gray-600"
                  >
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-orange-500" />
                    <span className="leading-snug">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Step 2: Enterprise Size */}
        <section>
          <div className="mb-6 flex items-baseline justify-between">
            <h3 className="text-xl font-bold text-gray-900">{t("pricing.solutions.step2_title")}</h3>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {sizes.map((size) => {
              const isSelected = selectedSize === size.id;
              const Icon = size.icon;

              return (
                <button
                  key={size.id}
                  onClick={() => setSelectedSize(size.id)}
                  className={`group relative flex flex-col items-start rounded-3xl p-6 text-left transition-all duration-300 focus:outline-none ${
                    isSelected
                      ? "bg-orange-50/50 shadow-lg ring-2 ring-orange-500"
                      : "bg-white shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 hover:shadow-md"
                  }`}
                >
                  {size.id === "pro" && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-orange-400 to-orange-500 px-3 py-1 text-xs font-bold tracking-wide text-white shadow-sm">
                      {t("pricing.solutions.most_popular")}
                    </div>
                  )}
                  <div
                    className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl transition-colors ${
                      isSelected
                        ? "bg-orange-100 text-orange-600"
                        : "bg-gray-100 text-gray-500 group-hover:bg-gray-200 group-hover:text-gray-700"
                    }`}
                  >
                    <Icon className="h-7 w-7" />
                  </div>
                  <h4
                    className={`mb-1.5 text-xl font-bold transition-colors ${
                      isSelected ? "text-orange-900" : "text-gray-900"
                    }`}
                  >
                    {size.title}
                  </h4>
                  <span className="mb-6 inline-block rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                    {size.badge}
                  </span>

                  <div className="mt-auto mb-6 w-full border-t border-gray-100 pt-5">
                    <p className="mb-4 text-xs font-medium text-gray-500">
                      {t("pricing.solutions.criteria_subtitle")}
                    </p>
                    <div className="space-y-2.5 text-[13px] font-medium text-gray-500">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">
                          {t("pricing.solutions.criteria_area")}
                        </span>
                        <span className="text-gray-900">{size.area}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">
                          {t("pricing.solutions.criteria_revenue")}
                        </span>
                        <span className="text-gray-900">{size.revenue}</span>
                      </div>
                    </div>
                  </div>

                  <div className="w-full rounded-2xl bg-white/50 p-3 ring-1 ring-black/5 backdrop-blur-sm">
                    <div className="flex items-baseline justify-center gap-x-1">
                      <span className="text-[13px] font-semibold text-gray-500">
                        NT$
                      </span>
                      <span
                        className={`text-2xl font-bold tracking-tight transition-colors ${
                          isSelected ? "text-gray-900" : "text-gray-900"
                        }`}
                      >
                        {size.price.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* Bottom Summary */}
      <div className="mt-12 flex flex-col items-center justify-between rounded-3xl bg-gray-50 p-8 ring-1 ring-gray-200 sm:flex-row">
        <div className="mb-6 text-center sm:mb-0 sm:text-left">
          <span className="text-sm font-medium text-gray-500">
            {t("pricing.solutions.total_cost")}
          </span>
          <div className="mt-1 flex items-baseline justify-center gap-x-2 sm:justify-start">
            <span className="text-lg font-bold text-gray-900">NT$</span>
            <span className="text-4xl font-bold tracking-tight text-gray-900">
              {currentSizeObj.price.toLocaleString()}
            </span>
          </div>
        </div>
        <button
          onClick={handleCheckout}
          className="w-full rounded-xl bg-orange-600 px-8 py-4 text-center text-base font-semibold text-white shadow-md transition-all hover:bg-orange-500 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 sm:w-auto sm:px-12"
        >
          {t("pricing.select_plan")}
        </button>
      </div>
    </div>
  );
}
