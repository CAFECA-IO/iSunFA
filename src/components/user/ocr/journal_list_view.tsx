"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "@/i18n/i18n_context";
import {
  Search,
  Calendar,
  ArrowDown,
  ArrowUp,
  LayoutGrid,
  List as ListIcon,
} from "lucide-react";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { IJournal } from "@/interfaces/ocr";
import JournalListLayout from "@/components/user/ocr/journal_list_layout";
import JournalGridLayout from "@/components/user/ocr/journal_grid_layout";
import JournalDetailModal from "@/components/user/ocr/journal_detail_modal";

export default function JournalListView() {
  const { t } = useTranslation();

  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [displayType, setDisplayType] = useState<"grid" | "list">("list");
  const [journals, setJournals] = useState<IJournal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [selectedJournal, setSelectedJournal] = useState<IJournal | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const handleJournalSelect = (journal: IJournal) => {
    setSelectedJournal(journal);
    setIsModalOpen(true);
  };

  const handleJournalUpdate = (updatedJournal: IJournal) => {
    setJournals((prev) =>
      prev.map((j) => (j.id === updatedJournal.id ? updatedJournal : j)),
    );
  };

  const fetchJournals = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await request<IApiResponse<{ journals: IJournal[] }>>(
        `/api/v1/ocr?orderBy={"createdAt":"${sortOrder}"}`,
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

  const displayLayout =
    displayType === "list" ? (
      <JournalListLayout
        isLoading={isLoading}
        journals={journals}
        onSelect={handleJournalSelect}
      />
    ) : (
      <JournalGridLayout
        isLoading={isLoading}
        journals={journals}
        onSelect={handleJournalSelect}
      />
    );

  return (
    <div className="flex size-full flex-col gap-8">
      {/* Info: (20260304 - Julian) Filter Area */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4">
        {/* Left Actions: Search + Date */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Info: (20260304 - Julian) Search input */}
          <div className="relative min-w-[200px]">
            <Search
              className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              aria-label="Search journals"
              type="text"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pr-4 pl-10 text-sm transition-all outline-none placeholder:text-gray-400 focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500"
              placeholder={t("ocr.search_placeholder") as string}
            />
          </div>

          <div className="hidden h-6 w-px bg-gray-200 sm:block"></div>

          {/* Info: (20260304 - Julian) Date Picker */}
          <div className="flex items-center gap-2">
            <Calendar className="text-gray-400" size={18} />
            <div className="flex items-center gap-2 text-sm">
              <input
                type="date"
                aria-label="Start Date"
                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-gray-700 transition-colors outline-none focus:border-orange-500 focus:bg-white"
              />
              <span className="text-gray-400">-</span>
              <input
                type="date"
                aria-label="End Date"
                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-gray-700 transition-colors outline-none focus:border-orange-500 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Right Actions: Sort + View Mode */}
        <div className="flex items-center gap-2">
          {/* Info: (20260304 - Julian) Sort by date */}
          <button
            title={
              sortOrder === "asc"
                ? (t("ocr.sort_asc") as string)
                : (t("ocr.sort_desc") as string)
            }
            type="button"
            className="flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-gray-600 transition-colors hover:bg-gray-50 hover:text-orange-600 active:scale-95"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          >
            {sortOrder === "asc" ? (
              <div className="flex items-center gap-2">
                <p>{t("ocr.sort_asc")}</p>
                <ArrowDown size={18} />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p>{t("ocr.sort_desc")}</p>
                <ArrowUp size={18} />
              </div>
            )}
          </button>

          <div className="mx-1 h-6 w-px bg-gray-200"></div>

          {/* Info: (20260304 - Julian) Display type */}
          <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-1">
            <button
              title={t("ocr.list_view") as string}
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
              title={t("ocr.grid_view") as string}
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

      {/* Detail Modal */}
      <JournalDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        journal={selectedJournal}
        onUpdate={handleJournalUpdate}
      />
    </div>
  );
}
