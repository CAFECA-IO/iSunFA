"use client";

import {
  CheckCircle2,
  Zap,
  Truck,
  Cloud,
  FileQuestion,
  Loader2,
  CircleAlert,
} from "lucide-react";
import { timestampToString } from "@/lib/utils/common";
import { IEsgRecord, EsgScope, EsgIntensity } from "@/interfaces/esg";
import { FilePreview } from "@/components/common/file_preview";
import { useTranslation } from "@/i18n/i18n_context";
import { AIAnalysisStatus } from "@/interfaces/ai_analysis_status";

export function EsgRow({
  record,
  onVerifyClick,
}: {
  record: IEsgRecord;
  onVerifyClick: (record: IEsgRecord) => void;
}) {
  const { t } = useTranslation();

  const isAnalysisFailed = record.analysisStatus === AIAnalysisStatus.FAILED;

  const handleVerifyClick = () => {
    onVerifyClick(record);
  };

  const renderIntensity = (intensity: EsgIntensity) => {
    switch (intensity) {
      case EsgIntensity.HIGH:
        return {
          text: t("esg_table.intensity.high"),
          style: "border-red-300 bg-red-100 text-red-600",
        };
      case EsgIntensity.MEDIUM:
        return {
          text: t("esg_table.intensity.medium"),
          style: "border-amber-300 bg-amber-100 text-amber-600",
        };
      case EsgIntensity.LOW:
        return {
          text: t("esg_table.intensity.low"),
          style: "border-green-300 bg-green-100 text-green-600",
        };
      default:
        return {
          text: "",
          style: "",
        };
    }
  };

  const renderScope = (scope: EsgScope) => {
    switch (scope) {
      case EsgScope.SCOPE_1:
        return {
          text: t("esg_table.scope.scope_1"),
          icon: <Zap className="mr-1.5 h-4 w-4 text-amber-500" />,
        };
      case EsgScope.SCOPE_2:
        return {
          text: t("esg_table.scope.scope_2"),
          icon: <Truck className="mr-1.5 h-4 w-4 text-blue-500" />,
        };
      case EsgScope.SCOPE_3:
        return {
          text: t("esg_table.scope.scope_3"),
          icon: <Cloud className="mr-1.5 h-4 w-4 text-green-500" />,
        };
      default:
        return {
          text: "",
          icon: null,
        };
    }
  };

  // Info: (20260320 - Julian) 尚未開始
  if (record.analysisStatus === AIAnalysisStatus.PENDING) {
    return (
      <tr className="border-b border-slate-200 bg-slate-50 opacity-80 transition-colors last:border-0">
        <td className="p-2 lg:px-6 lg:py-4">
          <div className="mx-auto flex size-14 items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-white p-1 shadow-sm sm:size-16">
            <Loader2 className="size-6 animate-spin text-orange-500" />
          </div>
        </td>
        <td className="p-2 text-center text-xs font-semibold whitespace-nowrap text-slate-400 lg:px-6 lg:py-4 lg:text-sm">
          {timestampToString(record.dateTimestamp).dateWithDash}
        </td>
        <td
          colSpan={5}
          className="p-2 text-center align-middle lg:px-6 lg:py-4"
        >
          <span className="flex items-center justify-center gap-2 text-sm font-medium text-orange-500 italic">
            <Loader2 className="size4 animate-spin text-orange-500" />
            AI Analyzing...
          </span>
        </td>
        <td aria-label="Status" className="p-2 text-center lg:px-6 lg:py-4">
          <div className="flex justify-center">
            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center justify-center rounded-xl bg-slate-200 px-4 py-1.5 text-sm font-bold whitespace-nowrap text-slate-400 shadow-sm"
            >
              Pending
            </button>
          </div>
        </td>
      </tr>
    );
  }

  // Info: (20260320 - Julian) 處理中
  if (record.analysisStatus === AIAnalysisStatus.PROCESSING) {
    return (
      <tr className="border-b border-blue-200 bg-blue-50 text-sm opacity-90 transition-colors last:border-0">
        <td className="p-2 lg:px-6 lg:py-4">
          <div className="mx-auto flex size-14 items-center justify-center overflow-hidden rounded-lg border border-dashed border-blue-300 bg-white p-1 shadow-sm sm:size-16">
            <Loader2 className="size-6 animate-spin text-blue-500" />
          </div>
        </td>
        <td className="p-2 text-center text-xs font-semibold whitespace-nowrap text-blue-400 lg:px-6 lg:py-4 lg:text-sm">
          {timestampToString(record.dateTimestamp).dateWithDash}
        </td>
        <td
          aria-label="AI Processing"
          colSpan={5}
          className="p-2 text-center align-middle lg:px-6 lg:py-4"
        >
          <div className="mx-auto flex max-w-sm flex-col items-center justify-center gap-2">
            <span className="flex items-center justify-center gap-2 text-sm font-bold text-blue-600 italic">
              <Loader2 className="size-4 animate-spin text-blue-500" />
              AI Processing...
            </span>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-200">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-blue-500"></div>
            </div>
          </div>
        </td>
        <td aria-label="Status" className="p-2 text-center lg:px-6 lg:py-4">
          <div className="flex justify-center">
            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center justify-center rounded-xl bg-blue-200 px-4 py-1.5 text-sm font-bold whitespace-nowrap text-blue-500 shadow-sm"
            >
              Processing
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr 
      onClick={handleVerifyClick}
      className={`cursor-pointer transition-colors ${isAnalysisFailed ? "bg-red-200 hover:bg-red-300" : "bg-white hover:bg-orange-100"}`}
    >
      {/* Info: (20260320 - Julian) File */}
      <td className="p-2 lg:px-6 lg:py-4">
        <div className="relative mx-auto flex size14 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-sm sm:size-16">
          {/* Info: (20260312 - Julian) File Preview */}
          {record.file ? (
            <FilePreview
              file={{ filename: record.file.fileName || "Unknown" }}
              fileId={record.file.hash}
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center rounded-lg bg-slate-100 p-1">
              <FileQuestion className="size-6 text-slate-300" />
            </div>
          )}
          {/* Info: (20260320 - Julian) Failed Icon */}
          {isAnalysisFailed && (
            <div className="absolute top-0 left-0 z-10 flex size-full items-center justify-center bg-red-100/50 p-1">
              <CircleAlert size={24} className="text-red-500" />
            </div>
          )}
        </div>
      </td>
      {/* Info: (20260320 - Julian) Date */}
      <td className="p-2 text-center text-xs font-semibold whitespace-nowrap text-slate-800 lg:px-6 lg:py-4 lg:text-sm">
        {timestampToString(record.dateTimestamp).dateWithDash}
      </td>
      {/* Info: (20260320 - Julian) Activity Type */}
      <td className="p-2 lg:px-6 lg:py-4">
        <div className="mb-1 flex items-center text-xs font-bold text-slate-800 lg:text-sm">
          <div className="shrink-0">{renderScope(record.scope).icon}</div>
          {renderScope(record.scope).text}：{record.activityType}
        </div>
        <div className="text-[10px] font-medium text-slate-500 lg:text-xs">
          {record.vendor}
        </div>
      </td>
      {/* Info: (20260320 - Julian) Activity Data */}
      <td className="p-2 text-center whitespace-nowrap lg:px-6 lg:py-4">
        <span className="text-sm font-semibold text-slate-800">
          {record.rawActivityData}{" "}
        </span>
        <span className="text-xs font-bold text-slate-500">{record.unit}</span>
      </td>
      {/* Info: (20260320 - Julian) Emissions */}
      <td className="p-2 text-center text-sm font-semibold whitespace-nowrap text-slate-800 lg:px-6 lg:py-4">
        {record.emissions}
      </td>
      {/* Info: (20260320 - Julian) Intensity */}
      <td className="p-2 text-center lg:px-6 lg:py-4">
        <span
          className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors ${renderIntensity(record.intensity).style}`}
        >
          {renderIntensity(record.intensity).text}
        </span>
      </td>
      {/* Info: (20260320 - Julian) Confidence */}
      <td
        aria-label="AI Confidence"
        className="p-2 text-center lg:px-6 lg:py-4"
      >
        <div className="flex items-center justify-center gap-3">
          <div className="h-2 w-24 shrink-0 overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full ${record.confidence >= 90 ? "bg-emerald-400" : "bg-orange-500"}`}
              style={{ width: `${record.confidence}%` }}
            ></div>
          </div>
          <span className="text-sm font-bold whitespace-nowrap text-slate-700">
            {record.confidence}%
          </span>
        </div>
      </td>
      {/* Info: (20260320 - Julian) Verified */}
      <td className="p-2 text-center lg:px-6 lg:py-4">
        {record.isVerified ? (
          <div className="mx-auto flex flex-col items-center justify-center gap-1 text-emerald-500">
            <CheckCircle2 size={24} />
            <span className="text-sm font-bold">
              {t("esg_table.verified")}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-1 text-orange-500">
            <FileQuestion size={24} />
            <span className="text-sm font-bold whitespace-nowrap">
              {t("esg_table.unverified")}
            </span>
          </div>
        )}
      </td>
    </tr>
  );
}
