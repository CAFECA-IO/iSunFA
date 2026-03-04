"use client";

import { TrashIcon, Loader2 } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { FilePreview } from "@/components/common/file_preview";
import { IJournal } from "@/interfaces/ocr";

const JournalGridItem = ({ journal }: { journal: IJournal }) => {
  const { t } = useTranslation();

  return (
    <div className="relative flex size-72 flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border border-gray-300 bg-gray-100 p-2 hover:cursor-pointer hover:bg-orange-100">
      <div className="absolute top-2 right-2 flex items-center gap-2">
        <button
          type="button"
          className="rounded-md bg-red-100 p-1 text-red-600 transition-colors hover:bg-red-200"
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
}: {
  isLoading: boolean;
  journals: IJournal[];
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
    <JournalGridItem key={journal.id} journal={journal} />
  ));

  return (
    <div className="grid grid-cols-4 gap-2">
      {isLoading ? loadingView : journals.length === 0 ? emptyView : gridView}
    </div>
  );
};

export default JournalGridLayout;
