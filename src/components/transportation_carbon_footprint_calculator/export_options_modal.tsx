"use client";

// Info: (20260724 - Tzuhan) 匯出勾選選單(需求二):匯出範圍由使用者明確勾選,與畫面檢視狀態解耦
// Info: (20260724 - Tzuhan) 只列出適用性引擎判定為適用的方案;每個勾選方案將產出獨立 PDF

import { useState } from "react";
import { Truck, Ship, Plane, MapPin, X, FileDown } from "lucide-react";
import { RouteType } from "@/components/transportation_carbon_footprint_calculator/plan_section";
import { useTranslation } from "@/i18n/i18n_context";

interface IExportOptionsModalProps {
  availablePlans: RouteType[];
  onConfirm: (selected: Set<RouteType>) => void;
  onClose: () => void;
}

const PLAN_ORDER: RouteType[] = ["custom", "land", "sea", "air"];

const PLAN_ICONS: Record<RouteType, typeof Truck> = {
  land: Truck,
  sea: Ship,
  air: Plane,
  custom: MapPin,
};

export function ExportOptionsModal({
  availablePlans,
  onConfirm,
  onClose,
}: IExportOptionsModalProps) {
  const { t } = useTranslation();
  // Info: (20260724 - Tzuhan) 預設全勾適用方案,使用者可自由取消
  const [selected, setSelected] = useState<Set<RouteType>>(
    new Set(availablePlans),
  );

  const togglePlan = (plan: RouteType) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(plan)) {
        next.delete(plan);
      } else {
        next.add(plan);
      }
      return next;
    });
  };

  const orderedPlans = PLAN_ORDER.filter((plan) =>
    availablePlans.includes(plan),
  );

  const planLabel = (plan: RouteType) =>
    t(`transportation_carbon_footprint_calculator.export_options.plan_${plan}`);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            {t(
              "transportation_carbon_footprint_calculator.export_options.title",
            )}
          </h2>
          <button
            type="button"
            aria-label={t("common.cancel")}
            onClick={onClose}
            className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>
        <p className="mb-5 text-sm text-gray-500">
          {t(
            "transportation_carbon_footprint_calculator.export_options.description",
          )}
        </p>

        <div className="flex flex-col gap-2">
          {orderedPlans.map((plan) => {
            const Icon = PLAN_ICONS[plan];
            const isChecked = selected.has(plan);
            return (
              <label
                key={plan}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                  isChecked
                    ? "border-orange-200 bg-orange-50 text-orange-700"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => togglePlan(plan)}
                  className="h-4 w-4 accent-orange-600"
                />
                <Icon className="h-4 w-4" />
                {planLabel(plan)}
              </label>
            );
          })}
        </div>

        <p className="mt-4 text-xs text-gray-400">
          {t(
            "transportation_carbon_footprint_calculator.export_options.split_hint",
          )}
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(selected)}
            disabled={selected.size === 0}
            className="flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileDown className="h-4 w-4" />
            {t(
              "transportation_carbon_footprint_calculator.export_options.confirm",
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
