"use client";

import { TrashIcon, Loader2, CircleAlert } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { FilePreview } from "@/components/common/file_preview";
import { IJournal } from "@/interfaces/journal";
import { AIAnalysisStatus } from "@/interfaces/ai_analysis_status";
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

  const formattedDate = timestampToString(journal.tradingTimestamp).dateWithDash;
  const formattedID = <span className="w-[100px] inline-block whitespace-nowrap overflow-hidden text-ellipsis">{journal.id}</span>

  // Info: (20260320 - Julian) 尚未開始
  if (journal.analysisStatus === AIAnalysisStatus.PENDING) {
    return (
      <tr className="border-b border-slate-300 text-slate-400 last:border-0 bg-white">
        <td className="px-3 py-2 align-middle sm:px-6">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50 p-1 sm:h-20 sm:w-20">
            <Loader2 className="h-4 w-4 animate-spin text-orange-400 sm:h-6 sm:w-6" />
          </div>
        </td>
        <td className="px-3 py-2 align-middle font-medium whitespace-nowrap sm:px-6">
          {formattedDate}
        </td>
        <td className="px-3 py-2 align-middle font-medium whitespace-nowrap sm:px-6">
          {formattedID}
        </td>
        <td className="px-3 py-2 align-middle text-xs sm:px-6 sm:text-sm">
          <span className="flex items-center gap-2 italic">
            <Loader2 className="h-4 w-4 animate-spin text-orange-400" />
            AI Analyzing...
          </span>
        </td>
        <td className="px-3 py-2 text-right sm:px-6">
          <button
            type="button"
            disabled
            className="relative cursor-not-allowed rounded-md p-1 text-gray-300 opacity-50 sm:p-1"
          >
            <TrashIcon size={20} />
          </button>
        </td>
      </tr>
    );
  }

  // Info: (20260320 - Julian) 處理中
  if (journal.analysisStatus === AIAnalysisStatus.PROCESSING) {
    return (
      <tr className="border-b border-blue-200 bg-blue-50 text-blue-500 opacity-90 last:border-0">
        <td className="px-3 py-2 align-middle sm:px-6">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-dashed border-blue-300 bg-white p-1 sm:h-20 sm:w-20">
            <Loader2 className="h-4 w-4 animate-spin text-blue-500 sm:h-6 sm:w-6" />
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
        <td className="w-12 px-3 py-2 text-right sm:px-6">
          <button
            type="button"
            disabled
            className="relative cursor-not-allowed rounded-md p-1 text-blue-300 opacity-50 sm:p-1"
          >
            <TrashIcon size={20} />
          </button>
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
      <td className="w-16 px-3 py-2 align-middle text-slate-700 sm:w-32 sm:px-6">
        <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-gray-100 bg-gray-50 p-1 sm:h-20 sm:w-20">
          {/* Info: (20260320 - Julian) File Preview */}
          {journal.file?.hash ? (
            <FilePreview
              file={{ filename: journal.file.fileName || "Unknown" }}
              fileId={journal.file.hash}
              className="h-full w-full object-cover"
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
      <td className="px-3 py-2 align-middle font-medium whitespace-nowrap text-slate-700 sm:px-6">
        {formattedID}
      </td>
      {/* Info: (20260320 - Julian) Content */}
      <td className="px-3 py-2 align-middle text-xs text-slate-700 sm:px-6 sm:text-sm">
        <pre className="line-clamp-1 whitespace-break-spaces sm:whitespace-normal">
          {journal.text}
        </pre>
      </td>
      {/* Info: (20260323 - Julian) Confidence */}
      <td className="px-3 py-2 text-right sm:px-6">
        {`journal.confidence`}
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
      <td colSpan={3} className="px-3 py-8 text-center text-slate-500 sm:px-6">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-orange-500" />
      </td>
    </tr>
  );

  const emptyView = (
    <tr>
      <td colSpan={4} className="px-3 py-8 text-center text-slate-500 sm:px-6">
        {t("ocr.no_records")}
      </td>
    </tr>
  );

  const listLayout = journals.map((journal) => (
    <JournalListItem
      key={journal.id}
      journal={journal}
      onSelect={onSelect}
    />
  ));

  return (
    <div className="overflow-x-auto rounded-md border border-gray-200 bg-white shadow-sm">
      <table className="w-full">
        <tbody>
          <tr>
            <th className="bg-slate-100 px-3 py-3 text-left text-xs text-slate-700 sm:px-6 sm:text-base">
              {t("ocr.file")}
            </th>
            <th className="bg-slate-100 px-3 py-3 text-center text-xs text-slate-700 sm:px-6 sm:text-left sm:text-base">
              {t("ocr.created_date")}
            </th>
            <th className="bg-slate-100 px-3 py-3 text-center text-xs text-slate-700 sm:px-6 sm:text-left sm:text-base">
              {t("憑證編號")}
            </th>
            <th className="bg-slate-100 px-3 py-3 text-left text-xs text-slate-700 sm:px-6 sm:text-base">
              {t("ocr.journal")}
            </th>
            <th className="bg-slate-100 px-3 py-3 text-left text-xs text-slate-700 sm:px-6 sm:text-base">
              {t("ocr.confidence")}
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
