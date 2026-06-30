import React, { useState } from "react";
import { useTranslation } from "@/i18n/i18n_context";
import { CheckCircle2, Building, Building2, BuildingIcon } from "lucide-react";

interface ISolutionsPricingSectionProps {
  onSelect: () => void;
}

type SolutionTab = "iso14064" | "iso14067" | "carbon_label";

export default function SolutionsPricingSection({
  onSelect,
}: ISolutionsPricingSectionProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<SolutionTab>("iso14064");

  const solutions = {
    iso14064: {
      title: t("pricing.solutions.iso14064.title"),
      desc: t("pricing.solutions.iso14064.desc"),
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
      features: [
        t("pricing.solutions.carbon_label.f1"),
        t("pricing.solutions.carbon_label.f2"),
        t("pricing.solutions.carbon_label.f3"),
        t("pricing.solutions.carbon_label.f4"),
      ],
    },
  };

  const currentSolution = solutions[activeTab];

  return (
    <div className="mx-auto max-w-7xl px-6 pt-10 pb-24 lg:px-8">
      <div className="mb-10 text-center">
        <span className="mb-4 inline-block rounded-full bg-teal-100 px-4 py-1 text-sm font-semibold tracking-wider text-teal-600 uppercase">
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-teal-500 align-middle"></span>
          SOLUTIONS & PRICING
        </span>
        <h2 className="mb-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          {currentSolution.title}
        </h2>
        <p className="text-lg text-gray-600">{currentSolution.desc}</p>
      </div>

      {/* Tabs */}
      <div className="mb-12 flex justify-center">
        <div className="flex flex-wrap justify-center gap-1 rounded-lg bg-gray-100 p-1 sm:flex-nowrap">
          <button
            onClick={() => setActiveTab("iso14064")}
            className={`${
              activeTab === "iso14064"
                ? "bg-white text-teal-600 shadow-sm"
                : "text-gray-600 hover:bg-gray-50"
            } rounded-md px-6 py-2.5 text-sm font-semibold transition-all duration-200 focus:outline-none`}
          >
            {t("pricing.solutions.iso14064.tab")}
          </button>
          <button
            onClick={() => setActiveTab("iso14067")}
            className={`${
              activeTab === "iso14067"
                ? "bg-white text-orange-600 shadow-sm"
                : "text-gray-600 hover:bg-gray-50"
            } rounded-md px-6 py-2.5 text-sm font-semibold transition-all duration-200 focus:outline-none`}
          >
            {t("pricing.solutions.iso14067.tab")}
          </button>
          <button
            onClick={() => setActiveTab("carbon_label")}
            className={`${
              activeTab === "carbon_label"
                ? "bg-white text-purple-600 shadow-sm"
                : "text-gray-600 hover:bg-gray-50"
            } rounded-md px-6 py-2.5 text-sm font-semibold transition-all duration-200 focus:outline-none`}
          >
            {t("pricing.solutions.carbon_label.tab")}
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="mx-auto grid max-w-md grid-cols-1 gap-8 lg:max-w-none lg:grid-cols-3">
        {/* Tier 1 */}
        <div className="flex flex-col justify-between rounded-3xl bg-white p-8 shadow-xl ring-1 ring-gray-200 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                <Building className="h-5 w-5" />
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs leading-5 font-semibold text-gray-600">
                微型企業
              </span>
            </div>
            <h3 className="mb-2 text-2xl font-bold text-gray-900">
              輕量入門級
            </h3>
            <p className="mb-6 text-sm leading-6 text-gray-500">
              提供完整的
              {activeTab === "iso14064"
                ? "組織碳盤查導入與合規申報"
                : activeTab === "iso14067"
                  ? "產品生命週期碳排放計算與建模"
                  : "碳足跡標章與減碳標章申請輔導"}
              功能。
            </p>
            <div className="mt-4 flex items-baseline gap-x-2">
              <span className="text-sm font-semibold text-gray-500">NT$</span>
              <span className="text-4xl font-bold tracking-tight text-gray-900">
                94,500
              </span>
              <span className="text-base text-gray-500">/ 案</span>
            </div>

            <div className="mt-8 rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-100">
              <p className="mb-3 flex items-center gap-1 text-xs font-semibold text-gray-500">
                <span className="inline-block h-3 w-3 rounded-full border border-gray-400 text-center text-[8px] leading-[10px]">
                  !
                </span>
                適用範疇基準
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs font-medium">
                <div className="text-gray-500">場域總面積</div>
                <div className="text-right text-gray-900">≤ 1,000 坪</div>
                <div className="text-gray-500">年營業额範圍</div>
                <div className="text-right text-gray-900">≤ 1 億元</div>
              </div>
            </div>

            <ul className="mt-8 space-y-4 text-sm leading-6 text-gray-600">
              {currentSolution.features.map((feature, idx) => (
                <li key={idx} className="flex gap-x-3">
                  <CheckCircle2 className="h-6 w-5 flex-none text-teal-500" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
          <button
            onClick={onSelect}
            className="mt-8 block w-full rounded-xl bg-teal-50 px-3 py-3 text-center text-sm font-semibold text-teal-600 transition-colors hover:bg-teal-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
          >
            {t("pricing.select_plan")}
          </button>
        </div>

        {/* Tier 2 */}
        <div className="relative z-10 flex flex-col justify-between rounded-3xl bg-white p-8 shadow-2xl ring-2 ring-orange-500 transition-all duration-300 hover:scale-[1.02] hover:shadow-orange-500/20">
          <div className="absolute -top-4 right-0 left-0 mx-auto w-32 rounded-full bg-gradient-to-r from-orange-400 to-orange-500 px-3 py-1 text-center text-xs font-bold text-white shadow-sm">
            中小企業
          </div>
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                <Building2 className="h-5 w-5" />
              </div>
            </div>
            <h3 className="mb-2 text-2xl font-bold text-gray-900">
              專業成長級
            </h3>
            <p className="mb-6 text-sm leading-6 text-gray-500">
              提供完整的
              {activeTab === "iso14064"
                ? "組織碳盤查導入與合規申報"
                : activeTab === "iso14067"
                  ? "產品生命週期碳排放計算與建模"
                  : "碳足跡標章與減碳標章申請輔導"}
              功能。
            </p>
            <div className="mt-4 flex items-baseline gap-x-2">
              <span className="text-sm font-semibold text-gray-500">NT$</span>
              <span className="text-4xl font-bold tracking-tight text-gray-900">
                283,500
              </span>
              <span className="text-base text-gray-500">/ 案</span>
            </div>

            <div className="mt-8 rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-100">
              <p className="mb-3 flex items-center gap-1 text-xs font-semibold text-gray-500">
                <span className="inline-block h-3 w-3 rounded-full border border-gray-400 text-center text-[8px] leading-[10px]">
                  !
                </span>
                適用範疇基準
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs font-medium">
                <div className="text-gray-500">場域總面積</div>
                <div className="text-right text-gray-900">1,000 - 5,000 坪</div>
                <div className="text-gray-500">年營業額範圍</div>
                <div className="text-right text-gray-900">1 億 - 5 億元</div>
              </div>
            </div>

            <ul className="mt-8 space-y-4 text-sm leading-6 text-gray-600">
              {currentSolution.features.map((feature, idx) => (
                <li key={idx} className="flex gap-x-3">
                  <CheckCircle2 className="h-6 w-5 flex-none text-orange-500" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
          <button
            onClick={onSelect}
            className="mt-8 block w-full rounded-xl bg-orange-500 px-3 py-3 text-center text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
          >
            {t("pricing.select_plan")}
          </button>
        </div>

        {/* Tier 3 */}
        <div className="flex flex-col justify-between rounded-3xl bg-white p-8 shadow-xl ring-1 ring-gray-200 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <BuildingIcon className="h-5 w-5" />
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs leading-5 font-semibold text-gray-600">
                大型企業
              </span>
            </div>
            <h3 className="mb-2 text-2xl font-bold text-gray-900">
              旗艦企業級
            </h3>
            <p className="mb-6 text-sm leading-6 text-gray-500">
              提供完整的
              {activeTab === "iso14064"
                ? "組織碳盤查導入與合規申報"
                : activeTab === "iso14067"
                  ? "產品生命週期碳排放計算與建模"
                  : "碳足跡標章與減碳標章申請輔導"}
              功能。
            </p>
            <div className="mt-4 flex items-baseline gap-x-2">
              <span className="text-sm font-semibold text-gray-500">NT$</span>
              <span className="text-4xl font-bold tracking-tight text-gray-900">
                567,000
              </span>
              <span className="text-base text-gray-500">/ 案</span>
            </div>

            <div className="mt-8 rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-100">
              <p className="mb-3 flex items-center gap-1 text-xs font-semibold text-gray-500">
                <span className="inline-block h-3 w-3 rounded-full border border-gray-400 text-center text-[8px] leading-[10px]">
                  !
                </span>
                適用範疇基準
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs font-medium">
                <div className="text-gray-500">場域總面積</div>
                <div className="text-right text-gray-900">≥ 5,000 坪</div>
                <div className="text-gray-500">年營業額範圍</div>
                <div className="text-right text-gray-900">≥ 5 億元</div>
              </div>
            </div>

            <ul className="mt-8 space-y-4 text-sm leading-6 text-gray-600">
              {currentSolution.features.map((feature, idx) => (
                <li key={idx} className="flex gap-x-3">
                  <CheckCircle2 className="h-6 w-5 flex-none text-purple-500" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
          <button
            onClick={onSelect}
            className="mt-8 block w-full rounded-xl bg-purple-50 px-3 py-3 text-center text-sm font-semibold text-purple-600 transition-colors hover:bg-purple-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600"
          >
            {t("pricing.select_plan")}
          </button>
        </div>
      </div>
    </div>
  );
}
