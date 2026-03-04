"use client";

import { useState, useEffect, useCallback } from "react";
// import { useTranslation } from "@/i18n/i18n_context";
import { PencilIcon, TrashIcon, Loader2 } from "lucide-react";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";

interface IJournal {
  id: string;
  createdAt: string;
  text: string;
}

export default function JournalListView() {
  // const { t } = useTranslation();

  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [displayType, setDisplayType] = useState<"grid" | "list">("list");
  const [journals, setJournals] = useState<IJournal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <div className="flex size-full flex-col gap-2">
      {/* Info: (20260304 - Julian) Filter */}
      <div className="flex items-center gap-4">
        {/* Info: (20260304 - Julian) Search input */}
        <input
          aria-label="Search"
          type="text"
          className="flex-1 rounded-md border border-gray-200 bg-white px-2 py-1"
          placeholder="Search"
        />
        {/* Info: (20260304 - Julian) Date Picker */}
        <div className="flex">
          <div className="flex flex-col">
            <p>Start Date</p>
            <input type="date" aria-label="Start Date" />
          </div>
          <div className="flex flex-col">
            <p>End Date</p>
            <input type="date" aria-label="End Date" />
          </div>
        </div>
        {/* Info: (20260304 - Julian) Sort by date */}
        <button
          type="button"
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
        >
          {sortOrder}
        </button>
        {/* Info: (20260304 - Julian) Display type */}
        <button
          type="button"
          onClick={() =>
            setDisplayType(displayType === "grid" ? "list" : "grid")
          }
        >
          {displayType}
        </button>
      </div>
      {/* Info: (20260304 - Julian) List */}
      <div className="rounded-md border overflow-hidden border-slate-500 bg-white">
        <table className="w-full">
          <tbody>
            <tr>
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
              journals.map((journal) => (
                <tr key={journal.id} className="border-b border-slate-200 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2 text-sm text-slate-700 w-1/4 align-top whitespace-nowrap">
                    {new Date(journal.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-sm text-slate-700">
                    <pre className="font-sans whitespace-pre-wrap">{journal.text}</pre>
                  </td>
                  <td className="flex items-center justify-end gap-2 px-4 py-2 align-top">
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
