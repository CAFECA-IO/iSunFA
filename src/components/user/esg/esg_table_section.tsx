"use client";

import { useState, useEffect, useCallback } from "react";
import { FileStack, Info, Search } from "lucide-react";
import Link from "next/link";
import { IEsgRecordDetail, EsgScope, EsgIntensity } from "@/interfaces/esg";
import { EsgRow } from "@/components/user/esg/esg_row";
import RecordTabModal from "@/components/user/common/record_tab_modal";
import ConfirmModal from "@/components/common/confirm_modal";
import DateSortButton from "@/components/user/common/date_sort_button";
import SuccessNotification from "@/components/common/success_notification";
import { request } from "@/lib/utils/request";
import { useParams, useSearchParams } from "next/navigation";
import { IApiResponse } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { useTranslation } from "@/i18n/i18n_context";
import { VerifyStatus } from "@/constants/verify_status";
import Pagination from "@/components/common/pagination";
import { AIAnalysisStatus } from "@/constants/ai_analysis_status";
import { SortOrder } from "@/constants/sort";

interface IEsgTableSectionProps {
  year?: number;
  month?: number | "";
}

const PAGE_SIZE = 12;

export default function EsgTableSection({
  year = undefined,
  month = undefined,
}: IEsgTableSectionProps) {
  const { t } = useTranslation();
  const params = useParams();
  const accountBookId = params?.account_book_id as string;

  const [records, setRecords] = useState<IEsgRecordDetail[]>([]);
  const [recordCount, setRecordCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [keyWord, setKeyWord] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.DESC);
  const [verifyStatusFilter, setVerifyStatusFilter] = useState<
    VerifyStatus | "all"
  >("all");
  const [filteredIntensity, setFilteredIntensity] = useState<string>("all");
  const [filteredScope, setFilteredScope] = useState<string>("all");
  const [hideDeleted, setHideDeleted] = useState<boolean>(true);

  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState<boolean>(false);
  const [isVerifyAllConfirmOpen, setIsVerifyAllConfirmOpen] =
    useState<boolean>(false);
  const [isVerifySuccessOpen, setIsVerifySuccessOpen] =
    useState<boolean>(false);
  const [verifySuccessMsg, setVerifySuccessMsg] = useState<string>("");
  const [isAllVerified, setIsAllVerified] = useState<boolean>(false);
  const [selectedEsgId, setSelectedEsgId] = useState<string | null>(null);

  const [esgToDelete, setEsgToDelete] = useState<IEsgRecordDetail | null>(null);
  const [esgToRestore, setEsgToRestore] = useState<IEsgRecordDetail | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);

  const searchParams = useSearchParams();
  const openId = searchParams?.get("openId");

  useEffect(() => {
    if (openId) {
      setSelectedEsgId(openId);
      setIsVerifyModalOpen(true);
    }
  }, [openId]);

  const fetchRecords = useCallback(async () => {
    if (!accountBookId) return;
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (keyWord) queryParams.append("search", keyWord);
      if (verifyStatusFilter && verifyStatusFilter !== "all")
        queryParams.append("verifyStatus", verifyStatusFilter);
      if (filteredIntensity && filteredIntensity !== "all")
        queryParams.append("intensity", filteredIntensity);
      if (filteredScope && filteredScope !== "all")
        queryParams.append("scope", filteredScope);
      if (year) queryParams.append("year", year.toString());
      if (month) queryParams.append("month", month.toString());
      if (hideDeleted) queryParams.append("hideDeleted", "true");
      queryParams.append("sort", sortOrder);
      queryParams.append("page", currentPage.toString());
      queryParams.append("pageSize", PAGE_SIZE.toString());

      const queryString = queryParams.toString()
        ? `?${queryParams.toString()}`
        : "";

      const res = await request<
        IApiResponse<{ esgRecords: IEsgRecordDetail[]; recordCount: number }>
      >(`/api/v1/user/account_book/${accountBookId}/esg${queryString}`);
      if (res.payload) {
        setRecords(res.payload.esgRecords);
        setRecordCount(res.payload.recordCount);
      }
    } catch (error) {
      console.error("Failed to fetch ESG records:", error);
    } finally {
      setIsLoading(false);
    }
  }, [
    accountBookId,
    keyWord,
    verifyStatusFilter,
    filteredIntensity,
    filteredScope,
    sortOrder,
    year,
    month,
    currentPage,
    hideDeleted,
  ]);

  // Info: (20260324 - Julian) Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
    setIsAllVerified(false);
  }, [
    keyWord,
    verifyStatusFilter,
    filteredIntensity,
    filteredScope,
    sortOrder,
    year,
    month,
    hideDeleted,
  ]);

  const totalPages = Math.ceil(recordCount / PAGE_SIZE) || 1;

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Info: (20260312 - Julian) 延遲 300ms 執行，避免過度請求
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRecords();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchRecords]);

  // Info: (20260325 - Luphia) 抽取需要輪詢的 ID，避免頻繁觸發 Effect
  const pendingIds = records
    .filter(
      (r) =>
        r.analysisStatus === AIAnalysisStatus.PENDING ||
        r.analysisStatus === AIAnalysisStatus.PROCESSING,
    )
    .map((r) => r.id);
  const pendingIdsJoined = pendingIds.join(",");

  // Info: (20260320 - Julian) 只針對未完成的紀錄進行個別狀態更新，減輕 DB 負擔
  useEffect(() => {
    if (!pendingIdsJoined) return;

    let isCancelled = false;
    let timeoutId: NodeJS.Timeout;

    const poll = async () => {
      if (isCancelled) return;
      try {
        const ids = pendingIdsJoined.split(",");
        // Info: (20260325 - Luphia) 平行發送請求，取代 for...of 的阻塞
        const results = await Promise.all(
          ids.map((id) =>
            request<IApiResponse<{ esgRecord: IEsgRecordDetail }>>(
              `/api/v1/user/account_book/${accountBookId}/esg/${id}`,
            ),
          ),
        );

        const updatedRecords = results
          .map((res) => res.payload?.esgRecord)
          .filter(Boolean) as IEsgRecordDetail[];

        if (updatedRecords.length > 0 && !isCancelled) {
          setRecords((prev) => {
            const next = [...prev];
            updatedRecords.forEach((ur) => {
              const idx = next.findIndex((r) => r.id === ur.id);
              if (idx !== -1) next[idx] = ur;
            });
            return next;
          });
        }
      } catch (error) {
        console.error("Failed to update pending ESG records:", error);
      }

      // Info: (20260325 - Luphia) 當次請求全數完成後，才排程下一次的輪詢
      if (!isCancelled) {
        timeoutId = setTimeout(poll, 5000);
      }
    };

    timeoutId = setTimeout(poll, 5000);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [pendingIdsJoined, accountBookId]);

  const handleVerifyOpen = (record: IEsgRecordDetail) => {
    setSelectedEsgId(record.id);
    setIsVerifyModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    const record = records.find((r) => r.id === id);
    if (record) setEsgToDelete(record);
  };

  const handleRestoreClick = (id: string) => {
    const record = records.find((r) => r.id === id);
    if (record) setEsgToRestore(record);
  };

  const executeDelete = async () => {
    if (!esgToDelete) return;

    setIsDeleting(true);
    try {
      const data = await request<IApiResponse<null>>(
        `/api/v1/user/account_book/${accountBookId}/esg/${esgToDelete.id}`,
        {
          method: "DELETE",
        },
      );

      if (data.code === ApiCode.SUCCESS) {
        setRecords((prev) => prev.filter((r) => r.id !== esgToDelete.id));
        setEsgToDelete(null);

        if (selectedEsgId === esgToDelete.id) {
          setIsVerifyModalOpen(false);
          setSelectedEsgId(null);
        }
      }
    } catch (error) {
      console.error("Failed to delete ESG record:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const executeRestore = async () => {
    if (!esgToRestore) return;

    setIsRestoring(true);
    try {
      const data = await request<IApiResponse<null>>(
        `/api/v1/user/account_book/${accountBookId}/esg/${esgToRestore.id}/restore`,
        {
          method: "POST",
        },
      );

      if (data.code === ApiCode.SUCCESS) {
        setRecords((prev) =>
          prev.map((r) =>
            r.id === esgToRestore.id ? { ...r, isDeleted: false } : r,
          ),
        );
        setEsgToRestore(null);
      }
    } catch (error) {
      console.error("Failed to restore ESG record:", error);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleVerifySave = async () => {
    await fetchRecords();
    setIsVerifyModalOpen(false);
  };

  const verifyAllEsgRecords = async () => {
    if (!accountBookId) return;
    try {
      setIsLoading(true);
      const res = await request<IApiResponse<{ count: number }>>(
        `/api/v1/user/account_book/${accountBookId}/esg/verify_all`,
        { method: "PUT" },
      );

      // Info: (20260601 - Julian) 根據 API 回傳的 count，顯示對應的 message
      if (res.payload) {
        if (res.payload.count > 0) {
          setVerifySuccessMsg(
            t("common.verify_all_success_count", {
              count: res.payload.count,
            }) as string,
          );
        } else {
          setVerifySuccessMsg(t("common.verify_all_no_data") as string);
        }
        setIsVerifySuccessOpen(true);
        setIsAllVerified(true);
      }
      // Info: (20260325 - Luphia) 加入 await，且讓 fetchRecords 內部接管後續的 loading 狀態
      await fetchRecords();
    } catch (error) {
      console.error("Failed to verify all ESG records:", error);
      setIsLoading(false); // Info: (20260325 - Luphia) 只有失敗時在這裡關閉 loading
    } finally {
      setIsVerifyAllConfirmOpen(false);
    }
  };

  // Info: (20260325 - Luphia) 判斷是否有套用過濾條件
  const isFiltering =
    keyWord !== "" ||
    verifyStatusFilter !== "all" ||
    filteredIntensity !== "all" ||
    filteredScope !== "all";

  // Info: (20260325 - Luphia) 抽出清除條件的函式，方便後續擴充
  const handleClearFilters = () => {
    setKeyWord("");
    setVerifyStatusFilter("all");
    setFilteredIntensity("all");
    setFilteredScope("all");
  };

  const selectedEsgRecord = records.find((r) => r.id === selectedEsgId);

  return (
    <div className="flex flex-col gap-4">
      {/* Info: (20260312 - Julian) Toolbar */}
      <div className="flex flex-wrap justify-center gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:justify-start lg:gap-4">
        <div className="relative w-full max-w-sm">
          <Search
            size={20}
            className="absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder={t("esg_table.search_placeholder")}
            aria-label={t("esg_table.search_aria")}
            value={keyWord}
            onChange={(e) => setKeyWord(e.target.value)}
            className="w-full rounded-lg border border-slate-300 py-2 pr-4 pl-10 text-sm font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500 focus:outline-none"
          />
        </div>

        <select
          aria-label="Filter by verify status"
          value={verifyStatusFilter}
          onChange={(e) =>
            setVerifyStatusFilter(e.target.value as VerifyStatus | "all")
          }
          className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-bold text-slate-600 focus:ring-2 focus:ring-orange-500 focus:outline-none lg:px-4 lg:text-sm"
        >
          <option value="all">
            {t("verify.status.all", { type: t("verify.type.esg") })}
          </option>
          <option value={VerifyStatus.VERIFIED}>
            {t("verify.status.verified")}
          </option>
          <option value={VerifyStatus.UNVERIFIED}>
            {t("verify.status.unverified")}
          </option>
        </select>
        <select
          aria-label={t("esg_table.filter_intensity_aria")}
          value={filteredIntensity}
          onChange={(e) => setFilteredIntensity(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-bold text-slate-600 focus:ring-2 focus:ring-orange-500 focus:outline-none lg:px-4 lg:text-sm"
        >
          <option value="all">{t("esg_table.filter_intensity_all")}</option>
          <option value={EsgIntensity.HIGH}>
            {t("esg_table.intensity.high")}
          </option>
          <option value={EsgIntensity.MEDIUM}>
            {t("esg_table.intensity.medium")}
          </option>
          <option value={EsgIntensity.LOW}>
            {t("esg_table.intensity.low")}
          </option>
        </select>
        <select
          aria-label={t("esg_table.filter_scope_aria")}
          value={filteredScope}
          onChange={(e) => setFilteredScope(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-bold text-slate-600 focus:ring-2 focus:ring-orange-500 focus:outline-none lg:px-4 lg:text-sm"
        >
          <option value="all">{t("esg_table.filter_scope_all")}</option>
          <option value={EsgScope.SCOPE_1}>
            {t("esg_table.scope.scope_1")}
          </option>
          <option value={EsgScope.SCOPE_2}>
            {t("esg_table.scope.scope_2")}
          </option>
          <option value={EsgScope.SCOPE_3}>
            {t("esg_table.scope.scope_3")}
          </option>
        </select>

        <DateSortButton
          currentOrder={sortOrder}
          onOrderChange={(order) => setSortOrder(order)}
        />

        {/* Info: (20260428 - Julian) 統一驗證鈕的位置 */}
        <button
          type="button"
          aria-label={t("common.verify_all")}
          onClick={() => setIsVerifyAllConfirmOpen(true)}
          disabled={isLoading || isAllVerified || records.length === 0}
          className="inline-flex items-center justify-center rounded-lg bg-orange-500 px-4 py-1.5 text-sm font-bold whitespace-nowrap text-white shadow-sm enabled:hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300 lg:ml-auto"
        >
          {t("common.verify_all")}
        </button>
      </div>

      {/* Info: (20260401 - Julian) Table */}
      <div className="w-full min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:overflow-x-auto">
        {/* Info: (20260324 - Julian) 隱藏已刪除紀錄 toggle */}
        <div className="flex flex-col gap-2 bg-white px-4 py-4 md:flex-row md:items-center md:justify-between lg:px-6">
          <div className="flex cursor-pointer items-center gap-3">
            <button
              type="button"
              id="hideDeletedToggle"
              aria-label="Toggle hide deleted records"
              onClick={(e) => {
                e.preventDefault();
                setHideDeleted(!hideDeleted);
              }}
              className={`relative h-6 w-11 rounded-full transition-colors ${hideDeleted ? "bg-orange-500" : "bg-slate-200"}`}
            >
              <div
                className={`absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform ${hideDeleted ? "translate-x-5.5" : "translate-x-0.5"}`}
              />
            </button>
            <label
              htmlFor="hideDeletedToggle"
              className="cursor-pointer text-sm font-bold text-slate-600"
            >
              {t("voucher.main_view.filters.hide_deleted")}
            </label>
          </div>
        </div>

        {/* Info: (20260312 - Julian) Table */}
        <div className="border-t border-slate-200">
          <table className="w-full border-collapse text-left md:min-w-[800px]">
            <thead className="hidden md:table-header-group">
              <tr className="border-b border-slate-200 bg-slate-50/70">
                <th className="p-2 text-center text-xs font-semibold tracking-wider text-slate-500 uppercase lg:px-6 lg:py-4">
                  {t("esg_table.header.voucher")}
                </th>
                <th className="p-2 text-center text-xs font-semibold tracking-wider text-slate-500 uppercase lg:px-6 lg:py-4">
                  {t("esg_table.header.date")}
                </th>
                <th className="p-2 text-xs font-semibold tracking-wider text-slate-500 uppercase lg:px-6 lg:py-4">
                  {t("esg_table.header.activity_target")}
                </th>
                <th className="p-2 text-center text-xs font-semibold tracking-wider text-slate-500 uppercase lg:px-6 lg:py-4">
                  {t("esg_table.header.raw_data")}
                </th>
                <th className="p-2 text-center text-xs font-semibold tracking-wider text-slate-500 uppercase lg:px-6 lg:py-4">
                  {t("esg_table.header.emissions")}
                </th>
                <th className="p-2 text-center text-xs font-semibold tracking-wider text-slate-500 uppercase lg:px-6 lg:py-4">
                  {t("esg_table.header.intensity_label")}
                </th>
                <th className="p-2 text-center text-xs font-semibold tracking-wider text-slate-500 uppercase lg:px-6 lg:py-4">
                  {t("esg_table.header.status")} /{" "}
                  {t("esg_table.header.ai_confidence")}
                </th>
                <th className="p-2 text-center text-xs font-semibold tracking-wider text-slate-500 uppercase lg:px-6 lg:py-4">
                  {t("common.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="p-2 text-center text-sm font-bold text-slate-500 lg:px-6 lg:py-4"
                  >
                    {t("esg_table.loading")}
                  </td>
                </tr>
              ) : records.length > 0 ? (
                records.map((record) => (
                  <EsgRow
                    key={record.id}
                    record={record}
                    onVerifyClick={handleVerifyOpen}
                    onDelete={handleDeleteClick}
                    onRestore={handleRestoreClick}
                  />
                ))
              ) : (
                <tr>
                  <td
                    colSpan={9}
                    className="bg-white p-8 text-center lg:px-6 lg:py-16"
                  >
                    {/* Info: (20260325 - Luphia) 區分真的沒資料 vs 搜尋不到資料 */}
                    {isFiltering ? (
                      <div className="flex flex-col items-center justify-center">
                        <Search size={40} className="mb-4 text-slate-300" />
                        <h3 className="mb-2 text-lg font-medium text-slate-900">
                          {t("esg_table.no_filter_results")}
                        </h3>
                        <p className="mb-6 max-w-sm text-center text-slate-500">
                          {t("esg_table.no_filter_results_desc")}
                        </p>
                        <button
                          onClick={handleClearFilters}
                          className="inline-flex items-center justify-center rounded-lg border border-transparent bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-200"
                        >
                          {t("common.clear_filters")}
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <FileStack size={40} className="mb-4 text-slate-300" />
                        <h3 className="mb-2 text-lg font-medium text-slate-900">
                          {t("esg_table.no_records")}
                        </h3>
                        <p className="mb-6 max-w-sm text-center text-slate-500">
                          {t("esg_table.no_records_desc")}
                        </p>
                        <Link
                          href={`/user/account_book/${accountBookId}/journal`}
                          className="inline-flex items-center justify-center rounded-lg border border-transparent bg-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-orange-600"
                        >
                          {t("esg_table.no_records_cta")}
                        </Link>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Info: (20260312 - Julian) Footer */}
        <div className="flex flex-col items-center justify-between gap-2 border-t border-slate-200 bg-slate-50/50 px-4 py-3 lg:flex-row">
          <span className="text-xs font-bold text-slate-500">
            {t("esg_table.footer.record_count", { count: recordCount })}
          </span>
          <span className="flex items-center text-xs font-bold text-slate-500">
            <Info className="mr-1 size-3.5" />
            {t("esg_table.footer.data_citation")}
          </span>
        </div>
      </div>

      {/* Info: (20260324 - Julian) Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {/* Info: (20260324 - Julian) Modal */}
      <RecordTabModal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        defaultTab="esg"
        journalId={selectedEsgRecord?.journalId}
        voucherId={selectedEsgRecord?.voucherId}
        esgId={selectedEsgId}
        file={selectedEsgRecord?.file}
        onEsgUpdate={handleVerifySave}
        onDelete={() => {
          if (selectedEsgRecord) setEsgToDelete(selectedEsgRecord);
        }}
        onRestore={() => {
          if (selectedEsgRecord) setEsgToRestore(selectedEsgRecord);
        }}
        isDeleted={selectedEsgRecord?.isDeleted}
      />
      <ConfirmModal
        isOpen={isVerifyAllConfirmOpen}
        onClose={() => setIsVerifyAllConfirmOpen(false)}
        title={t("common.verify_all_confirm_title")}
        message={t("common.verify_all_confirm_desc")}
        confirmText={t("common.confirm")}
        cancelText={t("common.cancel")}
        onConfirm={verifyAllEsgRecords}
      />
      <ConfirmModal
        isOpen={!!esgToDelete}
        onClose={() => setEsgToDelete(null)}
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
      <ConfirmModal
        isOpen={!!esgToRestore}
        onClose={() => setEsgToRestore(null)}
        title={t("common.restore") as string}
        message={t("common.restore_confirm_desc") as string}
        confirmText={
          isRestoring
            ? (t("ocr.please_wait") as string)
            : (t("common.restore") as string)
        }
        cancelText={t("common.cancel") as string}
        onConfirm={executeRestore}
      />
      <SuccessNotification
        show={isVerifySuccessOpen}
        title={t("common.notification") as string}
        message={verifySuccessMsg}
        onClose={() => setIsVerifySuccessOpen(false)}
      />
    </div>
  );
}
