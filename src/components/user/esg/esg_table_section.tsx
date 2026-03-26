"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Info, ArrowDown, ArrowUp, FileStack } from "lucide-react";
import Link from 'next/link';
import { IEsgRecord, EsgScope, EsgIntensity } from "@/interfaces/esg";
import { EsgRow } from "@/components/user/esg/esg_row";
import EsgVerifyModal from "@/components/user/esg/esg_verify_modal";
import ConfirmModal from "@/components/common/confirm_modal";
import { request } from "@/lib/utils/request";
import { useParams } from "next/navigation";
import { IApiResponse } from "@/lib/utils/response";
import { useTranslation } from "@/i18n/i18n_context";
import { VerifyStatus } from "@/constants/verify_status";
import Pagination from "@/components/common/pagination";

interface IEsgTableSectionProps {
  year?: number;
  month?: number | "";
}

const PAGE_SIZE = 12;

export default function EsgTableSection({
  year,
  month,
}: IEsgTableSectionProps) {
  const { t } = useTranslation();
  const params = useParams();
  const accountBookId = params?.account_book_id as string;

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [verifyStatusFilter, setVerifyStatusFilter] = useState<
    VerifyStatus | "all"
  >("all");
  const [intensityFilter, setIntensityFilter] = useState<string>("all");
  const [scopeFilter, setScopeFilter] = useState<string>("all");
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState<boolean>(false);
  const [isVerifyAllConfirmOpen, setIsVerifyAllConfirmOpen] =
    useState<boolean>(false);
  const [selectedEsgId, setSelectedEsgId] = useState<string | null>(null);
  const [records, setRecords] = useState<IEsgRecord[]>([]);
  const [recordCount, setRecordCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [dateSort, setDateSort] = useState<"desc" | "asc">("desc");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchRecords = useCallback(async () => {
    if (!accountBookId) return;
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (searchTerm) queryParams.append("search", searchTerm);
      if (verifyStatusFilter && verifyStatusFilter !== "all")
        queryParams.append("verifyStatus", verifyStatusFilter);
      if (intensityFilter && intensityFilter !== "all")
        queryParams.append("intensity", intensityFilter);
      if (scopeFilter && scopeFilter !== "all")
        queryParams.append("scope", scopeFilter);
      if (year) queryParams.append("year", year.toString());
      if (month) queryParams.append("month", month.toString());
      queryParams.append("sort", dateSort);
      queryParams.append("page", currentPage.toString());
      queryParams.append("pageSize", PAGE_SIZE.toString());

      const queryString = queryParams.toString()
        ? `?${queryParams.toString()}`
        : "";

      const res = await request<
        IApiResponse<{ esgRecords: IEsgRecord[]; recordCount: number }>
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
    searchTerm,
    verifyStatusFilter,
    intensityFilter,
    scopeFilter,
    dateSort,
    year,
    month,
    currentPage,
  ]);

  // Info: (20260324 - Julian) Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    verifyStatusFilter,
    intensityFilter,
    scopeFilter,
    dateSort,
    year,
    month,
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
    .filter((r) => r.analysisStatus === "PENDING" || r.analysisStatus === "PROCESSING")
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
            request<IApiResponse<{ esgRecord: IEsgRecord }>>(
              `/api/v1/user/account_book/${accountBookId}/esg/${id}`
            )
          )
        );

        const updatedRecords = results
          .map((res) => res.payload?.esgRecord)
          .filter(Boolean) as IEsgRecord[];

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

  const handleVerifyOpen = (record: IEsgRecord) => {
    setSelectedEsgId(record.id);
    setIsVerifyModalOpen(true);
  };

  const handleVerifySave = async (updatedRecord: IEsgRecord) => {
    try {
      if (accountBookId && updatedRecord.id) {
        const res = await request<IApiResponse<IEsgRecord>>(
          `/api/v1/user/account_book/${accountBookId}/esg/${updatedRecord.id}`,
          {
            method: "PUT",
            body: JSON.stringify(updatedRecord),
          },
        );
        if (res.payload) {
          // Info: (20260312 - Julian) Refresh local state list
          await fetchRecords();
        }
      }
    } catch (err) {
      console.error("Failed to update ESG record", err);
    } finally {
      setIsVerifyModalOpen(false);
    }
  };

  const verifyAllEsgRecords = async () => {
    if (!accountBookId) return;
    try {
      setIsLoading(true);
      await request(
        `/api/v1/user/account_book/${accountBookId}/esg/verify_all`,
        { method: "PUT" },
      );
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
    searchTerm !== "" ||
    verifyStatusFilter !== "all" ||
    intensityFilter !== "all" ||
    scopeFilter !== "all";

  // Info: (20260325 - Luphia) 抽出清除條件的函式，方便後續擴充
  const handleClearFilters = () => {
    setSearchTerm("");
    setVerifyStatusFilter("all");
    setIntensityFilter("all");
    setScopeFilter("all");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Info: (20260312 - Julian) Toolbar */}
        <div className="flex flex-col items-center justify-between gap-2 border-b border-slate-200 p-4 lg:flex-row">
          <div className="relative w-full max-w-sm">
            <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t("esg_table.search_placeholder")}
              aria-label={t("esg_table.search_aria")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-2 pr-4 pl-10 text-sm font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs lg:text-sm">
            <select
              aria-label="Filter by verify status"
              value={verifyStatusFilter}
              onChange={(e) =>
                setVerifyStatusFilter(e.target.value as VerifyStatus | "all")
              }
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 font-bold text-slate-600 focus:outline-none"
            >
              <option value="all">{t("common.all")}</option>
              <option value={VerifyStatus.VERIFIED}>
                {t("verify.status.verified")}
              </option>
              <option value={VerifyStatus.UNVERIFIED}>
                {t("verify.status.unverified")}
              </option>
            </select>
            <select
              aria-label={t("esg_table.filter_intensity_aria")}
              value={intensityFilter}
              onChange={(e) => setIntensityFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 font-bold text-slate-600 focus:outline-none"
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
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 font-bold text-slate-600 focus:outline-none"
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
            <button
              type="button"
              aria-label={t("esg_table.sort_date_aria")}
              onClick={() => setDateSort(dateSort === "desc" ? "asc" : "desc")}
              className="flex items-center rounded-lg border border-slate-300 px-4 py-2 font-bold text-slate-600 transition-colors hover:bg-slate-50"
            >
              {dateSort === "desc"
                ? t("esg_table.sort_newest")
                : t("esg_table.sort_oldest")}
              {dateSort === "desc" ? (
                <ArrowDown className="ml-1 h-4 w-4" />
              ) : (
                <ArrowUp className="ml-1 h-4 w-4" />
              )}
            </button>
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

        {/* Info: (20260312 - Julian) Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-left">
            <thead>
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
                  {t("esg_table.header.ai_confidence")}
                </th>
                <th className="p-2 text-center text-xs font-semibold tracking-wider text-slate-500 uppercase lg:px-6 lg:py-4">
                  {t("esg_table.header.status")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={8}
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
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center lg:px-6 lg:py-16 bg-white">
                    {/* Info: (20260325 - Luphia) 區分真的沒資料 vs 搜尋不到資料 */}
                    {isFiltering ? (
                      <div className="flex flex-col items-center justify-center">
                        <Search className="h-12 w-12 text-slate-300 mb-4" />
                        <h3 className="text-lg font-medium text-slate-900 mb-2">
                          {t("esg_table.no_filter_results")}
                        </h3>
                        <p className="text-slate-500 mb-6 max-w-sm text-center">
                          {t("esg_table.no_filter_results_desc")}
                        </p>
                        <button
                          onClick={handleClearFilters}
                          className="inline-flex items-center justify-center px-5 py-2.5 border border-transparent text-sm font-bold rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors shadow-sm"
                        >
                          {t("common.clear_filters")}
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <FileStack className="h-12 w-12 text-slate-300 mb-4" />
                        <h3 className="text-lg font-medium text-slate-900 mb-2">{t("esg_table.no_records")}</h3>
                        <p className="text-slate-500 mb-6 max-w-sm text-center">
                          {t("esg_table.no_records_desc")}
                        </p>
                        <Link
                          href={`/user/account_book/${accountBookId}/journal`}
                          className="inline-flex items-center justify-center px-5 py-2.5 border border-transparent text-sm font-bold rounded-lg text-white bg-orange-500 hover:bg-orange-600 transition-colors shadow-sm"
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
            <Info className="mr-1 h-3.5 w-3.5" />
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
      <EsgVerifyModal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        esgId={selectedEsgId}
        onSave={handleVerifySave}
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
    </div>
  );
}
