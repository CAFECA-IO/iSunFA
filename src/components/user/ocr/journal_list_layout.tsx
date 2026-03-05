"use client";

import { TrashIcon, Loader2 } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { FilePreview } from "@/components/common/file_preview";
import { IJournal } from "@/interfaces/ocr";

const JournalListItem = ({
  journal,
  onSelect,
  onDelete,
}: {
  journal: IJournal;
  onSelect: (j: IJournal) => void;
  onDelete: (j: IJournal) => void;
}) => {
  const { t } = useTranslation();

  return (
    <tr
      className="cursor-pointer border-b border-slate-200 last:border-0 odd:bg-slate-50 even:bg-white hover:bg-orange-100"
      onClick={() => onSelect(journal)}
    >
      <td className="w-32 px-6 py-2 align-middle text-sm text-slate-700">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border border-gray-100 bg-gray-50 p-1">
          {journal.file?.hash ? (
            <FilePreview
              file={{ filename: journal.file.fileName || "Unknown" }}
              fileId={journal.file.hash}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xs text-gray-400">{t("ocr.no_image")}</span>
          )}
        </div>
      </td>
      <td className="w-1/4 px-6 py-2 align-middle text-sm whitespace-nowrap text-slate-700">
        {new Date(journal.createdAt).toLocaleString()}
      </td>
      <td className="px-6 py-2 align-middle text-sm text-slate-700">
        <pre className="line-clamp-1">{journal.text}</pre>
      </td>
      <td className="px-6 py-2 text-right">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(journal);
          }}
          className="rounded-md p-1 text-red-600 transition-colors hover:bg-red-200"
        >
          <TrashIcon size={24} />
        </button>
      </td>
    </tr>
  );
};

const JournalListLayout = ({
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
    <tr>
      <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-orange-500" />
      </td>
    </tr>
  );

  const emptyView = (
    <tr>
      <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
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
    />
  ));

  return (
    <div className="overflow-x-auto rounded-md border border-slate-500 bg-white">
      <table className="w-full">
        <tbody>
          <tr>
            <th className="w-32 border-b border-slate-500 bg-slate-100 px-6 py-3 text-left text-base text-slate-700">
              {t("ocr.file")}
            </th>
            <th className="border-b border-slate-500 bg-slate-100 px-6 py-3 text-left text-base text-slate-700">
              {t("ocr.created_date")}
            </th>
            <th className="border-b border-slate-500 bg-slate-100 px-6 py-3 text-left text-base text-slate-700">
              {t("ocr.journal")}
            </th>
            <th
              className="border-b border-slate-500 bg-slate-100 px-6 py-3"
              aria-label="actions"
            ></th>
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
