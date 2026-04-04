"use client";

import { Loader2, CircleAlert, CheckCircle2, FileQuestion, Trash2, Undo2 } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { FilePreview } from "@/components/common/file_preview";
import AiConfidence from "@/components/common/ai_confidence";
import { IJournal } from "@/interfaces/journal";
import { AIAnalysisStatus } from "@/constants/ai_analysis_status";
import { timestampToString } from "@/lib/utils/common";

const JournalListItem = ({
  journal,
  onSelect,
  onDelete,
  onRestore,
}: {
  journal: IJournal;
  onSelect: (j: IJournal) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
}) => {
  const { t } = useTranslation();

  const formattedDate = timestampToString(
    journal.tradingTimestamp,
  ).dateWithDash;
  const formattedID = (
    <span className="inline-block w-[100px] overflow-hidden text-ellipsis whitespace-nowrap">
      {journal.id}
    </span>
  );

  const actionsColumn = (
    <td
      aria-label="Actions"
      className="p-2 text-center align-middle lg:px-4 lg:py-4"
      onClick={(e) => e.stopPropagation()}
    >
      {journal.isDeleted ? (
        <button
          title={t("common.restore")}
          onClick={() => onRestore(journal.id)}
          className="rounded-full p-2 text-slate-400 transition-colors hover:bg-emerald-100 hover:text-emerald-500"
        >
          <Undo2 size={20} />
        </button>
      ) : (
        <button
          title={t("common.delete")}
          onClick={() => onDelete(journal.id)}
          className="rounded-full p-2 text-slate-400 transition-colors hover:bg-red-100 hover:text-red-500"
        >
          <Trash2 size={20} />
        </button>
      )}
    </td>
  );

  // Info: (20260320 - Julian) 尚未開始
  if (journal.analysisStatus === AIAnalysisStatus.PENDING) {
    return (
      <tr className={`border-b last:border-0 ${journal.isDeleted ? "border-slate-300 bg-slate-50 text-slate-500 opacity-50" : "border-slate-300 bg-white text-slate-400"}`}>
        <td className="w-[72px] px-3 py-2 align-middle sm:w-[150px] sm:px-6">
          <div className="flex size-12 items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50 p-1 sm:size-20">
            {journal.isDeleted ? <Trash2 className="size-4 text-slate-400 sm:size-6" /> : <Loader2 className="size-4 animate-spin text-orange-400 sm:size-6" />}
          </div>
        </td>
        <td className="w-[80px] px-1 py-2 align-middle text-xs font-medium sm:w-auto sm:px-6 sm:text-sm sm:whitespace-nowrap">
          {formattedDate}
        </td>
        <td className="hidden px-3 py-2 align-middle font-medium whitespace-nowrap sm:table-cell sm:px-6">
          {formattedID}
        </td>
        <td colSpan={2} className="px-3 py-2 text-center align-middle text-xs sm:hidden">
          {journal.isDeleted ? (
            <span className="flex items-center justify-center gap-2 font-bold text-slate-500"><Trash2 size={16}/>{t("common.status_deleted")}</span>
          ) : (
            <span className="flex items-center justify-center gap-2 italic">
              <Loader2 className="size-4 animate-spin text-orange-400" />
              {t("common.ai.pending")}
            </span>
          )}
        </td>
        <td
          colSpan={3}
          className="hidden px-3 py-2 text-center align-middle sm:table-cell sm:px-6 sm:text-sm"
        >
          {journal.isDeleted ? (
            <span className="flex items-center justify-center gap-2 font-bold text-slate-500"><Trash2 size={16}/>{t("common.status_deleted")}</span>
          ) : (
            <span className="flex items-center justify-center gap-2 italic">
              <Loader2 className="size-4 animate-spin text-orange-400 sm:size-6" />
              {t("common.ai.pending")}
            </span>
          )}
        </td>
        {actionsColumn}
      </tr>
    );
  }

  // Info: (20260320 - Julian) 處理中
  if (journal.analysisStatus === AIAnalysisStatus.PROCESSING) {
    return (
      <tr className={`border-b last:border-0 ${journal.isDeleted ? "border-slate-300 bg-slate-50 text-slate-500 opacity-50" : "border-blue-200 bg-blue-50 text-blue-500 opacity-90"}`}>
        <td className="w-[72px] px-3 py-2 align-middle sm:w-[150px] sm:px-6">
          <div className="flex size-12 items-center justify-center overflow-hidden rounded-lg border border-dashed border-blue-300 bg-white p-1 sm:size-20">
            {journal.isDeleted ? <Trash2 className="size-4 text-slate-400 sm:size-6" /> : <Loader2 className="size-4 animate-spin text-blue-500 sm:size-6" />}
          </div>
        </td>
        <td className="w-[80px] px-1 py-2 align-middle text-xs font-medium sm:w-auto sm:px-6 sm:text-sm sm:whitespace-nowrap">
          {formattedDate}
        </td>
        <td className="hidden px-3 py-2 align-middle font-medium whitespace-nowrap sm:table-cell sm:px-6">
          {formattedID}
        </td>
        <td
          aria-label="AI Processing"
          colSpan={2}
          className="px-3 py-2 text-center align-middle text-xs sm:hidden"
        >
          {journal.isDeleted ? (
            <span className="flex items-center justify-center gap-2 font-bold text-slate-500"><Trash2 size={16}/>{t("common.status_deleted")}</span>
          ) : (
            <div className="max-w-sm flex-col gap-2">
              <span className="mb-2 flex items-center gap-2 font-bold italic">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                {t("ocr.ai.processing")}
              </span>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-200">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-blue-500"></div>
              </div>
            </div>
          )}
        </td>
        <td
          aria-label="AI Processing"
          colSpan={3}
          className="hidden px-3 py-2 text-center align-middle sm:table-cell sm:px-6 sm:text-sm"
        >
          {journal.isDeleted ? (
            <span className="flex items-center justify-center gap-2 font-bold text-slate-500"><Trash2 size={16}/>{t("common.status_deleted")}</span>
          ) : (
            <div className="max-w-sm flex-col gap-2">
              <span className="mb-2 flex items-center gap-2 font-bold italic">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                {t("ocr.ai.processing")}
              </span>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-200">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-blue-500"></div>
              </div>
            </div>
          )}
        </td>
        {actionsColumn}
      </tr>
    );
  }

  // Info: (20260320 - Julian) 分析出錯
  if (journal.analysisStatus === AIAnalysisStatus.FAILED) {
    return (
      <tr
        onClick={!journal.isDeleted ? () => onSelect(journal) : undefined}
        className={`border-b last:border-0 transition-colors ${journal.isDeleted ? "border-slate-300 bg-slate-50 text-slate-500 opacity-50" : "hover:cursor-pointer hover:bg-red-100 border-red-200 bg-red-50 text-red-500 opacity-90"}`}
      >
        <td className="w-[72px] px-3 py-2 align-middle sm:w-[150px] sm:px-6">
          <div className="flex size-12 items-center justify-center overflow-hidden rounded-lg border border-dashed border-red-300 bg-white p-1 sm:size-20">
            {journal.isDeleted ? <Trash2 className="size-4 text-slate-400 sm:size-6" /> : <CircleAlert size={24} className="text-red-500" />}
          </div>
        </td>
        <td className="w-[80px] px-1 py-2 align-middle text-xs font-medium sm:w-auto sm:px-6 sm:text-sm sm:whitespace-nowrap">
          {formattedDate}
        </td>
        <td className="hidden px-3 py-2 align-middle font-medium whitespace-nowrap sm:table-cell sm:px-6">
          {formattedID}
        </td>
        <td
          aria-label="AI Failed"
          colSpan={2}
          className="px-3 py-2 text-center align-middle text-xs sm:hidden"
        >
          {journal.isDeleted ? (
            <span className="flex items-center justify-center gap-2 font-bold text-slate-500"><Trash2 size={16}/>{t("common.status_deleted")}</span>
          ) : (
            <p className="font-bold text-red-500">{t("ocr.ai.failed")}</p>
          )}
        </td>
        <td
          aria-label="AI Failed"
          colSpan={3}
          className="hidden px-3 py-2 text-center align-middle sm:table-cell sm:px-6 sm:text-sm"
        >
          {journal.isDeleted ? (
            <span className="flex items-center justify-center gap-2 font-bold text-slate-500"><Trash2 size={16}/>{t("common.status_deleted")}</span>
          ) : (
            <p className="font-bold text-red-500">{t("ocr.ai.failed")}</p>
          )}
        </td>
        {actionsColumn}
      </tr>
    );
  }

  return (
    <tr
      className={`border-b border-slate-300 last:border-0 transition-colors ${journal.isDeleted ? "opacity-50 bg-slate-50" : "bg-white cursor-pointer hover:bg-orange-100"}`}
      onClick={!journal.isDeleted ? () => onSelect(journal) : undefined}
    >
      {/* Info: (20260320 - Julian) File */}
      <td className="w-[72px] px-3 py-2 align-middle text-slate-700 sm:w-[150px] sm:px-6">
        <div className="relative mx-auto flex size-12 items-center justify-center overflow-hidden rounded-lg border border-gray-100 bg-gray-50 p-1 sm:mx-0 sm:size-20">
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
        </div>
      </td>
      {/* Info: (20260320 - Julian) Trading Date */}
      <td className="w-[80px] px-1 py-2 text-center align-middle text-xs font-medium whitespace-nowrap text-slate-700 sm:w-auto sm:px-6 sm:text-left sm:text-sm">
        {formattedDate}
      </td>
      {/* Info: (20260323 - Julian) ID */}
      <td
        aria-label={t("ocr.id")}
        className="hidden px-3 py-2 align-middle font-medium whitespace-nowrap text-slate-700 sm:table-cell sm:px-6"
      >
        {formattedID}
      </td>
      {/* Info: (20260320 - Julian) Content */}
      <td className="hidden px-3 py-2 align-middle text-xs text-slate-700 sm:table-cell sm:px-6 sm:text-sm">
        <pre className="line-clamp-2 whitespace-break-spaces sm:whitespace-normal">
          {journal.text}
        </pre>
      </td>
      {/* Info: (20260323 - Julian) Confidence */}
      <td
        aria-label={t("ocr.confidence")}
        className="w-[60px] px-1 py-2 text-center text-xs sm:w-auto sm:px-6 sm:text-right sm:text-sm"
      >
        <AiConfidence confidence={journal.confidence} barOnly />
      </td>
      {/* Info: (20260316 - Julian) Status */}
      <td
        aria-label="Status"
        className="p-2 text-center align-middle lg:px-6 lg:py-4"
      >
        {journal.isDeleted ? (
          <div className="mx-auto flex flex-col items-center justify-center gap-1 text-slate-400">
            <Trash2 size={24} />
            <span className="text-xs font-bold whitespace-nowrap">
              {t("common.status_deleted")}
            </span>
          </div>
        ) : journal.isVerified ? (
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
      {/* Info: (20260404 - Luphia) Actions */}
      {actionsColumn}
    </tr>
  );
};

const JournalListLayout = ({
  isLoading,
  journals,
  onSelect,
  onDelete,
  onRestore,
}: {
  isLoading: boolean;
  journals: IJournal[];
  onSelect: (journal: IJournal) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
}) => {
  const { t } = useTranslation();

  const loadingView = (
    <tr>
      <td
        colSpan={5}
        className="px-3 py-8 text-center text-slate-500 sm:hidden"
      >
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-orange-500" />
      </td>
      <td
        colSpan={6}
        className="hidden px-3 py-8 text-center text-slate-500 sm:table-cell sm:px-6"
      >
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-orange-500" />
      </td>
    </tr>
  );

  const emptyView = (
    <tr>
      <td
        colSpan={5}
        className="px-3 py-8 text-center text-slate-500 sm:hidden"
      >
        {t("ocr.no_records")}
      </td>
      <td
        colSpan={6}
        className="hidden px-3 py-8 text-center text-slate-500 sm:table-cell sm:px-6"
      >
        {t("ocr.no_records")}
      </td>
    </tr>
  );

  const listLayout = journals.map((journal) => (
    <JournalListItem 
      key={journal.id} 
      journal={journal} 
      onSelect={onSelect} 
      onDelete={onDelete} 
      onRestore={onRestore} 
    />
  ));

  return (
    <div className="w-full max-w-full min-w-0 overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full">
        <tbody>
          <tr>
            <th className="w-[72px] bg-slate-100 px-3 py-3 text-center text-xs text-slate-700 sm:w-[150px] sm:px-6 sm:text-left sm:text-base">
              {t("ocr.file")}
            </th>
            <th className="w-[80px] bg-slate-100 px-1 py-3 text-center text-xs text-slate-700 sm:w-auto sm:px-6 sm:text-left sm:text-base">
              {t("ocr.created_date")}
            </th>
            <th className="hidden bg-slate-100 px-3 py-3 text-center text-xs text-slate-700 sm:table-cell sm:px-6 sm:text-left sm:text-base">
              {t("ocr.id")}
            </th>
            <th className="hidden bg-slate-100 px-3 py-3 text-center text-xs text-slate-700 sm:table-cell sm:px-6 sm:text-left sm:text-base">
              {t("ocr.journal")}
            </th>
            <th className="w-[60px] bg-slate-100 px-1 py-3 text-center text-xs text-slate-700 sm:w-auto sm:px-6 sm:text-left sm:text-base">
              {t("ocr.confidence")}
            </th>
            <th className="bg-slate-100 px-3 py-3 text-center text-xs text-slate-700 sm:px-6 sm:text-left sm:text-base">
              {t("ocr.status")}
            </th>
            <th className="bg-slate-100 px-3 py-3 text-center text-xs text-slate-700 sm:px-6 sm:text-left sm:text-base">
              {t("common.actions")}
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
