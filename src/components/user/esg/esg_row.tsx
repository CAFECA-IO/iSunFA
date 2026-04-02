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
import AiConfidence from "@/components/common/ai_confidence";
import { useTranslation } from "@/i18n/i18n_context";
import { AIAnalysisStatus } from "@/constants/ai_analysis_status";

export function EsgRow({
  record,
  onVerifyClick,
}: {
  record: IEsgRecord;
  onVerifyClick: (record: IEsgRecord) => void;
}) {
  const { t } = useTranslation();

  const isAnalysisFailed = record.analysisStatus === AIAnalysisStatus.FAILED;

  const handleVerifyClick = () => onVerifyClick(record);

  const renderIntensity = (intensity: EsgIntensity) => {
    switch (intensity) {
      case EsgIntensity.HIGH:
        return (
          <span
            className={`inline-flex items-center justify-center rounded-full border border-red-300 bg-red-100 px-3 py-1 text-xs font-semibold whitespace-nowrap text-red-600 transition-colors`}
          >
            {t("esg_table.intensity.high")}
          </span>
        );
      case EsgIntensity.MEDIUM:
        return (
          <span
            className={`inline-flex items-center justify-center rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-semibold whitespace-nowrap text-amber-600 transition-colors`}
          >
            {t("esg_table.intensity.medium")}
          </span>
        );
      case EsgIntensity.LOW:
        return (
          <span
            className={`inline-flex items-center justify-center rounded-full border border-green-300 bg-green-100 px-3 py-1 text-xs font-semibold whitespace-nowrap text-green-600 transition-colors`}
          >
            {t("esg_table.intensity.low")}
          </span>
        );
      default:
        // Info: (20260325 - Julian) 如果沒有資料，就不要顯示 intensity
        return (
          <span
            className={`inline-flex items-center justify-center rounded-full border border-gray-300 bg-gray-100 px-3 py-1 text-xs font-semibold whitespace-nowrap text-gray-600 transition-colors`}
          >
            {t("common.no_data")}
          </span>
        );
    }
  };

  const renderScope = (scope: EsgScope | null) => {
    switch (scope) {
      case EsgScope.SCOPE_1:
        return (
          <div className="flex items-center">
            <div className="shrink-0">
              <Zap className="mr-1.5 h-4 w-4 text-amber-500" />
            </div>
            {t("esg_table.scope.scope_1")}：{record.activityType}
          </div>
        );
      case EsgScope.SCOPE_2:
        return (
          <div className="flex items-center">
            <div className="shrink-0">
              <Truck className="mr-1.5 h-4 w-4 text-blue-500" />
            </div>
            {t("esg_table.scope.scope_2")}：{record.activityType}
          </div>
        );
      case EsgScope.SCOPE_3:
        return (
          <div className="flex items-center">
            <div className="shrink-0">
              <Cloud className="mr-1.5 h-4 w-4 text-green-500" />
            </div>
            {t("esg_table.scope.scope_3")}：{record.activityType}
          </div>
        );
      default:
        // Info: (20260325 - Julian) 如果沒有資料，就不要顯示 scope
        return (
          <div className="w-fit rounded-full border border-gray-300 bg-gray-100 px-1.5 py-1 text-gray-600">
            {t("common.no_data")}
          </div>
        );
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
          colSpan={6}
          className="p-2 text-center align-middle lg:px-6 lg:py-4"
        >
          <span className="flex items-center justify-center gap-2 text-sm font-medium text-orange-500 italic">
            <Loader2 className="size4 animate-spin text-orange-500" />
            {t("common.ai.pending")}
          </span>
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
          colSpan={6}
          className="p-2 text-center align-middle lg:px-6 lg:py-4"
        >
          <div className="mx-auto flex max-w-sm flex-col items-center justify-center gap-2">
            <span className="flex items-center justify-center gap-2 text-sm font-bold text-blue-600 italic">
              <Loader2 className="size-4 animate-spin text-blue-500" />
              {t("esg_table.ai.processing")}
            </span>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-200">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-blue-500"></div>
            </div>
          </div>
        </td>
      </tr>
    );
  }

  // Info: (20260320 - Julian) 分析出錯
  if (record.analysisStatus === AIAnalysisStatus.FAILED) {
    return (
      <tr
        onClick={handleVerifyClick}
        className="border-b border-slate-200 bg-red-50 text-red-500 opacity-80 transition-colors last:border-0 hover:cursor-pointer hover:bg-red-100"
      >
        <td className="p-2 lg:px-6 lg:py-4">
          <div className="mx-auto flex size-14 items-center justify-center overflow-hidden rounded-lg border border-dashed border-red-300 bg-white p-1 shadow-sm sm:size-16">
            <CircleAlert className="size-6 text-red-500" />
          </div>
        </td>
        <td className="p-2 text-center text-xs font-semibold whitespace-nowrap lg:px-6 lg:py-4 lg:text-sm">
          {timestampToString(record.dateTimestamp).dateWithDash}
        </td>
        <td
          colSpan={6}
          className="p-2 text-center align-middle lg:px-6 lg:py-4"
        >
          <p className="font-bold text-red-500">{t("esg_table.ai.failed")}</p>
        </td>
      </tr>
    );
  }

  const rawActivity =
    record.rawActivityData !== "" && record.unit !== "" ? (
      <>
        <span className="text-sm font-semibold text-slate-800">
          {record.rawActivityData}{" "}
        </span>
        <span className="text-xs font-bold text-slate-500">{record.unit}</span>
      </>
    ) : (
      "-"
    );

  return (
    <tr
      onClick={handleVerifyClick}
      className={`cursor-pointer transition-colors ${isAnalysisFailed ? "bg-red-200 hover:bg-red-300" : "bg-white hover:bg-orange-100"}`}
    >
      {/* Info: (20260320 - Julian) File */}
      <td className="p-2 lg:px-6 lg:py-4">
        <div className="size14 relative mx-auto flex items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-sm sm:size-16">
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
        <div className="mb-1 text-xs font-bold text-slate-800 lg:text-sm">
          {renderScope(record.scope)}
        </div>
        <div className="text-[10px] font-medium text-slate-500 lg:text-xs">
          {record.vendor}
        </div>
      </td>
      {/* Info: (20260320 - Julian) Activity Data */}
      <td className="p-2 text-center whitespace-nowrap lg:px-6 lg:py-4">
        {rawActivity}
      </td>
      {/* Info: (20260320 - Julian) Emissions */}
      <td className="p-2 text-center text-sm font-semibold whitespace-nowrap text-slate-800 lg:px-6 lg:py-4">
        {record.emissions}
      </td>
      {/* Info: (20260320 - Julian) Intensity */}
      <td className="p-2 text-center lg:px-6 lg:py-4">
        {renderIntensity(record.intensity)}
      </td>
      {/* Info: (20260320 - Julian) Confidence */}
      <td
        aria-label="AI Confidence"
        className="p-2 text-center lg:px-6 lg:py-4"
      >
        <AiConfidence confidence={record.confidence} barOnly />
      </td>
      {/* Info: (20260320 - Julian) Verified */}
      <td className="p-2 text-center lg:px-6 lg:py-4">
        {record.isVerified ? (
          <div className="mx-auto flex flex-col items-center justify-center gap-1 text-emerald-500">
            <CheckCircle2 size={24} />
            <span className="text-sm font-bold">
              {t("verify.status.verified")}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-1 text-orange-500">
            <FileQuestion size={24} />
            <span className="text-sm font-bold whitespace-nowrap">
              {t("verify.status.unverified")}
            </span>
          </div>
        )}
      </td>
    </tr>
  );
}
