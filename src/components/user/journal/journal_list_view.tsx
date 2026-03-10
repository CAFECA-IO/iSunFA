"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
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
import { IJournal } from "@/interfaces/journal";
import JournalListLayout from "@/components/user/journal/journal_list_layout";
import JournalGridLayout from "@/components/user/journal/journal_grid_layout";
import JournalDetailModal from "@/components/user/journal/journal_detail_modal";
import ConfirmModal from "@/components/common/confirm_modal";
import { ApiCode } from "@/lib/utils/status";

export default function JournalListView() {
  const { t } = useTranslation();
  const params = useParams();

  // Info: (20260309 - Julian) 從 URL 取得帳簿 ID
  const accountBookId = params?.account_book_id as string;

  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [displayType, setDisplayType] = useState<"grid" | "list">("list");
  const [journals, setJournals] = useState<IJournal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [keyWord, setKeyWord] = useState<string>("");
  const [debouncedKeyWord, setDebouncedKeyWord] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  useEffect(() => {
    // Info: (20260305 - Julian) 設置緩衝，避免過度請求
    const timer = setTimeout(() => {
      setDebouncedKeyWord(keyWord);
    }, 500);
    return () => clearTimeout(timer);
  }, [keyWord]);

  const [selectedJournal, setSelectedJournal] = useState<IJournal | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const [journalToDelete, setJournalToDelete] = useState<IJournal | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const handleJournalSelect = (journal: IJournal) => {
    setSelectedJournal(journal);
    setIsModalOpen(true);
  };

  const handleJournalUpdate = (updatedJournal: IJournal) => {
    setJournals((prev) =>
      prev.map((j) => (j.id === updatedJournal.id ? updatedJournal : j)),
    );
    setSelectedJournal(updatedJournal);
  };

  const handleDeleteClick = (journal: IJournal) => {
    setJournalToDelete(journal);
  };

  const executeDelete = async () => {
    if (!journalToDelete) return;

    setIsDeleting(true);
    try {
      const data = await request<IApiResponse<null>>(
        `/api/v1/user/account_book/${accountBookId}/journal/${journalToDelete.id}`,
        {
          method: "DELETE",
        },
      );

      if (data.code === ApiCode.SUCCESS) {
        setJournals((prev) => prev.filter((j) => j.id !== journalToDelete.id));
        setJournalToDelete(null);

        // Info: (20260305 - Julian) Also close detail modal if it's the same journal
        if (selectedJournal?.id === journalToDelete.id) {
          setIsModalOpen(false);
          setSelectedJournal(null);
        }
      }
    } catch (error) {
      console.error("Failed to delete journal:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchJournals = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("orderBy", `{"createdAt":"${sortOrder}"}`);
      if (debouncedKeyWord) params.append("keyWord", debouncedKeyWord);

      if (startDate) {
        const [y, m, d] = startDate.split("-").map(Number);
        const start = new Date(y, m - 1, d, 0, 0, 0, 0);
        params.append("startDate", start.toISOString());
      }

      if (endDate) {
        const [y, m, d] = endDate.split("-").map(Number);
        const end = new Date(y, m - 1, d, 23, 59, 59, 999);
        params.append("endDate", end.toISOString());
      }

      const data = await request<IApiResponse<{ journals: IJournal[] }>>(
        `/api/v1/user/account_book/${accountBookId}/journal?${params.toString()}`,
      );
      if (data.payload?.journals) {
        setJournals(data.payload.journals);
      }
    } catch (error) {
      console.error("Failed to fetch journals:", error);
    } finally {
      setIsLoading(false);
    }
  }, [sortOrder, debouncedKeyWord, startDate, endDate, accountBookId]);

  useEffect(() => {
    fetchJournals();
  }, [fetchJournals]);

  const displayLayout =
    displayType === "list" ? (
      <JournalListLayout
        isLoading={isLoading}
        journals={journals}
        onSelect={handleJournalSelect}
        onDelete={handleDeleteClick}
      />
    ) : (
      <JournalGridLayout
        isLoading={isLoading}
        journals={journals}
        onSelect={handleJournalSelect}
        onDelete={handleDeleteClick}
      />
    );

  return (
    <div className="flex size-full flex-col gap-4">
      {/* Info: (20260304 - Julian) Filter Area */}
      <div className="flex flex-col items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:flex-wrap sm:gap-4">
        {/* Info: (20260305 - Julian) Left Actions: Search + Date */}
        <div className="flex flex-1 flex-col items-center gap-2 sm:flex-row sm:gap-4">
          {/* Info: (20260304 - Julian) Search input */}
          <div className="relative w-full sm:w-[200px]">
            <Search
              className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              aria-label="Search journals"
              type="text"
              value={keyWord}
              onChange={(e) => setKeyWord(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pr-4 pl-10 text-sm transition-all outline-none placeholder:text-gray-400 focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500"
              placeholder={t("ocr.search_placeholder") as string}
            />
          </div>

          <div className="hidden h-6 w-px bg-gray-200 sm:block"></div>

          {/* Info: (20260304 - Julian) Date Picker */}
          <div className="flex items-center gap-2">
            <Calendar className="hidden text-gray-400 sm:block" size={18} />
            <div className="flex flex-col items-center gap-2 text-sm sm:flex-row">
              <div className="flex items-center gap-2">
                <p className="block text-gray-700 sm:hidden">
                  {t("ocr.start_date")}
                </p>
                <input
                  type="date"
                  aria-label="Start Date"
                  value={startDate}
                  max={endDate || undefined}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-gray-700 transition-colors outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>
              <span className="hidden text-gray-400 sm:block">-</span>
              <div className="flex items-center gap-2">
                <p className="block text-gray-700 sm:hidden">
                  {t("ocr.end_date")}
                </p>
                <input
                  type="date"
                  aria-label="End Date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-gray-700 transition-colors outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Info: (20260305 - Julian) Right Actions: Sort + View Mode */}
        <div className="flex items-center gap-2">
          {/* Info: (20260304 - Julian) Sort by date */}
          <button
            title={
              sortOrder === "asc"
                ? (t("ocr.sort_asc") as string)
                : (t("ocr.sort_desc") as string)
            }
            type="button"
            className="flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-xs whitespace-nowrap text-gray-600 transition-colors hover:bg-gray-50 hover:text-orange-600 active:scale-95 sm:text-base"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          >
            {sortOrder === "asc" ? (
              <div className="flex items-center gap-2">
                <p>{t("ocr.sort_asc")}</p>
                <ArrowDown size={18} className="shrink-0" />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p>{t("ocr.sort_desc")}</p>
                <ArrowUp size={18} className="shrink-0" />
              </div>
            )}
          </button>

          <div className="mx-1 h-6 w-px bg-gray-200"></div>

          {/* Info: (20260304 - Julian) Display type */}
          <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-1">
            <button
              title={t("ocr.list_view") as string}
              type="button"
              className={`flex h-7 w-8 items-center justify-center rounded transition-colors ${displayType === "list"
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
              className={`flex h-7 w-8 items-center justify-center rounded transition-colors ${displayType === "grid"
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

      {/* Info: (20260305 - Julian) Detail Modal */}
      <JournalDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        journal={selectedJournal}
        onUpdate={handleJournalUpdate}
        onDelete={handleDeleteClick}
      />

      {/* Info: (20260305 - Julian) Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!journalToDelete}
        onClose={() => setJournalToDelete(null)}
        title={t("ocr.confirm_delete_title") as string}
        message={t("ocr.confirm_delete_msg") as string}
        confirmText={
          isDeleting
            ? (t("ocr.please_wait") as string)
            : (t("ocr.delete") as string)
        }
        cancelText={t("ocr.cancel") as string}
        onConfirm={executeDelete}
      />
    </div>
  );
}
