"use client";

import { TrashIcon, Loader2, CircleAlert } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { FilePreview } from "@/components/common/file_preview";
import { IJournal } from "@/interfaces/journal";
import { AIAnalysisStatus } from "@/interfaces/ai_analysis_status";

const JournalGridItem = ({
  journal,
  onSelect,
  onDelete,
}: {
  journal: IJournal;
  onSelect: (j: IJournal) => void;
  onDelete: (j: IJournal) => void;
}) => {
  const { t } = useTranslation();

  const isAnalysisFailed = journal.analysisStatus === AIAnalysisStatus.FAILED;

  // Info: (20260320 - Julian) 尚未開始
  if (journal.analysisStatus === AIAnalysisStatus.PENDING) {
    return (
      <div className="relative flex size-72 flex-col items-center justify-center gap-2 justify-self-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50 p-2 opacity-90">
        <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
          <button
            type="button"
            disabled
            className="cursor-not-allowed rounded-md bg-gray-50 p-1 text-gray-300 shadow-sm"
          >
            <TrashIcon size={24} />
          </button>
        </div>
        <div className="relative size-[250px] shrink-0 overflow-hidden rounded-md">
          <div className="flex size-full flex-col items-center justify-center gap-3 bg-gray-100">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            <span className="mt-2 rounded-full bg-white/70 pr-2 pb-1 pl-2 text-sm font-medium text-orange-600 italic drop-shadow-md">
              AI Analyzing...
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-400">
          {new Date(journal.createdAt).toLocaleString()}
        </p>
      </div>
    );
  }

  // Info: (20260320 - Julian) 處理中
  if (journal.analysisStatus === AIAnalysisStatus.PROCESSING) {
    return (
      <div className="relative flex size-72 flex-col items-center justify-center gap-2 justify-self-center overflow-hidden rounded-lg border border-blue-300 bg-blue-50 p-2 opacity-90 shadow-sm">
        <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
          <button
            type="button"
            disabled
            className="cursor-not-allowed rounded-md bg-gray-50 p-1 text-gray-300 shadow-sm"
          >
            <TrashIcon size={24} />
          </button>
        </div>
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
          {new Date(journal.createdAt).toLocaleString()}
        </p>
      </div>
    );
  }

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      className={`relative flex size-72 flex-col items-center justify-center gap-2 justify-self-center overflow-hidden rounded-lg border border-gray-300 p-2 hover:cursor-pointer ${isAnalysisFailed ? "bg-red-200 hover:bg-red-300" : "bg-gray-100 hover:bg-orange-100"}`}
      onClick={() => onSelect(journal)}
    >
      {/* Info: (20260320 - Julian) Delete Button */}
      <div className="absolute top-2 right-2 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(journal);
          }}
          className="rounded-md bg-red-100 p-1 text-red-600 shadow-sm transition-colors hover:bg-red-200"
        >
          <TrashIcon size={24} />
        </button>
      </div>
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
          <div className="absolute top-0 left-0 z-10 flex size-full items-center justify-center bg-red-100/50 p-1">
            <CircleAlert size={24} className="text-red-500" />
          </div>
        )}
      </div>
      {/* Info: (20260320 - Julian) Trading Date */}
      <p className="text-xs text-slate-700">
        {new Date(journal.createdAt).toLocaleString()}
      </p>
    </div>
  );
};

const JournalGridLayout = ({
  isLoading,
  journals,
  onSelect,
  onDelete,
}: {
  isLoading: boolean;
  journals: IJournal[];
  onSelect: (journal: IJournal) => void;
  onDelete: (journal: IJournal) => void;
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
    />
  ));

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {isLoading ? loadingView : journals.length === 0 ? emptyView : gridView}
    </div>
  );
};

export default JournalGridLayout;
