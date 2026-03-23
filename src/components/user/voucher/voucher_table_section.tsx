"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { ChevronUp, ChevronDown, Search, Filter } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { VoucherRow } from "@/components/user/voucher/voucher_row";
import VoucherDetailModal from "@/components/user/voucher/voucher_detail_modal";
import ConfirmModal from "@/components/common/confirm_modal";
import { IVoucher, TradingType } from "@/interfaces/voucher";

enum VoucherSorting {
  DATE_DESC = "date_desc",
  DATE_ASC = "date_asc",
  DEBIT_DESC = "debit_desc",
  DEBIT_ASC = "debit_asc",
  CREDIT_DESC = "credit_desc",
  CREDIT_ASC = "credit_asc",
}

export default function VoucherTableSection() {
  const params = useParams();
  const { t } = useTranslation();

  const accountBookId = params?.account_book_id as string;

  const currencyUnit = "TWD"; // ToDo: (20260310 - Julian) 先固定使用 TWD

  const [filteredType, setFilteredType] = useState<TradingType | "all">("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [keyWord, setKeyWord] = useState<string>("");
  const [debouncedKeyWord, setDebouncedKeyWord] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isVerifyAllConfirmOpen, setIsVerifyAllConfirmOpen] =
    useState<boolean>(false);
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(
    null,
  );
  const [vouchers, setVouchers] = useState<IVoucher[]>([]);
  const [sorting, setSorting] = useState<VoucherSorting>(
    VoucherSorting.DATE_DESC,
  );
  const [hideDeleted, setHideDeleted] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState<boolean>(false);

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
      if (hideDeleted) {
        searchParams.append("hideDeleted", "true");
      }
      if (sorting) {
        searchParams.append("sorting", sorting);
      }

      const data = await request<IApiResponse<IVoucher[]>>(
        `/api/v1/user/account_book/${accountBookId}/voucher?${searchParams.toString()}`,
      );
      if (data.payload) {
        setVouchers(data.payload);
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
    hideDeleted,
    sorting,
    accountBookId,
  ]);

  useEffect(() => {
    if (accountBookId) {
      fetchVouchers();
    }
  }, [fetchVouchers, accountBookId]);

  // Info: (20260320 - Julian) 只針對未完成的傳票進行個別狀態更新，減輕 DB 負擔
  useEffect(() => {
    const pendingVouchers = vouchers.filter(
      (v) =>
        v.analysisStatus === "PENDING" || v.analysisStatus === "PROCESSING",
    );

    if (pendingVouchers.length === 0) return;

    const intervalId = setInterval(async () => {
      for (const pv of pendingVouchers) {
        try {
          const { payload } = await request<IApiResponse<IVoucher>>(
            `/api/v1/user/account_book/${accountBookId}/voucher/${pv.id}`,
          );
          if (payload) {
            setVouchers((prev) =>
              prev.map((old) => (old.id === pv.id ? payload : old)),
            );
          }
        } catch (error) {
          console.error(`Failed to update status for voucher ${pv.id}:`, error);
        }
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [vouchers, accountBookId]);

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
      setIsLoading(true);
      await request(
        `/api/v1/user/account_book/${accountBookId}/voucher/verify_all`,
        { method: "PUT" },
      );
      fetchVouchers();
    } catch (error) {
      console.error("Failed to verify all vouchers:", error);
      setIsLoading(false);
      setIsVerifyAllConfirmOpen(false);
    }
  };

  const displayedVoucher = isLoading ? (
    <tr aria-label="Loading vouchers">
      <td
        aria-label="Loading vouchers"
        colSpan={7}
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
      />
    ))
  ) : (
    <tr>
      <td colSpan={7} className="p-2 text-center lg:px-6 lg:py-4">
        {t("voucher.main_view.table.no_data")}
      </td>
    </tr>
  );

  return (
    <>
      <div className="flex w-full flex-col gap-4">
        <div className="mx-auto w-full max-w-[1400px]">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* Info: (20260316 - Julian) Toolbar */}
            <div className="flex flex-col items-center justify-between gap-4 border-b border-slate-200 p-4 lg:flex-row">
              <div className="relative max-w-[400px] flex-1">
                <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="searchField"
                  aria-label={t("voucher.main_view.filters.search")}
                  type="text"
                  value={keyWord}
                  onChange={(e) => setKeyWord(e.target.value)}
                  placeholder={t("voucher.main_view.filters.search")}
                  className="w-full rounded-full border border-slate-300 py-2.5 pr-4 pl-11 text-sm font-semibold text-slate-700 shadow-sm placeholder:font-medium placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center rounded-lg border px-4 py-2 text-sm font-bold transition-colors ${showFilters ? "border-orange-500 bg-orange-50 text-orange-600" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"}`}
                >
                  {showFilters ? (
                    <ChevronUp className="mr-2 h-4 w-4" />
                  ) : (
                    <Filter className="mr-2 h-4 w-4" />
                  )}
                  {t("voucher.main_view.table.filter_btn")}
                </button>
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

            {/* Info: (20260316 - Julian) Filter Content */}
            <div
              className={`grid border-b border-slate-200 bg-slate-50 shadow-inner transition-all duration-300 ease-in-out ${showFilters ? "grid-rows-[1fr] p-4 opacity-100 lg:p-6" : "grid-rows-[0fr] opacity-0"}`}
            >
              <div
                className={`flex flex-col gap-2 overflow-hidden lg:flex-row lg:gap-6`}
              >
                <div className="w-[300px]">
                  <label
                    htmlFor="typeSelect"
                    className="mb-2 block text-xs font-semibold text-slate-700"
                  >
                    {t("voucher.main_view.filters.type")}
                  </label>
                  <select
                    id="typeSelect"
                    value={filteredType}
                    onChange={(e) =>
                      setFilteredType(e.target.value as TradingType | "all")
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm focus:border-orange-500 focus:outline-none"
                  >
                    <option value="all">
                      {t("voucher.main_view.filters.type_options.all")}
                    </option>
                    <option value={TradingType.INCOME}>
                      {t("voucher.main_view.filters.type_options.payment")}
                    </option>
                    <option value={TradingType.OUTCOME}>
                      {t("voucher.main_view.filters.type_options.receipt")}
                    </option>
                    <option value={TradingType.TRANSFER}>
                      {t("voucher.main_view.filters.type_options.transfer")}
                    </option>
                  </select>
                </div>
                <div>
                  <div className="mb-2 block text-xs font-semibold text-slate-700">
                    {t("voucher.main_view.filters.period")}
                  </div>
                  <div className="flex w-[300px] items-center gap-2 lg:gap-4">
                    <input
                      aria-label="Start Date"
                      type="date"
                      value={startDate}
                      max={endDate || undefined}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-[14px] py-[8.5px] text-sm font-semibold text-slate-700 shadow-sm focus:border-orange-500 focus:outline-none"
                    />
                    <span className="text-slate-400">-</span>
                    <input
                      aria-label="End Date"
                      type="date"
                      value={endDate}
                      min={startDate || undefined}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-[14px] py-[8.5px] text-sm font-semibold text-slate-700 shadow-sm focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between bg-white px-2 py-4 lg:px-6">
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

              <div className="text-right text-xs font-bold text-slate-400 uppercase">
                {t("voucher.main_view.filters.currency").replace(
                  "{currency}",
                  currencyUnit,
                )}
              </div>
            </div>

            {/* Info: (20260310 - Julian) Table Container */}
            <div className="overflow-x-auto border-t border-slate-200">
              <table className="w-full min-w-[1000px] border-collapse text-left text-sm text-gray-600">
                <thead className="border-b border-slate-200 bg-slate-100">
                  <tr>
                    <th className="p-2 text-center text-xs font-black tracking-wider whitespace-nowrap text-slate-500 uppercase lg:px-6 lg:py-4">
                      {t("voucher.main_view.table.headers.receipt")}
                    </th>
                    <th className="p-2 text-center text-xs font-black tracking-wider whitespace-nowrap lg:px-6 lg:py-4">
                      <button
                        type="button"
                        aria-label={t(
                          "voucher.main_view.table.headers.voucher_date",
                        )}
                        onClick={clickDateSort}
                        className="group mx-auto flex w-full items-center justify-center gap-1"
                      >
                        <span
                          className={`transition-colors ease-in-out ${
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
                    <th className="p-2 text-left text-xs font-black tracking-wider whitespace-nowrap text-slate-500 uppercase lg:px-6 lg:py-4">
                      <div className="flex items-center">
                        {t("voucher.main_view.table.headers.voucher_type_id")}
                      </div>
                    </th>
                    <th className="p-2 text-left text-xs font-black tracking-wider whitespace-nowrap text-slate-500 uppercase lg:px-6 lg:py-4">
                      <div className="flex w-[250px] items-center">
                        {t(
                          "voucher.main_view.table.headers.accounting_entries",
                        )}
                      </div>
                    </th>
                    <th className="p-2 text-right text-xs font-black tracking-wider whitespace-nowrap lg:px-6 lg:py-4">
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
                    <th className="p-2 text-right text-xs font-black tracking-wider whitespace-nowrap lg:px-6 lg:py-4">
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
                    <th className="p-2 text-center text-xs font-black tracking-wider whitespace-nowrap text-slate-500 uppercase lg:px-6 lg:py-4">
                      {t("voucher.main_view.table.headers.confidence")}
                    </th>
                    <th className="p-2 text-center text-xs font-black tracking-wider whitespace-nowrap text-slate-500 uppercase lg:px-6 lg:py-4">
                      {t("voucher.main_view.table.headers.status")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedVoucher}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <VoucherDetailModal
        key={selectedVoucherId || "new"}
        isOpen={isModalOpen}
        onClose={onModalClose}
        voucherId={selectedVoucherId?.toString() ?? ""}
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
    </>
  );
}
