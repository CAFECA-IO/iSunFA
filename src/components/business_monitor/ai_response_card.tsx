"use client";

import { FC } from "react";
import { IReport, IAIResponse } from "@/interfaces/business_monitor";
import { useTranslation } from "@/i18n/i18n_context";

interface IAiResponseCardProps {
  aiResponse: IAIResponse;
  reports: IReport[];
}

const AiResponseCard: FC<IAiResponseCardProps> = ({ aiResponse, reports }) => {
  const { t } = useTranslation();

  const handleDownload = (report: IReport) => {
    // Info: (20260610 - Julian) 模擬產生檔案 Blob 並觸發瀏覽器下載
    const dummyContent = `Mock Report Content for ${report.companyName}\nReport Year: ${report.reportYear}\nPeriod: ${report.period}\nIndustry: ${report.industry}`;
    const blob = new Blob([dummyContent], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.companyName}_${report.reportYear}永續報告書.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const reportList = reports.map((report) => (
    <div
      key={report.id}
      className="flex items-center text-xs font-medium text-slate-600"
    >
      <p>
        • {report.companyName} - {report.title}
      </p>
      <div className="mx-2 flex-1 border border-dashed border-slate-400"></div>
      <button
        type="button"
        onClick={() => handleDownload(report)}
        className="font-bold text-blue-500 underline underline-offset-2 transition-colors hover:text-blue-700 focus:outline-none active:text-purple-500"
      >
        {t("business_monitor.detail.download_report")}
      </button>
    </div>
  ));

  return (
    aiResponse.sourceReportIds.length > 0 && (
      <div className="mt-2 border-t border-orange-100 pt-3">
        <p className="text-xs font-bold text-orange-800">
          {t("business_monitor.ai_section.data_sources")}
        </p>
        <ul className="mt-1 grid grid-cols-2 gap-x-10 gap-y-2">{reportList}</ul>
      </div>
    )
  );
};

export default AiResponseCard;
