import React from "react";
import { useTranslation } from "@/i18n/i18n_context";
import {
  Cloud,
  Server,
  CheckCircle2,
  Zap,
  Database,
  ShieldCheck,
} from "lucide-react";
import { BUSINESS_MODEL_PRICE } from "@/constants/price";
import { IBusinessModelSectionProps } from "@/types/pricing";

export default function BusinessModelSection({
  onSelect,
}: IBusinessModelSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-7xl px-6 pt-10 pb-24 lg:px-8">
      <div className="mb-16 text-center">
        <span className="mb-4 inline-block rounded-full bg-orange-100 px-4 py-1 text-sm font-semibold tracking-wider text-orange-600 uppercase">
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-orange-500 align-middle"></span>
          {t("pricing.business_model.tag")}
        </span>
        <h2 className="mb-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          {t("pricing.business_model.title")}
        </h2>
        <p className="text-lg text-gray-600">
          {t("pricing.business_model.subtitle")}
        </p>
      </div>

      <div className="mx-auto grid max-w-md grid-cols-1 gap-8 lg:max-w-4xl lg:grid-cols-2">
        {/* Info: (20260702 - Tzuhan) Cloud Subscription Card */}
        <div className="flex flex-col justify-between rounded-3xl bg-white p-8 shadow-xl ring-1 ring-gray-200 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl xl:p-10">
          <div>
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <Cloud className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-2xl font-bold text-gray-900">
              {t("pricing.business_model.cloud.title")}
            </h3>
            <p className="mb-8 min-h-[48px] text-sm leading-6 text-gray-500">
              {t("pricing.business_model.cloud.desc")}
            </p>
            <div className="mt-4 flex items-baseline gap-x-2">
              <span className="text-sm font-semibold text-gray-500">NT$</span>
              <span className="text-5xl font-bold tracking-tight text-gray-900">
                29,400
              </span>
              <span className="text-base text-gray-500">
                {t("pricing.business_model.per_year")}
              </span>
            </div>
            <ul className="mt-8 space-y-4 text-sm leading-6 text-gray-600">
              <li className="flex gap-x-3">
                <CheckCircle2 className="h-6 w-5 flex-none text-orange-500" />
                {t("pricing.business_model.cloud.f1")}
              </li>
              <li className="flex gap-x-3">
                <Zap className="h-6 w-5 flex-none text-orange-500" />
                {t("pricing.business_model.cloud.f2")}
              </li>
              <li className="flex gap-x-3">
                <Database className="h-6 w-5 flex-none text-orange-500" />
                {t("pricing.business_model.cloud.f3")}
              </li>
            </ul>
          </div>
          <button
            onClick={() =>
              onSelect(
                "cloud",
                t("pricing.business_model.cloud.title"),
                BUSINESS_MODEL_PRICE.CLOUD,
                "year",
              )
            }
            className="mt-8 block w-full rounded-xl bg-orange-50 px-3 py-3 text-center text-sm font-semibold text-orange-600 transition-colors hover:bg-orange-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
          >
            {t("pricing.select_plan")}
          </button>
        </div>

        {/* Info: (20260702 - Tzuhan) On-Premise Buyout Card */}
        <div className="relative flex flex-col justify-between rounded-3xl bg-gradient-to-br from-orange-500 to-orange-600 p-8 shadow-2xl ring-1 ring-orange-500 transition-all duration-300 hover:scale-[1.02] hover:shadow-orange-500/30 xl:p-10">
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur-sm">
                <Server className="h-6 w-6" />
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs leading-5 font-semibold text-orange-600">
                {t("pricing.business_model.on_premise.badge")}
              </span>
            </div>
            <h3 className="mb-2 text-2xl font-bold text-white">
              {t("pricing.business_model.on_premise.title")}
            </h3>
            <p className="mb-8 min-h-[48px] text-sm leading-6 text-orange-100">
              {t("pricing.business_model.on_premise.desc")}
            </p>
            <div className="mt-4 flex items-baseline gap-x-2 text-white">
              <span className="text-sm font-semibold text-orange-100">NT$</span>
              <span className="text-5xl font-bold tracking-tight">303,660</span>
              <span className="text-base text-orange-100">/ 買斷</span>
            </div>
            <ul className="mt-8 space-y-4 text-sm leading-6 text-orange-50">
              <li className="flex gap-x-3">
                <ShieldCheck className="h-6 w-5 flex-none text-white" />
                {t("pricing.business_model.on_premise.f1")}
              </li>
              <li className="flex gap-x-3">
                <Server className="h-6 w-5 flex-none text-white" />
                {t("pricing.business_model.on_premise.f2")}
              </li>
              <li className="flex gap-x-3">
                <Zap className="h-6 w-5 flex-none text-white" />
                {t("pricing.business_model.on_premise.f3")}
              </li>
            </ul>
          </div>
          <button
            onClick={() =>
              onSelect(
                "on_premise",
                t("pricing.business_model.on_premise.title"),
                BUSINESS_MODEL_PRICE.ON_PREMISE,
              )
            }
            className="mt-8 block w-full rounded-xl bg-white px-3 py-3 text-center text-sm font-semibold text-orange-600 shadow-sm transition-colors hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {t("pricing.select_plan")}
          </button>
        </div>
      </div>
    </div>
  );
}
