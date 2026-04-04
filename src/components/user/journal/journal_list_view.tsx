"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useTranslation } from "@/i18n/i18n_context";
import {
  Search,
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
import RecordTabModal from "@/components/user/common/record_tab_modal";
import ConfirmModal from "@/components/common/confirm_modal";
import Pagination from "@/components/common/pagination";
import { ApiCode } from "@/lib/utils/status";
import { VerifyStatus } from "@/constants/verify_status";
import JournalSummary from "@/components/user/journal/journal_summary";
import { AIAnalysisStatus } from "@/constants/ai_analysis_status";
import { SortOrder } from "@/constants/sort";

const PAGE_SIZE = 12;

enum DisplayType {
  GRID = "grid",
  LIST = "list",
}

export default function JournalListView() {
  const { t } = useTranslation();
  const params = useParams();

  // Info: (20260309 - Julian) 從 URL 取得帳簿 ID
  const accountBookId = params?.account_book_id as string;

  const [journals, setJournals] = useState<IJournal[]>([]);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [keyWord, setKeyWord] = useState<string>("");
  const [debouncedKeyWord, setDebouncedKeyWord] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.DESC);
  const [displayType, setDisplayType] = useState<DisplayType>(DisplayType.LIST);
  const [filteredVerifyStatus, setFilteredVerifyStatus] = useState<
    VerifyStatus | "all"
  >("all");

  useEffect(() => {
    // Info: (20260305 - Julian) 設置緩衝，避免過度請求
    const timer = setTimeout(() => {
      setDebouncedKeyWord(keyWord);
    }, 500);
    return () => clearTimeout(timer);
  }, [keyWord]);

  const [selectedJournal, setSelectedJournal] = useState<IJournal | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isVerifyAllConfirmOpen, setIsVerifyAllConfirmOpen] =
    useState<boolean>(false);

  const [journalToDelete, setJournalToDelete] = useState<IJournal | null>(null);
  const [journalToRestore, setJournalToRestore] = useState<IJournal | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);

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

  const handleDeleteClick = (id: string) => {
    const journal = journals.find(j => j.id === id);
    if (journal) setJournalToDelete(journal);
  };

  const handleRestoreClick = (id: string) => {
    const journal = journals.find(j => j.id === id);
    if (journal) setJournalToRestore(journal);
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

  const executeRestore = async () => {
    if (!journalToRestore) return;

    setIsRestoring(true);
    try {
      const data = await request<IApiResponse<null>>(
        `/api/v1/user/account_book/${accountBookId}/journal/${journalToRestore.id}/restore`,
        {
          method: "POST",
        },
      );

      if (data.code === ApiCode.SUCCESS) {
        setJournals((prev) =>
          prev.map((j) =>
            j.id === journalToRestore.id ? { ...j, isDeleted: false } : j
          )
        );
        setJournalToRestore(null);
      }
    } catch (error) {
      console.error("Failed to restore journal:", error);
    } finally {
      setIsRestoring(false);
    }
  };

  const verifyAllJournals = async () => {
    if (!accountBookId) return;
    try {
      setIsLoading(true);
      await request(
        `/api/v1/user/account_book/${accountBookId}/journal/verify_all`,
        { method: "PUT" },
      );
      await fetchJournals();
    } catch (error) {
      console.error("Failed to verify all journals:", error);
      setIsLoading(false);
    } finally {
      setIsVerifyAllConfirmOpen(false);
    }
  };

  const fetchJournals = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("orderBy", `{"createdAt":"${sortOrder}"}`);
      if (debouncedKeyWord) params.append("keyWord", debouncedKeyWord);

      if (filteredVerifyStatus !== "all") {
        params.append("verifyStatus", filteredVerifyStatus);
      }

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

      params.append("page", currentPage.toString());
      params.append("pageSize", PAGE_SIZE.toString());

      const data = await request<
        IApiResponse<{ data: IJournal[]; total: number }>
      >(
        `/api/v1/user/account_book/${accountBookId}/journal?${params.toString()}`,
      );
      if (data.payload) {
        setJournals(data.payload.data);
        setTotalItems(data.payload.total);
      }
    } catch (error) {
      console.error("Failed to fetch journals:", error);
    } finally {
      setIsLoading(false);
    }
  }, [
    sortOrder,
    debouncedKeyWord,
    filteredVerifyStatus,
    startDate,
    endDate,
    accountBookId,
    currentPage,
  ]);

  // Info: (20260324 - Julian) Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [sortOrder, debouncedKeyWord, filteredVerifyStatus, startDate, endDate]);

  const totalPages = Math.ceil(totalItems / PAGE_SIZE) || 1;

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  useEffect(() => {
    fetchJournals();
  }, [fetchJournals]);

  // Info: (20260320 - Julian) 只針對未完成的日記帳進行個別狀態更新，減輕 DB 負擔
  useEffect(() => {
    const pendingJournals = journals.filter(
      (j) =>
        j.analysisStatus === AIAnalysisStatus.PENDING ||
        j.analysisStatus === AIAnalysisStatus.PROCESSING,
    );

    if (pendingJournals.length === 0) return;

    const intervalId = setInterval(async () => {
      for (const pj of pendingJournals) {
        try {
          const { payload } = await request<IApiResponse<IJournal>>(
            `/api/v1/user/account_book/${accountBookId}/journal/${pj.id}`,
          );
          if (payload) {
            setJournals((prev) =>
              prev.map((old) => (old.id === pj.id ? payload : old)),
            );
          }
        } catch (error) {
          console.error(`Failed to update status for journal ${pj.id}:`, error);
        }
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [journals, accountBookId]);

  const displayLayout =
    displayType === DisplayType.LIST ? (
      <JournalListLayout
        isLoading={isLoading}
        journals={journals}
        onSelect={handleJournalSelect}
        onDelete={handleDeleteClick}
        onRestore={handleRestoreClick}
      />
    ) : (
      <JournalGridLayout
        isLoading={isLoading}
        journals={journals}
        onSelect={handleJournalSelect}
        onDelete={handleDeleteClick}
        onRestore={handleRestoreClick}
      />
    );

  return (
    <div className="flex w-full max-w-full min-w-0 flex-col gap-4">
      <JournalSummary />
      <div className="flex size-full max-w-full min-w-0 flex-col gap-4">
        {/* Info: (20260304 - Julian) Display type */}
        <div className="ml-auto flex items-center gap-4">
          <p className="text-xs font-medium text-slate-600">{t('ocr.display_type')}</p>
          <div className="flex items-center rounded-lg border border-gray-200 bg-gray-100 p-1">
            <button
              title={t("ocr.list_view") as string}
              type="button"
              className={`flex h-7 w-8 items-center justify-center rounded transition-colors ${
                displayType === DisplayType.LIST
                  ? "bg-white text-orange-600 shadow-sm"
                  : "text-gray-400 hover:text-gray-600"
              }`}
              onClick={() => setDisplayType(DisplayType.LIST)}
            >
              <ListIcon size={16} />
            </button>
            <button
              title={t("ocr.grid_view") as string}
              type="button"
              className={`flex h-7 w-8 items-center justify-center rounded transition-colors ${
                displayType === DisplayType.GRID
                  ? "bg-white text-orange-600 shadow-sm"
                  : "text-gray-400 hover:text-gray-600"
              }`}
              onClick={() => setDisplayType(DisplayType.GRID)}
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>

        {/* Info: (20260312 - Julian) Toolbar */}
        <div className="flex flex-col items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row">
          {/* Info: (20260401 - Julian) Search Bar */}
          <div className="relative w-full max-w-sm">
            <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t("ocr.search_placeholder")}
              aria-label={t("ocr.search_placeholder")}
              value={keyWord}
              onChange={(e) => setKeyWord(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-2 pr-4 pl-10 text-sm font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>

          {/* Info: (20260304 - Julian) Date Picker */}
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <div className="flex w-full flex-col items-stretch gap-2 text-sm sm:flex-row sm:items-center">
              <input
                type="date"
                aria-label="Start Date"
                value={startDate}
                max={endDate || undefined}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
              <span className="hidden text-gray-400 sm:block">-</span>
              <input
                type="date"
                aria-label="End Date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Info: (20260401 - Julian) Verify Status Filter */}
          <div className="flex flex-wrap items-center gap-2 text-xs lg:text-sm">
            <select
              aria-label="Filter by verify status"
              value={filteredVerifyStatus}
              onChange={(e) =>
                setFilteredVerifyStatus(e.target.value as VerifyStatus | "all")
              }
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-bold text-slate-600 focus:ring-2 focus:ring-orange-500 focus:outline-none"
            >
              <option value="all">
                {t("verify.status.all", { type: t("verify.type.journal") })}
              </option>
              <option value={VerifyStatus.VERIFIED}>
                {t("verify.status.verified")}
              </option>
              <option value={VerifyStatus.UNVERIFIED}>
                {t("verify.status.unverified")}
              </option>
            </select>
            {/* Info: (20260401 - Julian) Sort by date */}
            <button
              type="button"
              aria-label={t("common.sort.date_aria")}
              onClick={() =>
                setSortOrder(sortOrder === SortOrder.DESC ? SortOrder.ASC : SortOrder.DESC)
              }
              className="flex items-center rounded-lg border border-slate-300 px-4 py-2 font-bold text-slate-600 transition-colors hover:bg-orange-50"
            >
              {sortOrder === SortOrder.DESC
                ? t("common.sort.newest")
                : t("common.sort.oldest")}
              {sortOrder === SortOrder.DESC ? (
                <ArrowDown className="ml-1 h-4 w-4" />
              ) : (
                <ArrowUp className="ml-1 h-4 w-4" />
              )}
            </button>
            {/* Info: (20260401 - Julian) Verify All Button */}
            <button
              type="button"
              aria-label={t("common.verify_all")}
              onClick={() => setIsVerifyAllConfirmOpen(true)}
              disabled={isLoading}
              className="inline-flex items-center justify-center rounded-lg bg-orange-500 px-4 py-1.5 text-sm font-bold whitespace-nowrap text-white shadow-sm enabled:hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {t("common.verify_all")}
            </button>
          </div>
        </div>

        {/* Info: (20260304 - Julian) Journal List */}
        {displayLayout}

        {/* Info: (20260324 - Julian) Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />

        {/* Info: (20260305 - Julian) Detail Modal */}
        <RecordTabModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          defaultTab="journal"
          journalId={selectedJournal?.id}
          file={selectedJournal?.file}
          voucherId={selectedJournal?.voucherId}
          esgId={selectedJournal?.esgRecordId}
          onJournalUpdate={handleJournalUpdate}
          onDelete={() => {
            if (selectedJournal) setJournalToDelete(selectedJournal);
          }}
          onRestore={() => {
            if (selectedJournal) setJournalToRestore(selectedJournal);
          }}
          isDeleted={selectedJournal?.isDeleted}
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
          cancelText={t("common.cancel") as string}
          onConfirm={executeDelete}
        />

        {/* Info: (20260404 - Luphia) Restore Confirmation Modal */}
        <ConfirmModal
          isOpen={!!journalToRestore}
          onClose={() => setJournalToRestore(null)}
          title={t("common.restore") as string}
          message={t("common.restore_confirm_desc") as string}
          confirmText={isRestoring ? (t("ocr.please_wait") as string) : (t("common.restore") as string)}
          cancelText={t("common.cancel") as string}
          onConfirm={executeRestore}
        />

        {/* Info: (20260401 - Julian) Verify All Confirmation Modal */}
        <ConfirmModal
          isOpen={isVerifyAllConfirmOpen}
          onClose={() => setIsVerifyAllConfirmOpen(false)}
          title={t("common.verify_all_confirm_title")}
          message={t("common.verify_all_confirm_desc")}
          confirmText={t("common.confirm")}
          cancelText={t("common.cancel")}
          onConfirm={verifyAllJournals}
        />
      </div>
    </div>
  );
}
