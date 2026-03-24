"use client";

import { Loader2, CircleAlert, CheckCircle2, FileQuestion } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { FilePreview } from "@/components/common/file_preview";
import AiConfidenceBar from "@/components/common/ai_confidence_bar";
import { IJournal } from "@/interfaces/journal";
import { AIAnalysisStatus } from "@/constants/ai_analysis_status";
import { timestampToString } from "@/lib/utils/common";

const JournalListItem = ({
  journal,
  onSelect,
}: {
  journal: IJournal;
  onSelect: (j: IJournal) => void;
}) => {
  const { t } = useTranslation();

  const isAnalysisFailed = journal.analysisStatus === AIAnalysisStatus.FAILED;

  const formattedDate = timestampToString(
    journal.tradingTimestamp,
  ).dateWithDash;
  const formattedID = (
    <span className="inline-block w-[100px] overflow-hidden text-ellipsis whitespace-nowrap">
      {journal.id}
    </span>
  );

  // Info: (20260320 - Julian) 尚未開始
  if (journal.analysisStatus === AIAnalysisStatus.PENDING) {
    return (
      <tr className="border-b border-slate-300 bg-white text-slate-400 last:border-0">
        <td className="w-[150px] px-3 py-2 align-middle sm:px-6">
          <div className="flex size-12 items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50 p-1 sm:h-20 sm:w-20">
            <Loader2 className="size-4 animate-spin text-orange-400 sm:size-6" />
          </div>
        </td>
        <td className="px-3 py-2 align-middle font-medium whitespace-nowrap sm:px-6">
          {formattedDate}
        </td>
        <td className="px-3 py-2 align-middle font-medium whitespace-nowrap sm:px-6">
          {formattedID}
        </td>
        <td
          colSpan={3}
          className="px-3 py-2 align-middle text-xs sm:px-6 sm:text-sm"
        >
          <span className="flex items-center gap-2 italic">
            <Loader2 className="size-4 animate-spin text-orange-400 sm:size-6" />
            AI Analyzing...
          </span>
        </td>
      </tr>
    );
  }

  // Info: (20260320 - Julian) 處理中
  if (journal.analysisStatus === AIAnalysisStatus.PROCESSING) {
    return (
      <tr className="border-b border-blue-200 bg-blue-50 text-blue-500 opacity-90 last:border-0">
        <td className="w-[150px] px-3 py-2 align-middle sm:px-6">
          <div className="flex size-12 items-center justify-center overflow-hidden rounded-lg border border-dashed border-blue-300 bg-white p-1 sm:h-20 sm:w-20">
            <Loader2 className="size-4 animate-spin text-blue-500 sm:size-6" />
          </div>
        </td>
        <td className="px-3 py-2 align-middle font-medium whitespace-nowrap sm:px-6">
          {formattedDate}
        </td>
        <td className="px-3 py-2 align-middle font-medium whitespace-nowrap sm:px-6">
          {formattedID}
        </td>
        <td
          aria-label="AI Processing"
          colSpan={3}
          className="px-3 py-2 align-middle text-xs sm:px-6 sm:text-sm"
        >
          <div className="max-w-sm flex-col gap-2">
            <span className="mb-2 flex items-center gap-2 font-bold italic">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              AI Processing...
            </span>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-200">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-blue-500"></div>
            </div>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr
      className={`cursor-pointer last:border-0 ${isAnalysisFailed ? "bg-red-200 hover:bg-red-300" : "bg-white hover:bg-orange-100"}`}
      onClick={() => onSelect(journal)}
    >
      {/* Info: (20260320 - Julian) File */}
      <td className="w-[150px] px-3 py-2 align-middle text-slate-700 sm:w-32 sm:px-6">
        <div className="relative flex size-12 items-center justify-center overflow-hidden rounded-lg border border-gray-100 bg-gray-50 p-1 sm:size-20">
          {/* Info: (20260320 - Julian) File Preview */}
          {journal.file?.hash ? (
            <FilePreview
              file={{ filename: journal.file.fileName || "Unknown" }}
              fileId={journal.file.hash}
              className="size-full object-cover"
            />
          ) : (
            <span className="text-xs text-gray-400">{t("ocr.no_image")}</span>
          )}
          {/* Info: (20260320 - Julian) Failed Icon */}
          {isAnalysisFailed && (
            <div className="absolute top-0 left-0 z-10 flex size-full items-center justify-center bg-red-100/50 p-1">
              <CircleAlert size={24} className="text-red-500" />
            </div>
          )}
        </div>
      </td>
      {/* Info: (20260320 - Julian) Trading Date */}
      <td className="px-3 py-2 align-middle font-medium whitespace-nowrap text-slate-700 sm:px-6">
        {formattedDate}
      </td>
      {/* Info: (20260323 - Julian) ID */}
      <td
        aria-label={t("ocr.id")}
        className="px-3 py-2 align-middle font-medium whitespace-nowrap text-slate-700 sm:px-6"
      >
        {formattedID}
      </td>
      {/* Info: (20260320 - Julian) Content */}
      <td className="px-3 py-2 align-middle text-xs text-slate-700 sm:px-6 sm:text-sm">
        <pre className="line-clamp-2 whitespace-break-spaces sm:whitespace-normal">
          {journal.text}
        </pre>
      </td>
      {/* Info: (20260323 - Julian) Confidence */}
      <td
        aria-label={t("ocr.confidence")}
        className="px-3 py-2 text-right sm:px-6"
      >
        <AiConfidenceBar confidence={journal.confidence} />
      </td>
      {/* Info: (20260316 - Julian) Status */}
      <td
        aria-label="Status"
        className="p-2 text-center align-middle lg:px-6 lg:py-4"
      >
        {journal.isVerified ? (
          <div className="mx-auto flex flex-col items-center justify-center gap-1 text-emerald-500">
            <CheckCircle2 size={24} />
            <span className="text-xs font-bold whitespace-nowrap">
              {t("verify.status.verified")}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-1.5 text-orange-500">
            <FileQuestion size={24} />
            <span className="text-xs font-bold whitespace-nowrap">
              {t("verify.status.unverified")}
            </span>
          </div>
        )}
      </td>
    </tr>
  );
};

const JournalListLayout = ({
  isLoading,
  journals,
  onSelect,
}: {
  isLoading: boolean;
  journals: IJournal[];
  onSelect: (journal: IJournal) => void;
}) => {
  const { t } = useTranslation();

  const loadingView = (
    <tr>
      <td colSpan={6} className="px-3 py-8 text-center text-slate-500 sm:px-6">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-orange-500" />
      </td>
    </tr>
  );

  const emptyView = (
    <tr>
      <td colSpan={6} className="px-3 py-8 text-center text-slate-500 sm:px-6">
        {t("ocr.no_records")}
      </td>
    </tr>
  );

  const listLayout = journals.map((journal) => (
    <JournalListItem key={journal.id} journal={journal} onSelect={onSelect} />
  ));

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full">
        <tbody>
          <tr>
            <th className="w-[150px] bg-slate-100 px-3 py-3 text-left text-xs text-slate-700 sm:px-6 sm:text-base">
              {t("ocr.file")}
            </th>
            <th className="bg-slate-100 px-3 py-3 text-center text-xs text-slate-700 sm:px-6 sm:text-left sm:text-base">
              {t("ocr.created_date")}
            </th>
            <th className="bg-slate-100 px-3 py-3 text-center text-xs text-slate-700 sm:px-6 sm:text-left sm:text-base">
              {t("ocr.id")}
            </th>
            <th className="bg-slate-100 px-3 py-3 text-left text-xs text-slate-700 sm:px-6 sm:text-base">
              {t("ocr.journal")}
            </th>
            <th className="bg-slate-100 px-3 py-3 text-left text-xs text-slate-700 sm:px-6 sm:text-base">
              {t("ocr.confidence")}
            </th>
            <th className="bg-slate-100 px-3 py-3 text-left text-xs text-slate-700 sm:px-6 sm:text-base">
              {t("ocr.status")}
            </th>
          </tr>
          {isLoading
            ? loadingView
            : journals.length === 0
              ? emptyView
              : listLayout}
        </tbody>
      </table>
    </div>
  );
};

export default JournalListLayout;
