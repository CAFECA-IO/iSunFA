"use client";

import { ChartColumn } from "lucide-react";
import ReportView from "@/components/user/financial_report/report_view";
import { useTranslation } from "@/i18n/i18n_context";

export default function FinancialReportMainView() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2 border-b border-gray-200 pb-4">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <ChartColumn className="h-5 w-5 shrink-0 text-orange-600" />
          {t("report_view.title")}
        </h2>
        <p className="text-sm font-medium text-gray-500">
          {t("report_view.desc")}
        </p>
      </div>

      {/* Info:(20260319 - Julian) Report Content */}
      <ReportView />
    </div>
  );
}
