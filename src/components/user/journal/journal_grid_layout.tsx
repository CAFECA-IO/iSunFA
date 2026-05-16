"use client";

import { Loader2, CircleAlert, Trash2, Undo2 } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { FilePreview } from "@/components/common/file_preview";
import { IJournal } from "@/interfaces/journal";
import { AIAnalysisStatus } from "@/constants/ai_analysis_status";
import { timestampToString } from "@/lib/utils/common";
import { translateAiNote } from "@/utils/ai_note_translator";

const JournalGridItem = ({
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

  const isAnalysisFailed = journal.analysisStatus === AIAnalysisStatus.FAILED;
  const failedMessage =
    journal.aiNote && journal.aiNote.trim().length > 0
      ? translateAiNote(journal.aiNote, t)
      : (t("ocr.ai.failed") as string);

  const actionButtons = (
    <div className="absolute top-2 right-2 z-20 flex items-center gap-2">
      {journal.isDeleted ? (
        <button
          type="button"
          title={t("common.restore")}
          onClick={(e) => {
            e.stopPropagation();
            onRestore(journal.id);
          }}
          className="rounded-md bg-emerald-100 p-1.5 text-emerald-600 shadow-sm transition-colors hover:bg-emerald-200"
        >
          <Undo2 size={20} />
        </button>
      ) : (
        <button
          type="button"
          title={t("common.delete")}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(journal.id);
          }}
          className="rounded-md bg-red-100 p-1.5 text-red-600 shadow-sm transition-colors hover:bg-red-200"
        >
          <Trash2 size={20} />
        </button>
      )}
    </div>
  );

  const deletedOverlay = journal.isDeleted ? (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg bg-slate-100/70 backdrop-blur-[1px]">
      <Trash2 size={36} className="mb-2 text-slate-500 drop-shadow-sm" />
      <span className="rounded-full bg-slate-200/90 px-3 py-1 text-xs font-bold text-slate-600 shadow-sm">
        {t("common.status_deleted")}
      </span>
    </div>
  ) : null;

  // Info: (20260320 - Julian) 尚未開始
  if (journal.analysisStatus === AIAnalysisStatus.PENDING) {
    return (
      <div className="relative flex size-72 flex-col items-center justify-center gap-2 justify-self-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50 p-2 opacity-90">
        {deletedOverlay}
        {actionButtons}
        <div className="relative size-[250px] shrink-0 overflow-hidden rounded-md">
          <div className="flex size-full flex-col items-center justify-center gap-3 bg-gray-100">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            <span className="mt-2 rounded-full bg-white/70 pr-2 pb-1 pl-2 text-sm font-medium text-orange-600 italic drop-shadow-md">
              AI Analyzing...
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-400">
          {timestampToString(journal.tradingTimestamp).dateWithDash}
        </p>
      </div>
    );
  }

  // Info: (20260320 - Julian) 處理中
  if (journal.analysisStatus === AIAnalysisStatus.PROCESSING) {
    return (
      <div className="relative flex size-72 flex-col items-center justify-center gap-2 justify-self-center overflow-hidden rounded-lg border border-blue-300 bg-blue-50 p-2 opacity-90 shadow-sm">
        {deletedOverlay}
        {actionButtons}
        <div className="relative size-[250px] shrink-0 overflow-hidden rounded-md">
          <div className="flex size-full flex-col items-center justify-center gap-4 bg-white/60 px-6 backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <div className="flex w-full flex-col items-center gap-2">
              <span className="text-sm font-bold text-blue-600 italic drop-shadow-sm">
                AI Processing...
              </span>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-200">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-blue-500"></div>
              </div>
            </div>
          </div>
        </div>
        <p className="text-xs font-medium text-blue-400">
          {timestampToString(journal.tradingTimestamp).dateWithDash}
        </p>
      </div>
    );
  }

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
    <div
      className={`relative flex size-72 flex-col items-center justify-center gap-2 justify-self-center overflow-hidden rounded-lg border p-2 transition-colors ${journal.isDeleted ? "border-gray-200 bg-gray-50 opacity-50" : isAnalysisFailed ? "border-red-300 bg-red-200 hover:cursor-pointer hover:bg-red-300" : journal.isVerified ? "border-emerald-500 bg-emerald-50 hover:cursor-pointer hover:bg-emerald-100" : "border-orange-500 bg-orange-50 hover:cursor-pointer hover:bg-orange-100"}`}
      onClick={!journal.isDeleted ? () => onSelect(journal) : undefined}
    >
      {deletedOverlay}
      {actionButtons}
      {/* Info: (20260320 - Julian) File Preview */}
      <div className="relative size-[250px] shrink-0">
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
          <div className="absolute top-0 left-0 z-10 flex size-full flex-col items-center justify-center bg-red-100/70 p-2 backdrop-blur-sm transition-opacity">
            <CircleAlert
              size={36}
              className="mb-2 text-red-500 drop-shadow-sm"
            />
            <span
              className="w-full truncate rounded bg-white/80 px-2 py-1 text-center text-xs font-bold text-red-600 shadow-sm"
              title={failedMessage}
            >
              {failedMessage}
            </span>
          </div>
        )}
      </div>
      {/* Info: (20260320 - Julian) Trading Date */}
      <p className="text-xs text-slate-700">
        {timestampToString(journal.tradingTimestamp).dateWithDash}
      </p>
    </div>
  );
};

const JournalGridLayout = ({
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
    <div className="col-span-4 flex items-center justify-center">
      <Loader2 className="mx-auto h-6 w-6 animate-spin text-orange-500" />
    </div>
  );
  const emptyView = (
    <div className="col-span-4 flex items-center justify-center p-8 text-slate-500">
      {t("ocr.no_records")}
    </div>
  );
  const gridView = journals.map((journal) => (
    <JournalGridItem
      key={journal.id}
      journal={journal}
      onSelect={onSelect}
      onDelete={onDelete}
      onRestore={onRestore}
    />
  ));

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {isLoading ? loadingView : journals.length === 0 ? emptyView : gridView}
    </div>
  );
};

export default JournalGridLayout;
