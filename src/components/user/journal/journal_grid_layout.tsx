"use client";

import { TrashIcon, Loader2, FileTextIcon } from "lucide-react";
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

  if (journal.analysisStatus === AIAnalysisStatus.PENDING) {
    return (
      <div className="relative flex size-72 flex-col items-center justify-center gap-2 justify-self-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50 p-2 opacity-90">
        <div className="absolute right-2 top-2 z-10 flex items-center gap-2">
          <button
            type="button"
            disabled
            className="cursor-not-allowed rounded-md p-1 text-gray-300 shadow-sm"
          >
            <TrashIcon size={24} />
          </button>
        </div>
        <div className="relative size-[250px] shrink-0 overflow-hidden rounded-md">
          <div className="flex size-full items-center justify-center bg-gray-100">
            <FileTextIcon size={100} className="text-gray-200" />
          </div>

          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            <span className="text-sm font-medium italic text-orange-600 drop-shadow-md pb-1 pl-2 pr-2 bg-white/70 rounded-full mt-2">
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

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      className="relative flex size-72 flex-col items-center justify-center gap-2 justify-self-center overflow-hidden rounded-lg border border-gray-300 bg-gray-100 p-2 hover:cursor-pointer hover:bg-orange-100"
      onClick={() => onSelect(journal)}
    >
      <div className="absolute top-2 right-2 flex items-center gap-2">
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
      <div className="size-[250px] shrink-0">
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
