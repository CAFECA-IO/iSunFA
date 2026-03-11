"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Download,
  Upload,
  ArrowRightLeft,
  ChevronUp,
  ChevronDown,
  Search,
} from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { timestampToString, numberWithCommas } from "@/lib/utils/common";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
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

  const renderIcon = (type: TradingType) => {
    switch (type) {
      case TradingType.INCOME:
        return <Download size={14} className="stroke-[2.5]" />;
      case TradingType.OUTCOME:
        return <Upload size={14} className="stroke-[2.5]" />;
      case TradingType.TRANSFER:
        return <ArrowRightLeft size={14} className="stroke-[2.5]" />;
      default:
        return null;
    }
  };

  const getTypeClasses = (style: TradingType) => {
    switch (style) {
      case TradingType.OUTCOME:
        return "bg-red-200 text-red-500";
      case TradingType.INCOME:
        return "bg-emerald-200 text-emerald-600";
      case TradingType.TRANSFER:
        return "bg-slate-200 text-slate-700";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  const getPillLabel = (v: IVoucher) => {
    if (v.tradingType === TradingType.TRANSFER) return "Transfer";
    return v.id;
  };

  return (
    <tr
      key={voucher.id}
      onClick={voucher.isDeleted ? undefined : onClick}
      className={`transition-colors last:border-0 odd:bg-slate-50 even:bg-white ${
        voucher.isDeleted ? "cursor-not-allowed" : "cursor-pointer hover:bg-orange-100"
      }`}
    >
      <td className="px-3 py-4 align-middle text-xs sm:px-6 sm:text-sm">
        <div className="font-bold">
          {timestampToString(voucher.tradingDate).dateAndTime}
        </div>
      </td>
      <td className="px-3 py-4 align-middle sm:px-6">
        <span
          className={`flex items-center justify-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold whitespace-nowrap sm:text-sm ${getTypeClasses(voucher.tradingType)}`}
        >
          {renderIcon(voucher.tradingType)} {getPillLabel(voucher)}
        </span>
        {voucher.isDeleted && (
          <div className="mt-2">
            <span className="inline-block rounded-full bg-orange-200 px-2 py-0.5 text-[10px] font-bold text-orange-500">
              {t("voucher.main_view.table.status_deleted")}
            </span>
          </div>
        )}
      </td>
      <td className="px-3 py-4 align-middle text-xs font-bold text-slate-700 sm:px-6 sm:text-sm">
        <div className="line-clamp-3">{voucher.note || "-"}</div>
      </td>
      <td aria-label="Accounting" className="px-3 py-4 align-top sm:px-6">
        <div className="flex flex-col gap-2 text-[10px] font-semibold whitespace-nowrap text-slate-700 sm:text-xs">
          {lineItems.map((line) => (
            <div key={line.id} className="flex items-center gap-2">
              <span className="text-slate-400">{line.accounting?.code}</span>
              <span>{line.accounting?.name}</span>
            </div>
          ))}
        </div>
      </td>
      <td
        aria-label="Debit"
        className="py-4 pl-3 text-right align-top text-xs font-bold text-slate-600 sm:pl-6"
      >
        <div className="flex flex-col items-end gap-2 border-b border-slate-300 px-2 pb-2">
          {lineItems.map((line) => (
            <div
              key={line.id}
              className={`flex items-center gap-2 text-right ${line.isDebit ? "text-slate-600" : "text-slate-300"}`}
            >
              <span>{line.isDebit ? numberWithCommas(line.amount) : 0}</span>
            </div>
          ))}
        </div>
      </td>

      <td
        aria-label="Credit"
        className="py-4 pr-3 text-right align-top text-xs font-bold sm:pr-6"
      >
        <div className="flex flex-col gap-2">
          <div className="flex flex-col items-end gap-2 border-b border-slate-300 px-2 pb-2">
            {lineItems.map((line) => (
              <div
                key={line.id}
                className={`flex items-center gap-2 text-right ${line.isDebit ? "text-slate-300" : "text-slate-600"}`}
              >
                <span>{line.isDebit ? 0 : numberWithCommas(line.amount)}</span>
              </div>
            ))}
          </div>
          <div className="px-2 text-right">
            {numberWithCommas(voucher.lineItems.totalAmount)}
          </div>
        </div>
      </td>
      <td aria-label="Issuer" className="px-3 py-4 align-middle sm:px-6">
        <div className="flex items-center justify-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white">
            {voucher.issuerName.substring(0, 2).toUpperCase()}
          </div>
          <span className="text-xs font-bold text-slate-700">
            {voucher.issuerName}
          </span>
        </div>
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

export default function VoucherMainView() {
  const params = useParams();
  const pathname = usePathname();
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

  // Info: (20260309 - Julian) 連接到 Journal
  const journalLink = pathname.replace("voucher", "journal");

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

  const displayedVoucher = isLoading ? (
    <tr>
      <td colSpan={7} className="px-3 py-4 text-center sm:px-6">
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
        {t("voucher.main_view.empty_message_prefix")}{" "}
        <Link href={journalLink} className="text-blue-600 hover:underline">
          {t("voucher.main_view.empty_upload_link")}
        </Link>
      </td>
    </tr>
  );

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-50/50">
      <div className="flex justify-between px-8 py-6">
        <h1 className="text-2xl font-bold text-slate-800">
          {t("voucher.main_view.title")}
        </h1>
      </div>

      <div className="flex w-full flex-col gap-4 gap-x-12 px-0 pb-10 sm:px-8">
        <div className="mx-auto w-full max-w-[1400px]">
          {/* Info: (20260310 - Julian) Top Controls */}
          <div className="mb-6 flex flex-col gap-4 lg:flex-row">
            <div className="flex-1">
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
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
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
            <div className="flex-[1.5]">
              <div className="mb-2 block text-xs font-semibold text-slate-700">
                {t("voucher.main_view.filters.period")}
              </div>
              <div className="flex items-center gap-2">
                <input
                  aria-label="Start Date"
                  type="date"
                  value={startDate}
                  max={endDate || undefined}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-[14px] py-[10.5px] text-sm font-semibold text-slate-700 shadow-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                />
                <span className="text-slate-400">-</span>
                <input
                  aria-label="End Date"
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-[14px] py-[10.5px] text-sm font-semibold text-slate-700 shadow-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex-2">
              <label
                htmlFor="searchField"
                className="mb-2 block text-xs font-semibold text-transparent select-none"
              >
                {t("voucher.main_view.filters.search")}
              </label>
              <div className="relative">
                <input
                  id="searchField"
                  aria-label={t("voucher.main_view.filters.search")}
                  type="text"
                  value={keyWord}
                  onChange={(e) => setKeyWord(e.target.value)}
                  placeholder={t("voucher.main_view.filters.search")}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-10 text-sm font-semibold text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                />
                <Search
                  className="absolute top-1/2 right-4 -translate-y-1/2 text-slate-400"
                  size={18}
                />
              </div>
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between">
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
            {/* ToDo: (20260310 - Julian) 先隱藏 */}
            {/* <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <Download size={16} /> Export Voucher
              </button>
              <button className="text-sm font-bold text-blue-600 hover:text-blue-700">
                Select
              </button>
            </div> */}
          </div>

          <div className="mb-2 text-right text-xs font-bold tracking-wider text-slate-400 uppercase">
            {t("voucher.main_view.filters.currency").replace(
              "{currency}",
              currencyUnit,
            )}
          </div>

          {/* Info: (20260310 - Julian) Table Container */}
          <div className="max-w-[90vw] overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm text-gray-600">
              <tbody>
                <tr>
                  <th className="bg-slate-100 px-3 py-4 text-left text-xs whitespace-nowrap sm:w-[180px] sm:px-6 sm:text-base">
                    <button
                      type="button"
                      aria-label={t("voucher.main_view.table.issued_date")}
                      onClick={clickDateSort}
                      className="flex items-center gap-1"
                    >
                      <span
                        className={`transition-colors duration-100 ease-in-out hover:text-orange-700 ${
                          isDateDesc || isDateAsc
                            ? "text-orange-500"
                            : "text-slate-700"
                        }`}
                      >
                        {t("voucher.main_view.table.issued_date")}
                      </span>
                      <div className="-gap-[2px] flex shrink-0 flex-col px-2">
                        <ChevronUp
                          size={14}
                          className={`translate-y-[2px] transition-colors ${isDateAsc ? "text-orange-500" : "text-slate-700"}`}
                        />
                        <ChevronDown
                          size={14}
                          className={`-translate-y-[2px] transition-colors ${isDateDesc ? "text-orange-500" : "text-slate-700"}`}
                        />
                      </div>
                    </button>
                  </th>
                  <th className="bg-slate-100 px-3 py-4 text-center text-xs whitespace-nowrap text-slate-700 sm:px-6 sm:text-base">
                    {t("voucher.main_view.table.voucher_no")}
                  </th>
                  <th className="bg-slate-100 px-3 py-4 text-center text-xs whitespace-nowrap text-slate-700 sm:px-6 sm:text-base">
                    {t("voucher.main_view.table.note")}
                  </th>
                  <th className="bg-slate-100 px-3 py-4 text-center text-xs whitespace-nowrap text-slate-700 sm:px-6 sm:text-base">
                    {t("voucher.main_view.table.accounting")}
                  </th>
                  <th className="bg-slate-100 px-3 py-4 text-center text-xs whitespace-nowrap sm:px-6 sm:text-base">
                    <button
                      type="button"
                      aria-label={t("voucher.main_view.table.debit")}
                      onClick={clickDebitSort}
                      className="mx-auto flex items-center justify-center gap-1"
                    >
                      <span
                        className={`transition-colors duration-100 ease-in-out hover:text-orange-700 ${
                          isDebitAsc || isDebitDesc
                            ? "text-orange-500"
                            : "text-slate-700"
                        }`}
                      >
                        {t("voucher.main_view.table.debit")}
                      </span>
                      <div className="-gap-[2px] flex shrink-0 flex-col px-2">
                        <ChevronUp
                          size={14}
                          className={`translate-y-[2px] transition-colors ${isDebitAsc ? "text-orange-500" : "text-slate-700"}`}
                        />
                        <ChevronDown
                          size={14}
                          className={`-translate-y-[2px] transition-colors ${isDebitDesc ? "text-orange-500" : "text-slate-700"}`}
                        />
                      </div>
                    </button>
                  </th>
                  <th className="bg-slate-100 px-3 py-4 text-center text-xs whitespace-nowrap sm:px-6 sm:text-base">
                    <button
                      type="button"
                      aria-label={t("voucher.main_view.table.credit")}
                      onClick={clickCreditSort}
                      className="mx-auto flex items-center justify-center gap-1"
                    >
                      <span
                        className={`transition-colors duration-100 ease-in-out hover:text-orange-700 ${
                          isCreditAsc || isCreditDesc
                            ? "text-orange-500"
                            : "text-slate-700"
                        }`}
                      >
                        {t("voucher.main_view.table.credit")}
                      </span>
                      <div className="-gap-[2px] flex shrink-0 flex-col px-2">
                        <ChevronUp
                          size={14}
                          className={`translate-y-[2px] transition-colors ${isCreditAsc ? "text-orange-500" : "text-slate-700"}`}
                        />
                        <ChevronDown
                          size={14}
                          className={`-translate-y-[2px] transition-colors ${isCreditDesc ? "text-orange-500" : "text-slate-700"}`}
                        />
                      </div>
                    </button>
                  </th>
                  <th className="bg-slate-100 px-3 py-4 text-center text-xs whitespace-nowrap text-slate-700 sm:px-6 sm:text-base">
                    {t("voucher.main_view.table.issuer")}
                  </th>
                </tr>
                {displayedVoucher}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <VoucherDetailModal
        key={selectedVoucherId || "new"}
        isOpen={isModalOpen}
        onClose={onModalClose}
        voucherId={selectedVoucherId?.toString() ?? ""}
      />
    </div>
  );
}
