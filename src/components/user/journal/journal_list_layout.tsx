"use client";

import { TrashIcon, Loader2 } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { FilePreview } from "@/components/common/file_preview";
import { IJournal } from "@/interfaces/journal";

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

  const formattedDate = new Date(journal.createdAt).toLocaleString();

  const formattedDateSplit = formattedDate.split(" ");

  const dateStrForDesktop = (
    <p className="hidden text-sm sm:block">{formattedDate}</p>
  );
  const dateStrForMobile = (
    <div className="flex flex-col items-center text-xs sm:hidden">
      <span>{formattedDateSplit[0]}</span>
      <span>{formattedDateSplit[1]}</span>
    </div>
  );

  return (
    <tr
      className="cursor-pointer border-b border-slate-200 last:border-0 odd:bg-slate-50 even:bg-white hover:bg-orange-100"
      onClick={() => onSelect(journal)}
    >
      <td className="w-16 px-3 py-2 align-middle text-slate-700 sm:w-32 sm:px-6">
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-gray-100 bg-gray-50 p-1 sm:h-20 sm:w-20">
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
      <td className="w-1/4 px-3 py-2 align-middle whitespace-nowrap text-slate-700 sm:px-6">
        {dateStrForDesktop}
        {dateStrForMobile}
      </td>
      <td className="px-3 py-2 align-middle text-xs text-slate-700 sm:px-6 sm:text-sm">
        <pre className="line-clamp-1 whitespace-break-spaces sm:whitespace-normal">
          {journal.text}
        </pre>
      </td>
      <td className="w-12 px-3 py-2 text-right sm:px-6">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(journal);
          }}
          className="relative rounded-md text-red-600 transition-colors hover:bg-red-200 sm:p-1"
        >
          <TrashIcon size={20} />
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
      onDelete={onDelete}
    />
  ));

  return (
    <div className="overflow-x-auto rounded-md border border-slate-500 bg-white">
      <table className="w-full">
        <tbody>
          <tr>
            <th className="w-16 border-b border-slate-500 bg-slate-100 px-3 py-3 text-left text-xs text-slate-700 sm:w-32 sm:px-6 sm:text-base">
              {t("ocr.file")}
            </th>
            <th className="border-b border-slate-500 bg-slate-100 px-3 py-3 text-center text-xs text-slate-700 sm:px-6 sm:text-left sm:text-base">
              {t("ocr.created_date")}
            </th>
            <th className="border-b border-slate-500 bg-slate-100 px-3 py-3 text-left text-xs text-slate-700 sm:px-6 sm:text-base">
              {t("ocr.journal")}
            </th>
            <th
              className="w-12 border-b border-slate-500 bg-slate-100 px-3 py-3 sm:px-6"
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
