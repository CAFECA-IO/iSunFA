"use client";

import { FC } from "react";
import { Building2, CalendarDays, X } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";

interface IScopeChipsProps {
  // Info: (20261022 - Luphia) 公司頁固定的公司範疇（不可移除）；首頁不帶，由後端自動辨識
  companyName?: string;
  years: string[];
  onRemoveYear: (year: string) => void;
}

/**
 * Info: (20261022 - Luphia) AI 諮詢送出前的範疇標籤：從問題裡抓到的年度會出現在這裡，
 * 使用者可以點掉。沒有年度時明白寫「不限年度」，而不是默默查全部。
 */
const ScopeChips: FC<IScopeChipsProps> = ({
  companyName = undefined,
  years,
  onRemoveYear,
}) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="font-bold text-slate-500">
        {t("business_monitor.scope.label")}
      </span>
      <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
        <Building2 size={12} className="shrink-0" />
        {companyName ?? t("business_monitor.scope.auto_company")}
      </span>
      {years.length === 0 ? (
        <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
          <CalendarDays size={12} className="shrink-0" />
          {t("business_monitor.scope.all_years")}
        </span>
      ) : (
        years.map((year) => (
          <button
            key={year}
            type="button"
            onClick={() => onRemoveYear(year)}
            aria-label={t("business_monitor.scope.remove_year", { year })}
            className="flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 font-bold text-orange-700 hover:bg-orange-200"
          >
            <CalendarDays size={12} className="shrink-0" />
            {t("business_monitor.scope.year", { year })}
            <X size={12} className="shrink-0" />
          </button>
        ))
      )}
    </div>
  );
};

export default ScopeChips;
