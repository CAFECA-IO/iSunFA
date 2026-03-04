"use client";

import { useState, useEffect, useCallback } from "react";
// import { useTranslation } from "@/i18n/i18n_context";
import { 
  PencilIcon, 
  TrashIcon, 
  Loader2, 
  Search, 
  Calendar, 
  ArrowDownAZ, 
  ArrowUpZA, 
  LayoutGrid, 
  List as ListIcon 
} from "lucide-react";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { FilePreview } from "@/components/common/file_preview";

interface IJournal {
  id: string;
  createdAt: string;
  text: string;
  fileId: string;
  file?: {
    id: string;
    hash: string;
    fileName: string;
  };
}

const JournalListItem = ({ journal }: { journal: IJournal }) => {
  return (
    <tr className="border-b border-slate-200 last:border-0 hover:bg-orange-100 odd:bg-slate-50 even:bg-white">
      <td className="w-1/4 px-4 py-2 text-sm text-slate-700 align-middle">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border border-gray-100 bg-gray-50 p-1">
          {journal.file?.hash ? (
            <FilePreview
              file={{filename: journal.file.fileName || "Unknown"}}
              fileId={journal.file.hash}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xs text-gray-400">No Image</span>
          )}
        </div>
      </td>
      <td className="px-4 py-2 text-sm text-slate-700 w-1/4 whitespace-nowrap align-middle">
        {new Date(journal.createdAt).toLocaleString()}
      </td>
      <td className="px-4 py-2 text-sm text-slate-700 align-middle">
        <pre className="line-clamp-1">{journal.text}</pre>
      </td>
      <td className="flex items-center justify-end gap-2 px-4 py-2 align-middle">
        <button
          type="button"
          className="rounded-md p-1 text-slate-700 hover:bg-slate-200 transition-colors"
        >
          <PencilIcon size={16} />
        </button>
        <button
          type="button"
          className="rounded-md p-1 text-red-600 hover:bg-red-100 transition-colors"
        >
          <TrashIcon size={16} />
        </button>
      </td>
    </tr>
  );
};

export default function JournalListView() {
  // const { t } = useTranslation();

  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [displayType, setDisplayType] = useState<"grid" | "list">("list");
  const [journals, setJournals] = useState<IJournal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchJournals = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await request<IApiResponse<{ journals: IJournal[] }>>(
        `/api/v1/ocr?orderBy={"createdAt":"${sortOrder}"}`
      );
      if (data.payload?.journals) {
        setJournals(data.payload.journals);
      }
    } catch (error) {
       console.error("Failed to fetch journals:", error);
    } finally {
       setIsLoading(false);
    }
  }, [sortOrder]);

  useEffect(() => {
    fetchJournals();
  }, [fetchJournals]);

  const listLayout = <div className="rounded-md border overflow-hidden border-slate-500 bg-white">
        <table className="w-full">
          <tbody>
            <tr>
               <th className="bg-slate-100 border-b border-slate-500 px-4 py-2 text-left text-base text-slate-700">
                File
              </th>
              <th className="bg-slate-100 border-b border-slate-500 px-4 py-2 text-left text-base text-slate-700">
                Created Date
              </th>
              <th className="bg-slate-100 border-b border-slate-500 px-4 py-2 text-left text-base text-slate-700">
                Content
              </th>
              <th className="bg-slate-100 border-b border-slate-500 px-4 py-2 text-right text-base text-slate-700">
                Action
              </th>
            </tr>
            {isLoading ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-orange-500" />
                </td>
              </tr>
            ) : journals.length === 0 ? (
              <tr>
                 <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                   No records found.
                 </td>
              </tr>
            ) : (
              journals.map((journal) => <JournalListItem key={journal.id} journal={journal} />)
            )}
          </tbody>
        </table>
      </div>

      const gridLayout = <div className="grid grid-cols-3 gap-2"></div>

      const displayLayout = displayType === "list" ? listLayout : gridLayout;

  return (
    <div className="flex size-full flex-col gap-2">
      {/* Info: (20260304 - Julian) Filter Area */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        
        {/* Left Actions: Search + Date */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Info: (20260304 - Julian) Search input */}
          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              aria-label="Search journals"
              type="text"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm outline-none transition-all placeholder:text-gray-400 focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500"
              placeholder="搜尋標註內容..."
            />
          </div>

          <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>

          {/* Info: (20260304 - Julian) Date Picker */}
          <div className="flex items-center gap-2">
             <Calendar className="text-gray-400" size={18} />
             <div className="flex items-center gap-2 text-sm">
                <input 
                  type="date" 
                  aria-label="Start Date" 
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-gray-700 outline-none transition-colors focus:border-orange-500 focus:bg-white"
                />
                <span className="text-gray-400">-</span>
                <input 
                  type="date" 
                  aria-label="End Date" 
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-gray-700 outline-none transition-colors focus:border-orange-500 focus:bg-white"
                />
             </div>
          </div>
        </div>

        {/* Right Actions: Sort + View Mode */}
        <div className="flex items-center gap-2">
          {/* Info: (20260304 - Julian) Sort by date */}
          <button
            title="發布時間排序"
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 hover:text-orange-600 active:scale-95"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          >
            {sortOrder === "asc" ? <ArrowUpZA size={18} /> : <ArrowDownAZ size={18} />}
          </button>

          <div className="h-6 w-px bg-gray-200 mx-1"></div>

          {/* Info: (20260304 - Julian) Display type */}
          <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-1">
             <button
              title="列表檢視"
              type="button"
              className={`flex h-7 w-8 items-center justify-center rounded transition-colors ${
                displayType === "list" 
                  ? "bg-white text-orange-600 shadow-sm" 
                  : "text-gray-400 hover:text-gray-600"
              }`}
              onClick={() => setDisplayType("list")}
             >
               <ListIcon size={16} />
             </button>
             <button
              title="網格檢視"
              type="button"
              className={`flex h-7 w-8 items-center justify-center rounded transition-colors ${
                displayType === "grid" 
                  ? "bg-white text-orange-600 shadow-sm" 
                  : "text-gray-400 hover:text-gray-600"
              }`}
              onClick={() => setDisplayType("grid")}
             >
               <LayoutGrid size={16} />
             </button>
          </div>
        </div>
      </div>
      {/* Info: (20260304 - Julian) Journal List */}
      {displayLayout}
    </div>
  );
}
