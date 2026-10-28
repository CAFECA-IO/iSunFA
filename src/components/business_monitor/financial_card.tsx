"use client";

import { FC } from "react";
import { BarChart3 } from "lucide-react";
import {
  IFinancialKeyValue,
  IFinancialPeriod,
} from "@/interfaces/business_monitor";
import { FINANCIAL_RATIO } from "@/constants/company_financial";
import { useTranslation } from "@/i18n/i18n_context";
import {
  formatDecimalString,
  formatRocDate,
} from "@/lib/business_monitor/format";

/**
 * Info: (20261023 - Luphia) 財務數字：關鍵科目以來源原本的科目名稱顯示，單位照來源（仟元、元）；
 * 比率由後端以 Decimal 計算，公式寫在下方。損益表是年初累計至該季，所以並排的是
 * 「最新一季與往年同一季」，年增率也只在同季之間計算（後端算好，這裡只顯示）。
 */
const ANNUAL_QUARTER = 4;

const ValueCell: FC<{ cell: IFinancialKeyValue | undefined }> = ({ cell }) => {
  const { t } = useTranslation();
  if (!cell) return <>—</>;
  const change = cell.changePercent;
  return (
    <div className="flex flex-col items-end">
      <span>{`${formatDecimalString(cell.value)} ${cell.unit}`}</span>
      {change !== null && (
        <span
          className={`text-xs font-bold ${change.startsWith("-") ? "text-red-600" : "text-emerald-700"}`}
        >
          {t("business_monitor.company.financial_yoy", {
            change: change.startsWith("-") ? change : `+${change}`,
          })}
        </span>
      )}
    </div>
  );
};
const FinancialCard: FC<{ periods: IFinancialPeriod[] }> = ({ periods }) => {
  const { t } = useTranslation();
  const shown = periods;
  const latest = shown[0];

  // Info: (20261023 - Luphia) 各期的科目可能不同（格式變動時），列以出現順序合併
  const rows = Array.from(
    new Map(
      shown.flatMap((period) =>
        period.items.map((item) => [item.key, item] as const),
      ),
    ).values(),
  );

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-800">
          <BarChart3 size={18} className="shrink-0 text-orange-500" />
          {t("business_monitor.company.financial_title")}
        </h2>
        {latest && (
          <p className="text-xs text-slate-500">
            {latest.reportedAt
              ? t("business_monitor.company.financial_source", {
                  date: formatRocDate(latest.reportedAt),
                })
              : t("business_monitor.company.financial_source_mops")}
          </p>
        )}
      </div>

      {!latest ? (
        <p className="text-sm text-slate-400">
          {t("business_monitor.company.financial_empty")}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[360px] text-left text-sm">
              <thead className="text-xs text-slate-500">
                <tr>
                  <th className="py-1 pr-3 font-medium">
                    {t("business_monitor.company.financial_item")}
                  </th>
                  {shown.map((period) => (
                    <th
                      key={`${period.year}-${period.quarter}`}
                      className="py-1 text-right font-medium"
                    >
                      {period.quarter === ANNUAL_QUARTER
                        ? t(
                            "business_monitor.company.financial_period_annual",
                            {
                              year: period.year,
                            },
                          )
                        : t("business_monitor.company.financial_period", {
                            year: period.year,
                            quarter: period.quarter,
                          })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {rows.map((row) => (
                  <tr key={row.key} className="border-t border-slate-100">
                    <td className="py-1.5 pr-3">{row.label}</td>
                    {shown.map((period) => {
                      const cell = period.items.find((i) => i.key === row.key);
                      return (
                        <td
                          key={`${period.year}-${period.quarter}`}
                          className="py-1.5 text-right font-medium whitespace-nowrap"
                        >
                          <ValueCell cell={cell} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {Object.values(FINANCIAL_RATIO).map((ratio) =>
                  shown.some((p) => p.ratios.some((r) => r.key === ratio)) ? (
                    <tr
                      key={ratio}
                      className="border-t border-slate-100 bg-slate-50"
                    >
                      <td className="py-1.5 pr-3 font-medium">
                        {t(`business_monitor.company.ratio.${ratio}`)}
                      </td>
                      {shown.map((period) => {
                        const cell = period.ratios.find((r) => r.key === ratio);
                        return (
                          <td
                            key={`${period.year}-${period.quarter}`}
                            className="py-1.5 text-right font-bold"
                          >
                            {cell ? `${cell.value}%` : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  ) : null,
                )}
              </tbody>
            </table>
          </div>
          <ul className="flex flex-col gap-0.5 text-xs text-slate-400">
            <li>{t("business_monitor.company.financial_cumulative_note")}</li>
            <li>{t("business_monitor.company.ratio_formula")}</li>
          </ul>
        </>
      )}
    </section>
  );
};

export default FinancialCard;
