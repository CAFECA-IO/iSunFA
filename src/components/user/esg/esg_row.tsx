"use client";

import {
  CheckCircle2,
  Zap,
  Truck,
  Cloud,
  FileQuestion,
  Loader2,
  CircleAlert,
  Trash2,
  Undo2,
  Leaf,
} from "lucide-react";
import { numberWithCommas, timestampToString } from "@/lib/utils/common";
import { IEsgRecordDetail, EsgScope, EsgIntensity } from "@/interfaces/esg";
import { FilePreview } from "@/components/common/file_preview";
import AiConfidence from "@/components/common/ai_confidence";
import { useTranslation } from "@/i18n/i18n_context";
import { AIAnalysisStatus } from "@/constants/ai_analysis_status";
import { EsgActivityTypeMapping } from "@/constants/esg_activity_type";

export function EsgRow({
  record,
  onVerifyClick,
  onDelete,
  onRestore,
}: {
  record: IEsgRecordDetail;
  onVerifyClick: (record: IEsgRecordDetail) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
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
            className={`inline-flex items-center justify-center rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold whitespace-nowrap text-slate-600 transition-colors`}
          >
            {t("common.no_data")}
          </span>
        );
    }
  };

  const renderScope = (scope: EsgScope | null) => {
    const activityType =
      EsgActivityTypeMapping.find((a) => a.key === record.activityType)
        ?.value ?? record.activityType?.toString();

    switch (scope) {
      case EsgScope.SCOPE_1:
        return (
          <div className="flex items-center">
            <div className="shrink-0">
              <Zap className="mr-1.5 size-4 text-amber-500" />
            </div>
            <div className="flex flex-wrap">
              <p>{t("esg_table.scope.scope_1")}：</p>
              <p>{activityType}</p>
            </div>
          </div>
        );
      case EsgScope.SCOPE_2:
        return (
          <div className="flex items-center">
            <div className="shrink-0">
              <Truck className="mr-1.5 size-4 text-blue-500" />
            </div>
            <div className="flex flex-wrap">
              <p>{t("esg_table.scope.scope_2")}：</p>
              <p>{activityType}</p>
            </div>
          </div>
        );
      case EsgScope.SCOPE_3:
        return (
          <div className="flex items-center">
            <div className="shrink-0">
              <Cloud className="mr-1.5 size-4 text-green-500" />
            </div>
            <div className="flex flex-wrap">
              <p>{t("esg_table.scope.scope_3")}：</p>
              <p>{activityType}</p>
            </div>
          </div>
        );
      default:
        // Info: (20260325 - Julian) 如果沒有資料，就不要顯示 scope
        return (
          <div className="w-fit rounded-full border border-slate-300 bg-slate-100 px-1.5 py-1 text-slate-600">
            {t("common.no_data")}
          </div>
        );
    }
  };

  const mobileActionBtn = (
    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
      {record.isDeleted ? (
        <button
          title={t("common.restore")}
          onClick={() => onRestore(record.id)}
          className="rounded-full bg-emerald-100 p-2.5 text-emerald-600"
        >
          <Undo2 size={20} />
        </button>
      ) : (
        <button
          title={t("common.delete")}
          onClick={() => onDelete(record.id)}
          className="rounded-full bg-red-100 p-2.5 text-red-600"
        >
          <Trash2 size={20} />
        </button>
      )}
    </div>
  );

  const desktopActionsTd = (
    <td
      aria-label="Actions"
      className="hidden p-2 text-center align-middle md:table-cell lg:px-4 lg:py-4"
      onClick={(e) => e.stopPropagation()}
    >
      {record.isDeleted ? (
        <button
          title={t("common.restore")}
          onClick={() => onRestore(record.id)}
          className="rounded-full p-2 text-slate-400 transition-colors hover:bg-emerald-100 hover:text-emerald-500"
        >
          <Undo2 size={20} />
        </button>
      ) : (
        <button
          title={t("common.delete")}
          onClick={() => onDelete(record.id)}
          className="rounded-full p-2 text-slate-400 transition-colors hover:bg-red-100 hover:text-red-500"
        >
          <Trash2 size={20} />
        </button>
      )}
    </td>
  );

  const dateString = timestampToString(record.tradingDate).dateWithDash;

  // Info: (20260320 - Julian) 尚未開始
  if (record.analysisStatus === AIAnalysisStatus.PENDING) {
    return (
      <tr
        className={`block border-b-4 border-double text-sm transition-colors last:border-0 md:table-row md:border-b md:border-solid ${record.isDeleted ? "border-slate-700 bg-slate-50 text-slate-500 opacity-50" : "border-slate-500 bg-slate-50 text-slate-400 md:border-slate-300"}`}
      >
        {/* Info: (20260601 - Julian) 手機版 */}
        <td className="block w-full p-4 md:hidden">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-white shadow-sm">
                {record.isDeleted ? (
                  <Trash2 className="size-6 text-slate-400" />
                ) : (
                  <Loader2 className="size-6 animate-spin text-orange-400" />
                )}
              </div>
              <div className="flex flex-1 flex-col justify-center gap-1.5">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-800">
                    {timestampToString(record.tradingDate).dateWithDash}
                  </p>
                </div>
              </div>
            </div>

            <div className="h-px w-full bg-slate-200" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">狀態：</span>
                {record.isDeleted ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-slate-400">
                    <Trash2 size={14} />
                    {t("common.status_deleted")}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-orange-500 italic sm:text-xs">
                    <Loader2 className="size-3 animate-spin text-orange-500" />
                    {t("common.ai.pending")}
                  </span>
                )}
              </div>
              <div className="ml-auto">{mobileActionBtn}</div>
            </div>
          </div>
        </td>
        {/* Info: (20260601 - Julian) 電腦版 */}
        <td className="hidden p-2 md:table-cell lg:px-6 lg:py-4">
          <div className="mx-auto flex size-14 items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-white p-1 shadow-sm sm:size-16">
            {record.isDeleted ? (
              <Trash2 className="size-6 text-slate-400" />
            ) : (
              <Loader2 className="size-6 animate-spin text-orange-500" />
            )}
          </div>
        </td>
        <td className="hidden p-2 text-center text-xs font-semibold whitespace-nowrap text-slate-400 md:table-cell lg:px-6 lg:py-4 lg:text-sm">
          {dateString}
        </td>
        <td
          colSpan={5}
          className="hidden p-2 text-center align-middle md:table-cell lg:px-6 lg:py-4"
        >
          {record.isDeleted ? (
            <span className="flex items-center justify-center gap-2 font-bold text-slate-500">
              <Trash2 size={16} />
              {t("common.status_deleted")}
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2 text-[10px] font-medium text-orange-500 italic sm:text-xs lg:text-sm">
              <Loader2 className="size-4 animate-spin text-orange-500" />
              {t("common.ai.pending")}
            </span>
          )}
        </td>
        {desktopActionsTd}
      </tr>
    );
  }

  // Info: (20260320 - Julian) 處理中
  if (record.analysisStatus === AIAnalysisStatus.PROCESSING) {
    return (
      <tr
        className={`block border-b-4 border-double text-sm transition-colors last:border-0 md:table-row md:border-b md:border-solid ${record.isDeleted ? "border-slate-700 bg-slate-50 text-slate-500 opacity-50" : "border-slate-500 bg-blue-50 text-blue-400 md:border-blue-200"}`}
      >
        {/* Info: (20260601 - Julian) 手機版 */}
        <td className="block w-full p-4 md:hidden">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-blue-300 bg-white shadow-sm">
                {record.isDeleted ? (
                  <Trash2 className="size-6 text-slate-400" />
                ) : (
                  <Loader2 className="size-6 animate-spin text-blue-500" />
                )}
              </div>
              <div className="flex flex-1 flex-col justify-center gap-1.5">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-800">
                    {timestampToString(record.tradingDate).dateWithDash}
                  </p>
                </div>
              </div>
            </div>

            <div className="h-px w-full bg-slate-200" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">狀態：</span>
                {record.isDeleted ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-slate-400">
                    <Trash2 size={14} />
                    {t("common.status_deleted")}
                  </span>
                ) : (
                  <div className="flex flex-col gap-1">
                    <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 italic sm:text-xs">
                      <Loader2 className="size-3 animate-spin text-blue-500" />
                      {t("esg_table.ai.processing")}
                    </span>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-blue-200">
                      <div className="h-full w-2/3 animate-pulse rounded-full bg-blue-500"></div>
                    </div>
                  </div>
                )}
              </div>
              <div className="ml-auto">{mobileActionBtn}</div>
            </div>
          </div>
        </td>
        {/* Info: (20260601 - Julian) 電腦版 */}
        <td className="hidden p-2 md:table-cell lg:px-6 lg:py-4">
          <div className="mx-auto flex size-14 items-center justify-center overflow-hidden rounded-lg border border-dashed border-blue-300 bg-white p-1 shadow-sm sm:size-16">
            {record.isDeleted ? (
              <Trash2 className="size-6 text-slate-400" />
            ) : (
              <Loader2 className="size-6 animate-spin text-blue-500" />
            )}
          </div>
        </td>
        <td className="hidden p-2 text-center text-xs font-semibold whitespace-nowrap text-blue-400 md:table-cell lg:px-6 lg:py-4 lg:text-sm">
          {dateString}
        </td>
        <td
          aria-label="AI Processing"
          colSpan={5}
          className="hidden p-2 text-center align-middle md:table-cell lg:px-6 lg:py-4"
        >
          {record.isDeleted ? (
            <span className="flex items-center justify-center gap-2 font-bold text-slate-500">
              <Trash2 size={16} />
              {t("common.status_deleted")}
            </span>
          ) : (
            <div className="mx-auto flex max-w-sm flex-col items-center justify-center gap-2">
              <span className="flex items-center justify-center gap-2 text-[10px] font-bold text-blue-600 italic sm:text-xs lg:text-sm">
                <Loader2 className="size-4 animate-spin text-blue-500" />
                {t("esg_table.ai.processing")}
              </span>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-200">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-blue-500"></div>
              </div>
            </div>
          )}
        </td>
        {desktopActionsTd}
      </tr>
    );
  }

  // Info: (20260320 - Julian) 分析出錯
  if (record.analysisStatus === AIAnalysisStatus.FAILED) {
    return (
      <tr
        onClick={!record.isDeleted ? handleVerifyClick : undefined}
        className={`block border-b-4 border-double text-sm transition-colors last:border-0 md:table-row md:border-b md:border-solid ${record.isDeleted ? "border-slate-700 bg-slate-50 text-slate-500 opacity-50" : "border-slate-500 bg-red-50 text-red-500 hover:cursor-pointer hover:bg-red-100 md:border-slate-300"}`}
      >
        {/* Info: (20260601 - Julian) 手機版 */}
        <td className="block w-full p-4 md:hidden">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-red-300 bg-white shadow-sm">
                {record.isDeleted ? (
                  <Trash2 className="size-6 text-slate-400" />
                ) : (
                  <CircleAlert className="size-6 text-red-500" />
                )}
              </div>
              <div className="flex flex-1 flex-col justify-center gap-1.5">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-800">
                    {timestampToString(record.tradingDate).dateWithDash}
                  </p>
                </div>
              </div>
            </div>

            <div className="h-px w-full bg-slate-200" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">狀態：</span>
                {record.isDeleted ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-slate-400">
                    <Trash2 size={14} />
                    {t("common.status_deleted")}
                  </span>
                ) : (
                  <span
                    className="line-clamp-2 text-[10px] font-bold text-red-500 sm:text-xs"
                    title={
                      record.aiNote || (t("esg_table.ai.failed") as string)
                    }
                  >
                    {record.aiNote || t("esg_table.ai.failed")}
                  </span>
                )}
              </div>
              <div className="ml-auto">{mobileActionBtn}</div>
            </div>
          </div>
        </td>
        {/* Info: (20260601 - Julian) 電腦版 */}
        <td className="hidden p-2 md:table-cell lg:px-6 lg:py-4">
          <div className="mx-auto flex size-14 items-center justify-center overflow-hidden rounded-lg border border-dashed border-red-300 bg-white p-1 shadow-sm sm:size-16">
            {record.isDeleted ? (
              <Trash2 className="size-6 text-slate-400" />
            ) : (
              <CircleAlert className="size-6 text-red-500" />
            )}
          </div>
        </td>
        <td className="hidden p-2 text-center text-xs font-semibold whitespace-nowrap md:table-cell lg:px-6 lg:py-4 lg:text-sm">
          {dateString}
        </td>
        <td
          colSpan={5}
          className="hidden p-2 text-center align-middle md:table-cell lg:px-6 lg:py-4"
        >
          {record.isDeleted ? (
            <span className="flex items-center justify-center gap-2 font-bold text-slate-500">
              <Trash2 size={16} />
              {t("common.status_deleted")}
            </span>
          ) : (
            <p className="text-[10px] font-bold text-red-500 sm:text-xs lg:text-sm">
              {record.aiNote || t("esg_table.ai.failed")}
            </p>
          )}
        </td>
        {desktopActionsTd}
      </tr>
    );
  }

  const rawActivity =
    record.unit !== "" ? (
      <>
        <span className="text-sm font-semibold text-slate-800">
          {numberWithCommas(record.amount)}{" "}
        </span>
        <span className="text-xs font-bold text-slate-500">{record.unit}</span>
      </>
    ) : (
      "-"
    );

  return (
    <tr
      onClick={!record.isDeleted ? handleVerifyClick : undefined}
      className={`block border-b-4 border-double border-slate-500 text-sm transition-colors last:border-0 md:table-row md:border-b md:border-solid md:border-slate-300 ${record.isDeleted ? "bg-slate-50 opacity-50" : isAnalysisFailed ? "cursor-pointer bg-red-200 hover:bg-red-300" : "cursor-pointer bg-white hover:bg-orange-100"}`}
    >
      {/* Info: (20260601 - Julian) 手機版 */}
      <td className="block w-full p-4 md:hidden">
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
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
              {isAnalysisFailed && (
                <div className="absolute top-0 left-0 z-10 flex size-full items-center justify-center bg-red-100/50 p-1">
                  <CircleAlert size={24} className="text-red-500" />
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col justify-center gap-1.5">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-slate-800">{dateString}</p>
              </div>
              <div className="text-xs font-bold text-slate-800">
                {renderScope(record.scope)}
              </div>
              <p className="pl-6 text-[10px] font-medium text-slate-500">
                {record.vendor}
              </p>
            </div>
          </div>

          <div className="h-px w-full bg-slate-100" />

          {/* Info: (20260601 - Julian) 活動與排放數據 */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">
                {t("esg_table.header.raw_data")}
              </span>
              <span className="text-xs font-bold text-slate-700">
                {rawActivity}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">
                {t("esg_table.header.intensity_label")}
              </span>
              {renderIntensity(record.intensity)}
            </div>
            <div className="mt-1 flex flex-col gap-1 rounded-lg border border-slate-100 bg-slate-50 p-3">
              <span className="text-xs font-bold text-slate-500">
                {t("esg_table.header.emissions")} (KGCO2E)
              </span>
              <span className="flex items-center gap-2 text-base font-bold text-slate-800">
                <Leaf className="size-4 text-green-500" />
                {numberWithCommas(record.emissions)}
              </span>
            </div>
          </div>

          <div className="h-px w-full bg-slate-100" />

          {/* Info: (20260601 - Julian) 狀態與操作 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">狀態：</span>
              {record.isDeleted ? (
                <span className="flex items-center gap-1 text-xs font-bold text-slate-400">
                  <Trash2 size={14} />
                  {t("common.status_deleted")}
                </span>
              ) : record.isVerified ? (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-500">
                  <CheckCircle2 size={14} />
                  {t("verify.status.verified")}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-bold text-orange-500">
                  <FileQuestion size={14} />
                  {t("verify.status.unverified")}
                </span>
              )}
              <AiConfidence confidence={record.confidence} barOnly />
            </div>
            <div className="ml-auto">{mobileActionBtn}</div>
          </div>
        </div>
      </td>
      {/* Info: (20260601 - Julian) 電腦版 */}
      <td className="hidden p-2 md:table-cell lg:px-6 lg:py-4">
        <div className="relative mx-auto flex size-14 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-sm sm:size-16">
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
      <td className="hidden p-2 text-center text-xs font-semibold whitespace-nowrap text-slate-800 md:table-cell lg:px-6 lg:py-4 lg:text-sm">
        {dateString}
      </td>
      {/* Info: (20260320 - Julian) Activity Type */}
      <td className="hidden p-2 md:table-cell lg:px-6 lg:py-4">
        <div className="mb-1 text-xs font-bold text-slate-800 lg:text-sm">
          {renderScope(record.scope)}
        </div>
        <div className="text-[10px] font-medium text-slate-500 lg:text-xs">
          {record.vendor}
        </div>
      </td>
      {/* Info: (20260320 - Julian) Activity Data */}
      <td className="hidden p-2 text-center whitespace-nowrap md:table-cell lg:px-6 lg:py-4">
        {rawActivity}
      </td>
      {/* Info: (20260320 - Julian) Emissions */}
      <td
        aria-label={t("esg_table.emissions")}
        className="hidden p-2 text-center whitespace-nowrap md:table-cell lg:px-6 lg:py-4"
      >
        <div className="flex flex-col items-center justify-center gap-1">
          <span className="text-sm font-semibold text-slate-800">
            {numberWithCommas(record.emissions)}
          </span>
        </div>
      </td>
      {/* Info: (20260320 - Julian) Intensity */}
      <td className="hidden p-2 text-center md:table-cell lg:px-6 lg:py-4">
        {renderIntensity(record.intensity)}
      </td>
      {/* Info: (20260409 - Julian) Status / AI Confidence */}
      <td className="hidden p-2 text-center md:table-cell lg:px-6 lg:py-4">
        <div className="flex flex-col items-center gap-2">
          {record.isDeleted ? (
            <div className="mx-auto flex flex-col items-center justify-center gap-1 text-slate-400">
              <Trash2 size={24} />
              <span className="text-[10px] font-bold lg:text-xs">
                {t("common.status_deleted")}
              </span>
            </div>
          ) : record.isVerified ? (
            <div className="mx-auto flex flex-col items-center justify-center gap-1 text-emerald-500">
              <CheckCircle2 size={24} />
              <span className="text-[10px] font-bold lg:text-xs">
                {t("verify.status.verified")}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-1 text-orange-500">
              <FileQuestion size={24} />
              <span className="text-[10px] font-bold whitespace-nowrap lg:text-xs">
                {t("verify.status.unverified")}
              </span>
            </div>
          )}
          <AiConfidence confidence={record.confidence} barOnly />
        </div>
      </td>
      {desktopActionsTd}
    </tr>
  );
}
