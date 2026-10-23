"use client";

import { FC } from "react";
import { Leaf } from "lucide-react";
import { IEmissionScope, IEmissionYear } from "@/interfaces/business_monitor";
import { useTranslation } from "@/i18n/i18n_context";

const ScopeRow: FC<{ scope: IEmissionScope }> = ({ scope }) => {
  const { t } = useTranslation();
  const change = scope.changePercent;
  const isUp = change !== null && !change.startsWith("-");

  return (
    <li className="flex flex-col gap-1 border-t border-slate-100 py-2.5 first:border-t-0">
      <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between">
        <p className="text-sm text-slate-600">{scope.label}</p>
        <p className="flex items-baseline gap-2">
          <span className="text-base font-bold text-slate-800">
            {scope.value}
          </span>
          {change !== null && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                isUp
                  ? "bg-red-50 text-red-600"
                  : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {t("business_monitor.company.emission_change", {
                change: isUp ? `+${change}` : change,
              })}
            </span>
          )}
          {scope.boundaryChanged && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700">
              {t("business_monitor.company.emission_boundary_changed")}
            </span>
          )}
        </p>
      </div>
      <p className="text-xs break-all text-slate-500">
        {[
          scope.boundary &&
            t("business_monitor.company.emission_boundary", {
              boundary: scope.boundary,
            }),
          [scope.assurer, scope.standard, scope.opinion]
            .filter(Boolean)
            .join("・"),
        ]
          .filter(Boolean)
          .join("｜")}
      </p>
    </li>
  );
};

/**
 * Info: (20261023 - Luphia) 溫室氣體排放：各揭露年度的範疇一～三，數值與資料邊界、確信資訊原樣顯示。
 * 年增減只在前後兩年資料邊界相同時顯示（後端以 Decimal 計算），邊界不同時明白標示。
 */
const EmissionCard: FC<{ emissions: IEmissionYear[] }> = ({ emissions }) => {
  const { t } = useTranslation();
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-800">
          <Leaf size={18} className="shrink-0 text-orange-500" />
          {t("business_monitor.company.emission_title")}
        </h2>
        <p className="text-xs text-slate-500">
          {t("business_monitor.company.emission_source")}
        </p>
      </div>
      {emissions.length === 0 ? (
        <p className="text-sm text-slate-400">
          {t("business_monitor.company.emission_empty")}
        </p>
      ) : (
        emissions.map((year) => (
          <div key={year.year} className="flex flex-col">
            <h3 className="text-sm font-bold text-orange-700">
              {t("business_monitor.company.library_year", { year: year.year })}
            </h3>
            <ul>
              {year.scopes.map((scope) => (
                <ScopeRow key={scope.label} scope={scope} />
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
};

export default EmissionCard;
