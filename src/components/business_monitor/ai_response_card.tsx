"use client";

import { FC } from "react";
import { IMockReport, IAIResponse } from "@/interfaces/business_monitor";
import { useTranslation } from "@/i18n/i18n_context";

interface IAiResponseCardProps {
  aiResponse: IAIResponse;
  reports: IMockReport[];
}

const AiResponseCard: FC<IAiResponseCardProps> = ({ aiResponse, reports }) => {
  const { t } = useTranslation();

  const handleDownload = (report: IMockReport) => {
    // Info: (20260610 - Julian) 模擬產生檔案 Blob 並觸發瀏覽器下載
    const dummyContent = `Mock Report Content for ${report.company}\nReport Year: ${report.reportYear}\nPeriod: ${report.period}\nIndustry: ${report.industry}`;
    const blob = new Blob([dummyContent], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.company}_${report.reportYear}永續報告書.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const reportList = reports.map((report) => (
    <div
      key={report.id}
      className="flex items-center justify-between text-xs font-medium text-slate-600"
    >
      <p>
        • {report.company} {report.title}
      </p>
      <button
        type="button"
        onClick={() => handleDownload(report)}
        className="font-bold text-blue-500 underline underline-offset-2 transition-colors hover:text-blue-700 focus:outline-none active:text-purple-500"
      >
        下載報告書
      </button>
    </div>
  ));

  return (
    aiResponse.sourceReportIds.length > 0 && (
      <div className="mt-2 border-t border-orange-100 pt-3">
        <p className="text-xs font-bold text-orange-800">
          {t("business_monitor.ai_section.data_sources")}
        </p>
        <div className="mt-1 grid grid-cols-2 gap-x-10 gap-y-2">
          {reportList}
        </div>
      </div>
    )
  );
};

export default AiResponseCard;
