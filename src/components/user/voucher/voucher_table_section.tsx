"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  ChevronUp,
  ChevronDown,
  Search,
  CheckCircle2,
  FileQuestion,
  Filter,
} from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { timestampToString, numberWithCommas } from "@/lib/utils/common";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { FilePreview } from "@/components/common/file_preview";
import VoucherDetailModal from "@/components/user/voucher/voucher_detail_modal";
import { IVoucher, TradingType } from "@/interfaces/voucher";

const VoucherRow = ({
  voucher,
  onClick,
}: {
  voucher: IVoucher;
  onClick: () => void;
}) => {
  const { t } = useTranslation();
  const lineItems = voucher.lineItems.lines;

  const getMockConfidence = (id: string) => {
    let sum = 0;
    for (let i = 0; i < id.length; i++) {
      sum += id.charCodeAt(i);
    }
    return (sum % 15) + 85;
  };
  const mockConfidence = getMockConfidence(voucher.id);
  const mockStatus =
    parseInt(voucher.id.slice(-1), 16) % 2 === 0 ? "verified" : "manual";

  const renderIcon = (type: TradingType) => {
    switch (type) {
      case TradingType.INCOME:
        return <ArrowDownLeft size={14} className="stroke-[2.5]" />;
      case TradingType.OUTCOME:
        return <ArrowUpRight size={14} className="stroke-[2.5]" />;
      case TradingType.TRANSFER:
        return <ArrowRightLeft size={14} className="stroke-[2.5]" />;
      default:
        return null;
    }
  };

  const getTypeClasses = (style: TradingType) => {
    switch (style) {
      case TradingType.OUTCOME:
        return "border-red-200 bg-red-50 text-red-500";
      case TradingType.INCOME:
        return "border-emerald-200 bg-emerald-50 text-emerald-500";
      case TradingType.TRANSFER:
        return "border-slate-200 bg-slate-50 text-slate-700";
      default:
        return "border-slate-200 bg-slate-100 text-slate-600";
    }
  };

  const getTypeName = (style: TradingType) => {
    switch (style) {
      case TradingType.OUTCOME:
        return "支出傳票";
      case TradingType.INCOME:
        return "收入傳票";
      case TradingType.TRANSFER:
        return "轉帳傳票";
      default:
        return "未知傳票";
    }
  };

  return (
    <tr
      key={voucher.id}
      className={`border-b border-slate-300 bg-white text-sm transition-colors last:border-0 ${voucher.isDeleted ? "opacity-50" : ""}`}
    >
      {/* Info: (20260316 - Julian) File */}
      <td className="px-3 py-4 text-center sm:px-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-sm sm:h-16 sm:w-16">
          {voucher.file ? (
            <FilePreview
              file={{ filename: voucher.file.fileName || "Unknown" }}
              fileId={voucher.file.hash}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-lg bg-slate-100 p-1">
              <FileQuestion className="h-6 w-6 text-slate-300" />
            </div>
          )}
        </div>
      </td>
      {/* Info: (20260316 - Julian) Trading Date */}
      <td className="px-3 py-4 text-center align-middle font-bold whitespace-nowrap text-slate-800 sm:px-6">
        {timestampToString(voucher.tradingDate).dateWithDash}
        {voucher.isDeleted && (
          <div className="mt-2 text-center">
            <span className="inline-block rounded-full bg-orange-200 px-2 py-0.5 text-[10px] font-bold text-orange-500">
              {t("voucher.main_view.table.status_deleted")}
            </span>
          </div>
        )}
      </td>
      {/* Info: (20260316 - Julian) Type */}
      <td aria-label="Type" className="px-3 py-4 text-center align-middle sm:px-6">
        <div className="flex flex-col items-center justify-center gap-2">
          <div
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold whitespace-nowrap ${getTypeClasses(voucher.tradingType)}`}
          >
            {renderIcon(voucher.tradingType)}
            <span>{getTypeName(voucher.tradingType)}</span>
          </div>
          <span className="text-xs font-black tracking-wider text-slate-800">
            {voucher.id}
          </span>
        </div>
      </td>
      {/* Info: (20260316 - Julian) Accounting */}
      <td aria-label="Accounting" className="py-4 pl-3 align-middle sm:pl-6">
        <div className="flex flex-col whitespace-nowrap">
          {lineItems.map((line) => (
            <div
              key={line.id}
              className="flex h-[30px] items-center gap-2 border-dashed border-slate-300 not-last:border-b"
            >
              <span className="w-[45px] rounded bg-slate-200 px-1.5 py-0.5 text-center text-xs font-semibold text-slate-700">
                {line.accounting?.code}
              </span>
              {/* Info: (20260316 - Julian) 借方靠左，貸方靠右 */}
              <span
                className={
                  line.isDebit
                    ? "font-bold text-slate-800"
                    : "ml-4 font-medium text-slate-700"
                }
              >
                {line.accounting?.name}
              </span>
            </div>
          ))}
        </div>
      </td>
      {/* Info: (20260316 - Julian) Debit */}
      <td
        aria-label="Debit"
        className="py-4 text-right align-middle font-semibold text-slate-700"
      >
        <div className="flex flex-col text-sm">
          {lineItems.map((line) => (
            <div
              key={line.id}
              className="flex h-[30px] items-center justify-end border-dashed border-slate-300 not-last:border-b"
            >
              <span>{line.isDebit ? numberWithCommas(line.amount) : "−"}</span>
            </div>
          ))}
        </div>
      </td>
      {/* Info: (20260316 - Julian) Credit */}
      <td
        aria-label="Credit"
        className="py-4 pr-3 text-right align-middle font-semibold sm:pr-6"
      >
        <div className="flex flex-col text-sm">
          {lineItems.map((line) => (
            <div
              key={line.id}
              className="flex h-[30px] items-center justify-end border-dashed border-slate-300 not-last:border-b"
            >
              <span>{!line.isDebit ? numberWithCommas(line.amount) : "−"}</span>
            </div>
          ))}
        </div>
      </td>
      {/* Info: (20260316 - Julian) Confidence */}
      <td
        aria-label="Confidence"
        className="px-6 py-4 text-center align-middle"
      >
        <div className="flex items-center justify-center gap-3">
          <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full ${mockConfidence >= 90 ? "bg-emerald-400" : "bg-orange-500"}`}
              style={{ width: `${mockConfidence}%` }}
            ></div>
          </div>
          <span className="text-sm font-black whitespace-nowrap text-slate-700">
            {mockConfidence}%
          </span>
        </div>
      </td>
      {/* Info: (20260316 - Julian) Status */}
      <td aria-label="Status" className="px-6 py-4 text-center align-middle">
        {mockStatus === "verified" ? (
          <div className="flex flex-col items-center justify-center gap-1 text-emerald-500">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-xs font-bold whitespace-nowrap">已核對</span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-1.5 text-orange-500">
            <button
              type="button"
              onClick={onClick}
              disabled={voucher.isDeleted}
              className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-4 py-1.5 text-sm font-bold whitespace-nowrap text-white shadow-sm disabled:bg-slate-300 enabled:hover:bg-orange-600"
            >
              人工核對
            </button>
          </div>
        )}
      </td>
    </tr>
  );
};

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

      const data = await request<IApiResponse<{ result: IVoucher[] }>>(
        `/api/v1/user/account_book/${accountBookId}/voucher?${searchParams.toString()}`,
      );
      if (data.payload?.result) {
        setVouchers(data.payload.result);
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
    // ToDo: (20260316 - Julian) 建立一鍵核對所有傳票的邏輯
  };

  const displayedVoucher = isLoading ? (
    <tr aria-label="Loading vouchers">
      <td
        aria-label="Loading vouchers"
        colSpan={7}
        className="px-3 py-4 text-center sm:px-6"
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
      <td colSpan={7} className="px-3 py-4 text-center sm:px-6">
       目前無傳票資料
      </td>
    </tr>
  );

  return (
    <>
      <div className="flex w-full flex-col gap-4">
        <div className="mx-auto w-full max-w-[1400px]">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* Info: (20260316 - Julian) Toolbar */}
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 p-4">
              <div className="relative max-w-[400px] flex-1">
                <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="searchField"
                  aria-label={t("voucher.main_view.filters.search")}
                  type="text"
                  value={keyWord}
                  onChange={(e) => setKeyWord(e.target.value)}
                  placeholder={t("搜尋傳票編號、科目名稱...")}
                  className="w-full rounded-full border border-slate-300 py-2.5 pr-4 pl-11 text-sm font-semibold text-slate-700 shadow-sm placeholder:font-medium placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center rounded-lg border px-4 py-2 text-sm font-bold transition-colors ${showFilters ? "border-orange-500 bg-orange-50 text-orange-600" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"}`}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  篩選條件
                </button>
                <button
                  type="button"
                  disabled
                  onClick={verifyAllVouchers}
                  className="flex items-center rounded-lg bg-green-500 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-400"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  一鍵核對所有傳票
                </button>
              </div>
            </div>

            {/* Info: (20260316 - Julian) Filter Content */}
            {showFilters && (
              <div className="flex flex-col gap-6 border-b border-slate-200 bg-slate-50 p-6 shadow-inner lg:flex-row">
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
                  <div className="flex w-[300px] items-center gap-4">
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
            )}

            <div className="flex items-center justify-between bg-white px-6 py-4">
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
                  className="cursor-pointer text-sm font-semibold text-slate-600"
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
                    <th className="px-6 py-4 text-center text-xs font-black tracking-wider whitespace-nowrap text-slate-500 uppercase">
                      憑證
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-black tracking-wider whitespace-nowrap">
                      <button
                        type="button"
                        aria-label="傳票日期"
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
                          傳票日期
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
                    <th className="px-6 py-4 text-center text-xs font-black tracking-wider whitespace-nowrap text-slate-500 uppercase">
                      種類/編號
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-black tracking-wider whitespace-nowrap text-slate-500 uppercase">
                      會計科目分錄
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-black tracking-wider whitespace-nowrap">
                      <button
                        type="button"
                        aria-label="借方金額"
                        onClick={clickDebitSort}
                        className="group ml-auto flex items-center justify-end gap-1"
                      >
                        <span
                          className={`transition-colors ease-in-out ${
                            isDebitAsc || isDebitDesc
                              ? "text-orange-500"
                              : "text-slate-500 group-hover:text-orange-500"
                          }`}
                        >
                          借方金額
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
                    <th className="px-6 py-4 text-right text-xs font-black tracking-wider whitespace-nowrap">
                      <button
                        type="button"
                        aria-label="貸方金額"
                        onClick={clickCreditSort}
                        className="group ml-auto flex items-center justify-end gap-1"
                      >
                        <span
                          className={`transition-colors ease-in-out ${
                            isCreditAsc || isCreditDesc
                              ? "text-orange-500"
                              : "text-slate-500 group-hover:text-orange-500"
                          }`}
                        >
                          貸方金額
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
                    <th className="px-6 py-4 text-center text-xs font-black tracking-wider whitespace-nowrap text-slate-500 uppercase">
                      AI 信心度
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-black tracking-wider whitespace-nowrap text-slate-500 uppercase">
                      狀態
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
    </>
  );
}
