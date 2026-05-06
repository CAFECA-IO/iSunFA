"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronUp, ChevronDown, Search, FileStack } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { VoucherRow } from "@/components/user/voucher/voucher_row";
import RecordTabModal from "@/components/user/common/record_tab_modal";
import ConfirmModal from "@/components/common/confirm_modal";
import Pagination from "@/components/common/pagination";
import DateRangePicker from "@/components/common/date_range_picker";
import { IVoucher, TradingType } from "@/interfaces/voucher";
import { VerifyStatus } from "@/constants/verify_status";
import { AIAnalysisStatus } from "@/constants/ai_analysis_status";
import { VoucherSorting } from "@/constants/sort";

const PAGE_SIZE = 12;

export default function VoucherTableSection() {
  const params = useParams();
  const { t } = useTranslation();

  const accountBookId = params?.account_book_id as string;

  const [currencyUnit, setCurrencyUnit] = useState<string>("TWD");

  const [vouchers, setVouchers] = useState<IVoucher[]>([]);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [keyWord, setKeyWord] = useState<string>("");
  const [debouncedKeyWord, setDebouncedKeyWord] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [sorting, setSorting] = useState<VoucherSorting>(
    VoucherSorting.DATE_DESC,
  );
  const [hideDeleted, setHideDeleted] = useState<boolean>(false);
  const [filteredType, setFilteredType] = useState<TradingType | "all">("all");
  const [filteredVerifyStatus, setFilteredVerifyStatus] = useState<
    VerifyStatus | "all"
  >("all");

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isVerifyAllConfirmOpen, setIsVerifyAllConfirmOpen] =
    useState<boolean>(false);
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(
    null,
  );

  // Info: (20260404 - Luphia) 軟刪除與復原狀態
  const [voucherToDelete, setVoucherToDelete] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] =
    useState<boolean>(false);

  useEffect(() => {
    if (!accountBookId) return;
    request<IApiResponse<{ currency: string }>>(
      `/api/v1/user/account_book/${accountBookId}`,
    )
      .then((res) => {
        if (res.payload?.currency) {
          setCurrencyUnit(res.payload.currency);
        }
      })
      .catch((error) => console.error("Failed to fetch account book:", error));
  }, [accountBookId]);

  // Info: (20260311 - Julian) 設定輸入延遲，避免頻繁打 API
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyWord(keyWord);
    }, 500);
    return () => clearTimeout(timer);
  }, [keyWord]);

  const fetchVouchers = useCallback(async () => {
    setIsLoading(true);
    try {
      const searchParams = new URLSearchParams();
      if (debouncedKeyWord) searchParams.append("keyWord", debouncedKeyWord);

      if (startDate) {
        const [y, m, d] = startDate.split("-").map(Number);
        const start = new Date(y, m - 1, d, 0, 0, 0, 0);
        searchParams.append("startDate", start.toISOString());
      }

      if (endDate) {
        const [y, m, d] = endDate.split("-").map(Number);
        const end = new Date(y, m - 1, d, 23, 59, 59, 999);
        searchParams.append("endDate", end.toISOString());
      }

      if (filteredType !== "all") {
        searchParams.append("type", filteredType);
      }
      if (filteredVerifyStatus !== "all") {
        searchParams.append("verifyStatus", filteredVerifyStatus);
      }
      if (hideDeleted) {
        searchParams.append("hideDeleted", "true");
      }
      if (sorting) {
        searchParams.append("sorting", sorting);
      }

      searchParams.append("page", currentPage.toString());
      searchParams.append("pageSize", PAGE_SIZE.toString());

      const data = await request<
        IApiResponse<{ data: IVoucher[]; total: number }>
      >(
        `/api/v1/user/account_book/${accountBookId}/voucher?${searchParams.toString()}`,
      );
      if (data.payload) {
        setVouchers(data.payload.data);
        setTotalItems(data.payload.total);
      }
    } catch (error) {
      console.error("Failed to fetch vouchers:", error);
    } finally {
      setIsLoading(false);
    }
  }, [
    debouncedKeyWord,
    startDate,
    endDate,
    filteredType,
    filteredVerifyStatus,
    hideDeleted,
    sorting,
    accountBookId,
    currentPage,
  ]);

  useEffect(() => {
    if (accountBookId) {
      fetchVouchers();
    }
  }, [fetchVouchers, accountBookId]);

  // Info: (20260324 - Julian) Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedKeyWord,
    startDate,
    endDate,
    filteredType,
    filteredVerifyStatus,
    hideDeleted,
    sorting,
  ]);

  // Info: (20260325 - Luphia) 抽取需要輪詢的 ID，避免頻繁觸發 Effect
  const pendingIds = vouchers
    .filter(
      (v) =>
        v.analysisStatus === AIAnalysisStatus.PENDING ||
        v.analysisStatus === AIAnalysisStatus.PROCESSING,
    )
    .map((v) => v.id);
  const pendingIdsJoined = pendingIds.join(",");

  // Info: (20260320 - Julian) 只針對未完成的傳票進行個別狀態更新，減輕 DB 負擔
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
            request<IApiResponse<IVoucher>>(
              `/api/v1/user/account_book/${accountBookId}/voucher/${id}`,
            ),
          ),
        );

        const updatedVouchers = results
          .map((res) => res.payload)
          .filter(Boolean) as IVoucher[];

        if (updatedVouchers.length > 0 && !isCancelled) {
          setVouchers((prev) => {
            const next = [...prev];
            updatedVouchers.forEach((uv) => {
              const idx = next.findIndex((v) => v.id === uv.id);
              if (idx !== -1) next[idx] = uv;
            });
            return next;
          });
        }
      } catch (error) {
        console.error("Failed to update pending vouchers:", error);
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

  // Info: (20260311 - Julian) 排序狀態
  const isDateAsc = sorting === VoucherSorting.DATE_ASC;
  const isDateDesc = sorting === VoucherSorting.DATE_DESC;
  const isDebitAsc = sorting === VoucherSorting.DEBIT_ASC;
  const isDebitDesc = sorting === VoucherSorting.DEBIT_DESC;
  const isCreditAsc = sorting === VoucherSorting.CREDIT_ASC;
  const isCreditDesc = sorting === VoucherSorting.CREDIT_DESC;

  // Info: (20260311 - Julian) 切換排序
  const clickDateSort = () =>
    setSorting((prev) =>
      prev === VoucherSorting.DATE_DESC
        ? VoucherSorting.DATE_ASC
        : VoucherSorting.DATE_DESC,
    );
  const clickDebitSort = () =>
    setSorting((prev) =>
      prev === VoucherSorting.DEBIT_DESC
        ? VoucherSorting.DEBIT_ASC
        : VoucherSorting.DEBIT_DESC,
    );
  const clickCreditSort = () =>
    setSorting((prev) =>
      prev === VoucherSorting.CREDIT_DESC
        ? VoucherSorting.CREDIT_ASC
        : VoucherSorting.CREDIT_DESC,
    );

  // Info: (20260311 - Julian) 重新 fetch 列表並關閉 Modal
  const onModalClose = () => {
    fetchVouchers();
    setIsModalOpen(false);
  };

  const verifyAllVouchers = async () => {
    if (!accountBookId) return;
    try {
      setIsLoading(true); // Info: (20260325 - Luphia) 為 PUT 請求開啟 loading
      await request(
        `/api/v1/user/account_book/${accountBookId}/voucher/verify_all`,
        { method: "PUT" },
      );
      // Info: (20260325 - Luphia) 加入 await，讓 fetchVouchers 內部接管後續的 loading 狀態
      await fetchVouchers();
    } catch (error) {
      console.error("Failed to verify all vouchers:", error);
      setIsLoading(false); // Info: (20260325 - Luphia) 只有失敗時在這裡關閉 loading
    } finally {
      setIsVerifyAllConfirmOpen(false);
    }
  };

  // Info: (20260404 - Luphia) 刪除傳票
  const handleDeleteVoucher = async () => {
    if (!voucherToDelete || !accountBookId) return;
    try {
      setIsLoading(true);
      await request(
        `/api/v1/user/account_book/${accountBookId}/voucher/${voucherToDelete}`,
        { method: "DELETE" },
      );
      await fetchVouchers();
    } catch (error) {
      console.error("Failed to delete voucher:", error);
      setIsLoading(false);
    } finally {
      setIsDeleteConfirmOpen(false);
      setVoucherToDelete(null);
    }
  };

  // Info: (20260404 - Luphia) 復原傳票
  const handleRestoreVoucher = async (id: string) => {
    if (!accountBookId) return;
    try {
      setIsLoading(true);
      await request(
        `/api/v1/user/account_book/${accountBookId}/voucher/${id}/restore`,
        { method: "POST" },
      );
      await fetchVouchers();
    } catch (error) {
      console.error("Failed to restore voucher:", error);
      setIsLoading(false);
    }
  };

  // Info: (20260324 - Julian) 計算總頁數
  const totalPages = Math.ceil(totalItems / PAGE_SIZE) || 1;

  // Info: (20260324 - Julian) Ensure currentPage is within bounds
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Info: (20260325 - Luphia) 判斷是否有套用過濾條件 (不包含 hideDeleted)
  const isFiltering =
    debouncedKeyWord !== "" ||
    filteredType !== "all" ||
    filteredVerifyStatus !== "all" ||
    startDate !== "" ||
    endDate !== "";

  const handleClearFilters = () => {
    setKeyWord("");
    setDebouncedKeyWord("");
    setFilteredType("all");
    setFilteredVerifyStatus("all");
    setStartDate("");
    setEndDate("");
  };

  const selectedVoucher = vouchers.find((v) => v.id === selectedVoucherId);

  return (
    <>
      <div className="flex w-full flex-col gap-4">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4">
          {/* Info: (20260401 - Julian) Toolbar */}
          <div className="flex flex-wrap justify-center gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:justify-start lg:gap-4">
            {/* Info: (20260401 - Julian) Searchbar */}
            <div className="relative w-full max-w-sm">
              <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={t("voucher.main_view.filters.search")}
                aria-label={t("voucher.main_view.filters.search")}
                value={keyWord}
                onChange={(e) => setKeyWord(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 pr-4 pl-10 text-xs font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500 focus:outline-none lg:text-sm"
              />
            </div>

            {/* Info: (20260429 - Julian) Filter by date */}
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              setStartDate={setStartDate}
              setEndDate={setEndDate}
            />

            <div className="flex items-center gap-2 text-xs lg:text-sm">
              {/* Info: (20260401 - Julian) Filter by verify status */}
              <select
                aria-label="Filter by verify status"
                value={filteredVerifyStatus}
                onChange={(e) =>
                  setFilteredVerifyStatus(
                    e.target.value as VerifyStatus | "all",
                  )
                }
                className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-bold text-slate-600 focus:ring-2 focus:ring-orange-500 focus:outline-none lg:px-4 lg:text-sm"
              >
                <option value="all">
                  {t("verify.status.all", { type: t("verify.type.voucher") })}
                </option>
                <option value={VerifyStatus.VERIFIED}>
                  {t("verify.status.verified")}
                </option>
                <option value={VerifyStatus.UNVERIFIED}>
                  {t("verify.status.unverified")}
                </option>
              </select>
              {/* Info: (20260401 - Julian) Filter by type */}
              <select
                id="typeSelect"
                value={filteredType}
                onChange={(e) =>
                  setFilteredType(e.target.value as TradingType | "all")
                }
                className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-bold text-slate-600 focus:ring-2 focus:ring-orange-500 focus:outline-none lg:px-4 lg:text-sm"
              >
                <option value="all">
                  {t("voucher.main_view.filters.all")}
                </option>
                <option value={TradingType.INCOME}>
                  {t("voucher.main_view.filters.income")}
                </option>
                <option value={TradingType.OUTCOME}>
                  {t("voucher.main_view.filters.outcome")}
                </option>
                <option value={TradingType.TRANSFER}>
                  {t("voucher.main_view.filters.transfer")}
                </option>
              </select>
            </div>

            {/* Info: (20260401 - Julian) Verify All Button */}
            <div className="lg:ml-auto">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => setIsVerifyAllConfirmOpen(true)}
                className="inline-flex items-center justify-center rounded-lg bg-orange-500 px-4 py-1.5 text-sm font-bold whitespace-nowrap text-white shadow-sm enabled:hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {t("common.verify_all")}
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* Info: (20260324 - Julian) 隱藏已刪除傳票 toggle */}
            <div className="flex flex-col items-center justify-between gap-y-2 bg-white px-2 py-4 lg:flex-row lg:px-6">
              <div className="flex cursor-pointer items-center gap-3">
                <button
                  type="button"
                  id="hideDeletedToggle"
                  aria-label="Toggle hide deleted vouchers"
                  onClick={(e) => {
                    e.preventDefault();
                    setHideDeleted(!hideDeleted);
                  }}
                  className={`relative h-6 w-11 rounded-full transition-colors ${hideDeleted ? "bg-orange-500" : "bg-slate-200"}`}
                >
                  <div
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${hideDeleted ? "translate-x-5.5" : "translate-x-0.5"}`}
                  />
                </button>
                <label
                  htmlFor="hideDeletedToggle"
                  className="cursor-pointer text-xs font-semibold text-slate-600 lg:text-sm"
                >
                  {t("voucher.main_view.filters.hide_deleted")}
                </label>
              </div>

              <div className="flex items-center gap-2 text-right text-xs font-bold text-slate-400 uppercase">
                {/* Info: (20260324 - Julian) 總傳票數 */}
                <p>
                  {t("voucher.main_view.filters.total_vouchers", {
                    count: totalItems,
                  })}
                </p>

                <div className="h-4 w-px bg-slate-200"></div>

                {/* Info: (20260324 - Julian) 幣別 */}
                <p>
                  {t("voucher.main_view.filters.currency", {
                    currency: currencyUnit,
                  })}
                </p>
              </div>
            </div>

            {/* Info: (20260310 - Julian) Table Container */}
            <div className="overflow-x-auto border-t border-slate-200">
              <table className="w-full min-w-[1000px] border-collapse text-left text-sm text-gray-600">
                <thead className="border-b border-slate-200 bg-slate-100">
                  <tr>
                    <th className="p-2 text-center text-xs font-black tracking-wider text-slate-500 uppercase lg:px-6 lg:py-4 lg:whitespace-nowrap">
                      {t("voucher.main_view.table.headers.receipt")}
                    </th>
                    <th className="p-2 text-center text-xs font-black tracking-wider lg:px-6 lg:py-4 lg:whitespace-nowrap">
                      <button
                        type="button"
                        aria-label={t(
                          "voucher.main_view.table.headers.voucher_date",
                        )}
                        onClick={clickDateSort}
                        className="group mx-auto flex w-full items-center justify-center gap-1"
                      >
                        <span
                          className={`uppercase transition-colors ease-in-out ${
                            isDateDesc || isDateAsc
                              ? "text-orange-500"
                              : "text-slate-500 group-hover:text-orange-500"
                          }`}
                        >
                          {t("voucher.main_view.table.headers.voucher_date")}
                        </span>
                        <div className="-gap-[2px] flex shrink-0 flex-col px-2">
                          <ChevronUp
                            size={14}
                            className={`translate-y-[2px] transition-colors ${isDateAsc ? "text-orange-500" : "text-slate-300"}`}
                          />
                          <ChevronDown
                            size={14}
                            className={`-translate-y-[2px] transition-colors ${isDateDesc ? "text-orange-500" : "text-slate-300"}`}
                          />
                        </div>
                      </button>
                    </th>
                    <th className="p-2 text-left text-xs font-black tracking-wider text-slate-500 uppercase lg:px-6 lg:py-4 lg:whitespace-nowrap">
                      <div className="flex items-center">
                        {t("voucher.main_view.table.headers.voucher_type_id")}
                      </div>
                    </th>
                    <th className="p-2 text-left text-xs font-black tracking-wider text-slate-500 uppercase lg:px-6 lg:py-4 lg:whitespace-nowrap">
                      <div className="flex items-center lg:w-[250px]">
                        {t(
                          "voucher.main_view.table.headers.accounting_entries",
                        )}
                      </div>
                    </th>
                    <th className="p-2 text-right text-xs font-black tracking-wider lg:px-6 lg:py-4 lg:whitespace-nowrap">
                      <button
                        type="button"
                        aria-label={t("voucher.main_view.table.headers.debit")}
                        onClick={clickDebitSort}
                        className="group ml-auto flex items-center justify-end gap-1 uppercase"
                      >
                        <span
                          className={`transition-colors ease-in-out ${
                            isDebitAsc || isDebitDesc
                              ? "text-orange-500"
                              : "text-slate-500 group-hover:text-orange-500"
                          }`}
                        >
                          {t("voucher.main_view.table.headers.debit")}
                        </span>
                        <div className="-gap-[2px] flex shrink-0 flex-col pl-2">
                          <ChevronUp
                            size={14}
                            className={`translate-y-[2px] transition-colors ${isDebitAsc ? "text-orange-500" : "text-slate-300"}`}
                          />
                          <ChevronDown
                            size={14}
                            className={`-translate-y-[2px] transition-colors ${isDebitDesc ? "text-orange-500" : "text-slate-300"}`}
                          />
                        </div>
                      </button>
                    </th>
                    <th className="p-2 text-right text-xs font-black tracking-wider lg:px-6 lg:py-4 lg:whitespace-nowrap">
                      <button
                        type="button"
                        aria-label={t("voucher.main_view.table.headers.credit")}
                        onClick={clickCreditSort}
                        className="group ml-auto flex items-center justify-end gap-1 uppercase"
                      >
                        <span
                          className={`transition-colors ease-in-out ${
                            isCreditAsc || isCreditDesc
                              ? "text-orange-500"
                              : "text-slate-500 group-hover:text-orange-500"
                          }`}
                        >
                          {t("voucher.main_view.table.headers.credit")}
                        </span>
                        <div className="-gap-[2px] flex shrink-0 flex-col pl-2">
                          <ChevronUp
                            size={14}
                            className={`translate-y-[2px] transition-colors ${isCreditAsc ? "text-orange-500" : "text-slate-300"}`}
                          />
                          <ChevronDown
                            size={14}
                            className={`-translate-y-[2px] transition-colors ${isCreditDesc ? "text-orange-500" : "text-slate-300"}`}
                          />
                        </div>
                      </button>
                    </th>
                    <th className="p-2 text-center text-xs font-black tracking-wider text-slate-500 uppercase lg:px-6 lg:py-4 lg:whitespace-nowrap">
                      {t("voucher.main_view.table.headers.status")} /{" "}
                      {t("voucher.main_view.table.headers.confidence")}
                    </th>
                    <th className="p-2 text-center text-xs font-black tracking-wider text-slate-500 uppercase lg:px-6 lg:py-4 lg:whitespace-nowrap">
                      {/* Info: (20260404 - Luphia) Actions */}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr aria-label="Loading vouchers">
                      <td
                        aria-label="Loading vouchers"
                        colSpan={8}
                        className="p-2 text-center lg:px-6 lg:py-4"
                      >
                        <div className="flex justify-center p-4">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent"></div>
                        </div>
                      </td>
                    </tr>
                  ) : vouchers.length > 0 ? (
                    vouchers.map((v) => (
                      <VoucherRow
                        key={v.id}
                        voucher={v}
                        onClick={() => {
                          setSelectedVoucherId(v.id);
                          setIsModalOpen(true);
                        }}
                        onDelete={(id) => {
                          setVoucherToDelete(id);
                          setIsDeleteConfirmOpen(true);
                        }}
                        onRestore={handleRestoreVoucher}
                      />
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={8}
                        className="bg-white p-8 text-center lg:px-6 lg:py-16"
                      >
                        {isFiltering ? (
                          <div className="flex flex-col items-center justify-center">
                            <Search className="mb-4 h-12 w-12 text-slate-300" />
                            <h3 className="mb-2 text-lg font-medium text-slate-900">
                              {t("voucher.main_view.table.no_filter_results")}
                            </h3>
                            <p className="mb-6 max-w-sm text-center text-slate-500">
                              {t(
                                "voucher.main_view.table.no_filter_results_desc",
                              )}
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
                            <FileStack className="mb-4 h-12 w-12 text-slate-300" />
                            <h3 className="mb-2 text-lg font-medium text-slate-900">
                              {t("voucher.main_view.table.no_data")}
                            </h3>
                            <p className="mb-6 max-w-sm text-center text-slate-500">
                              {t("voucher.main_view.table.no_data_desc")}
                            </p>
                            <Link
                              href={`/user/account_book/${accountBookId}/journal`}
                              className="inline-flex items-center justify-center rounded-lg border border-transparent bg-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-orange-600"
                            >
                              {t("voucher.main_view.table.no_data_cta")}
                            </Link>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Info: (20260324 - Julian) Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>
      <RecordTabModal
        isOpen={isModalOpen}
        onClose={onModalClose}
        defaultTab="voucher"
        journalId={selectedVoucher?.journalId}
        voucherId={selectedVoucherId}
        esgId={selectedVoucher?.esgRecordId}
        file={selectedVoucher?.file}
        onDelete={() => {
          if (selectedVoucherId) {
            onModalClose();
            setVoucherToDelete(selectedVoucherId);
            setIsDeleteConfirmOpen(true);
          }
        }}
        onRestore={() => {
          if (selectedVoucherId) {
            handleRestoreVoucher(selectedVoucherId);
          }
        }}
        isDeleted={selectedVoucher?.isDeleted}
      />
      <ConfirmModal
        isOpen={isVerifyAllConfirmOpen}
        onClose={() => setIsVerifyAllConfirmOpen(false)}
        title={t("common.verify_all_confirm_title")}
        message={t("common.verify_all_confirm_desc")}
        confirmText={t("common.confirm")}
        cancelText={t("common.cancel")}
        onConfirm={verifyAllVouchers}
      />
      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false);
          setVoucherToDelete(null);
        }}
        title={t("common.delete")}
        message={t("common.delete_confirm_desc")}
        confirmText={t("common.confirm")}
        cancelText={t("common.cancel")}
        onConfirm={handleDeleteVoucher}
      />
    </>
  );
}
