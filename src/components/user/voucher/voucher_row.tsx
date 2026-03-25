"use client";

import {
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  CheckCircle2,
  FileQuestion,
  Loader2,
  CircleAlert,
} from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { timestampToString, numberWithCommas } from "@/lib/utils/common";
import { FilePreview } from "@/components/common/file_preview";
import AiConfidence from "@/components/common/ai_confidence";
import { IVoucher, TradingType } from "@/interfaces/voucher";
import { AIAnalysisStatus } from "@/constants/ai_analysis_status";

export function VoucherRow({
  voucher,
  onClick,
}: {
  voucher: IVoucher;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const lineItems = voucher.lineItems.lines;

  const isAnalysisFailed = voucher.analysisStatus === AIAnalysisStatus.FAILED;

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
        return t("voucher.main_view.table.types.outcome");
      case TradingType.INCOME:
        return t("voucher.main_view.table.types.income");
      case TradingType.TRANSFER:
        return t("voucher.main_view.table.types.transfer");
      default:
        return t("voucher.main_view.table.types.unknown");
    }
  };

  // Info: (20260320 - Julian) 尚未開始
  if (voucher.analysisStatus === AIAnalysisStatus.PENDING) {
    return (
      <tr className="border-b border-slate-300 bg-slate-50 text-sm opacity-80 transition-colors last:border-0">
        {/* Info: (20260320 - Julian) File Preview loading */}
        <td className="p-2 text-center lg:px-6 lg:py-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-white p-1 shadow-sm sm:h-16 sm:w-16">
            <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
          </div>
        </td>
        {/* Info: (20260320 - Julian) Trading Date (still showing the created date conceptually) */}
        <td className="p-2 text-center align-middle font-bold whitespace-nowrap text-slate-400 lg:px-6 lg:py-4">
          <p className="text-xs lg:text-sm">
            {timestampToString(voucher.tradingDate).dateWithDash}
          </p>
        </td>
        {/* Info: (20260320 - Julian) Colspan the rest of the parsing info to show a generic loading center */}
        <td
          colSpan={5}
          className="p-2 text-center align-middle lg:px-6 lg:py-4"
        >
          <span className="flex items-center justify-center gap-2 text-sm font-medium text-orange-500 italic">
            <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
            AI Analyzing...
          </span>
        </td>
        {/* Info: (20260320 - Julian) Status action (Disabled) */}
        <td
          aria-label="Status"
          className="p-2 text-center align-middle lg:px-6 lg:py-4"
        >
          <div className="flex flex-col items-center justify-center gap-1.5">
            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center justify-center rounded-xl bg-slate-200 px-4 py-1.5 text-sm font-bold whitespace-nowrap text-slate-400 shadow-sm"
            >
              Pending
            </button>
          </div>
        </td>
      </tr>
    );
  }

  // Info: (20260320 - Julian) 處理中
  if (voucher.analysisStatus === AIAnalysisStatus.PROCESSING) {
    return (
      <tr className="border-b border-blue-200 bg-blue-50 text-sm opacity-90 transition-colors last:border-0">
        {/* Info: (20260320 - Julian) File Preview loading */}
        <td className="p-2 text-center lg:px-6 lg:py-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border border-dashed border-blue-300 bg-white p-1 shadow-sm sm:h-16 sm:w-16">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        </td>
        {/* Info: (20260320 - Julian) Trading Date */}
        <td className="p-2 text-center align-middle font-bold whitespace-nowrap text-blue-400 lg:px-6 lg:py-4">
          <p className="text-xs lg:text-sm">
            {timestampToString(voucher.tradingDate).dateWithDash}
          </p>
        </td>
        <td
          aria-label="AI Processing"
          colSpan={5}
          className="p-2 text-center align-middle lg:px-6 lg:py-4"
        >
          <div className="mx-auto flex max-w-sm flex-col items-center justify-center gap-2">
            <span className="flex items-center justify-center gap-2 text-sm font-bold text-blue-600 italic">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              AI Processing...
            </span>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-200">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-blue-500"></div>
            </div>
          </div>
        </td>
        {/* Info: (20260320 - Julian) Status action (Disabled) */}
        <td
          aria-label="Status"
          className="p-2 text-center align-middle lg:px-6 lg:py-4"
        >
          <div className="flex flex-col items-center justify-center gap-1.5">
            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center justify-center rounded-xl bg-blue-200 px-4 py-1.5 text-sm font-bold whitespace-nowrap text-blue-500 shadow-sm"
            >
              Processing
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr
      onClick={!voucher.isDeleted ? onClick : undefined}
      className={`border-b border-slate-300 text-sm transition-colors last:border-0 ${isAnalysisFailed ? "bg-red-200" : "bg-white"} ${voucher.isDeleted ? "opacity-50" : "cursor-pointer hover:bg-orange-100"}`}
    >
      {/* Info: (20260316 - Julian) File */}
      <td className="p-2 text-center lg:px-6 lg:py-4">
        <div className="relative mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-sm sm:h-16 sm:w-16">
          {/* Info: (20260320 - Julian) File Preview */}
          {voucher.file ? (
            <FilePreview
              file={{ filename: voucher.file.fileName || "Unknown" }}
              fileId={voucher.file.hash}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center rounded-lg bg-slate-100 p-1">
              <FileQuestion className="mb-1 h-5 w-5 text-slate-300" />
              <span className="text-[10px] leading-none font-bold text-slate-400">
                {t("voucher.main_view.table.no_file")}
              </span>
            </div>
          )}
          {/* Info: (20260320 - Julian) Failed Icon */}
          {isAnalysisFailed && (
            <div className="absolute top-0 left-0 z-10 flex size-full items-center justify-center bg-red-100/50 p-1">
              <CircleAlert size={24} className="text-red-500" />
            </div>
          )}
        </div>
      </td>
      {/* Info: (20260316 - Julian) Trading Date */}
      <td className="p-2 text-center align-middle font-bold whitespace-nowrap text-slate-800 lg:px-6 lg:py-4">
        <p className="text-xs lg:text-sm">
          {timestampToString(voucher.tradingDate).dateWithDash}
        </p>
        {voucher.isDeleted && (
          <div className="mt-2 text-center">
            <span className="inline-block rounded-full bg-orange-200 px-2 py-0.5 text-[10px] font-bold text-orange-500">
              {t("voucher.main_view.table.status.deleted")}
            </span>
          </div>
        )}
      </td>
      {/* Info: (20260316 - Julian) Type */}
      <td
        aria-label="Type"
        className="p-2 text-center align-middle lg:px-6 lg:py-4"
      >
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
      <td
        aria-label="Accounting"
        className="py-2 pl-2 align-middle lg:py-4 lg:pl-6"
      >
        <div className="flex flex-col whitespace-nowrap">
          {lineItems.map((line) => (
            <div
              key={line.id}
              className="flex h-[30px] items-center gap-2 border-dashed border-slate-300 not-last:border-b"
            >
              <span className="w-[55px] rounded bg-slate-200 px-1.5 py-0.5 text-center text-xs font-semibold text-slate-700">
                {line.accounting?.code}
              </span>
              {/* Info: (20260316 - Julian) 借方靠左，貸方靠右 */}
              <span
                className={`${
                  line.isDebit
                    ? "font-bold text-slate-800"
                    : "ml-4 font-medium text-slate-700"
                } truncate text-xs lg:max-w-[250px] lg:text-sm`}
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
        className="py-2 text-right align-middle font-semibold text-slate-700 lg:py-4"
      >
        <div className="flex flex-col text-xs lg:text-sm">
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
        className="py-2 pr-2 text-right align-middle font-semibold lg:py-4 lg:pr-6"
      >
        <div className="flex flex-col text-xs lg:text-sm">
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
        className="p-2 text-center align-middle lg:px-6 lg:py-4"
      >
        <AiConfidence confidence={voucher.confidence} barOnly />
      </td>
      {/* Info: (20260316 - Julian) Status */}
      <td
        aria-label="Status"
        className="p-2 text-center align-middle lg:px-6 lg:py-4"
      >
        {voucher.isVerified ? (
          <div className="mx-auto flex flex-col items-center justify-center gap-1 text-emerald-500">
            <CheckCircle2 size={24} />
            <span className="text-xs font-bold whitespace-nowrap">
              {t("verify.status.verified")}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-1.5 text-orange-500">
            <FileQuestion size={24} />
            <span className="text-xs font-bold whitespace-nowrap">
              {t("verify.status.unverified")}
            </span>
          </div>
        )}
      </td>
    </tr>
  );
}
