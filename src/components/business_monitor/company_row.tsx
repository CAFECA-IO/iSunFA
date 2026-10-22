"use client";

import { FC } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { IBusinessMonitorCompany } from "@/interfaces/business_monitor";
import { useTranslation } from "@/i18n/i18n_context";

// Info: (20261022 - Luphia) 公司清單的一列：簡稱、全名、代號、市場別、產業與已有幾份報告，點了進公司頁
const CompanyRow: FC<{ company: IBusinessMonitorCompany }> = ({ company }) => {
  const { t } = useTranslation();
  return (
    <Link
      href={`/business_monitor/company/${company.stockId}`}
      className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-orange-300 hover:bg-orange-50"
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="truncate text-sm font-bold text-slate-800">
          {company.abbreviation ?? company.name}
          <span className="ml-2 font-medium text-slate-400">
            {company.stockId}
          </span>
        </p>
        <p className="truncate text-xs text-slate-500">
          {company.name}
          {company.industryName && `・${company.industryName}`}
          {`・${t(`business_monitor.market.${company.marketType}`)}`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
            company.documentCount > 0
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-400"
          }`}
        >
          {company.documentCount > 0
            ? t("business_monitor.home.documents_count", {
                count: company.documentCount,
              })
            : t("business_monitor.home.no_documents")}
        </span>
        <ChevronRight size={16} className="text-slate-400" />
      </div>
    </Link>
  );
};

export default CompanyRow;
