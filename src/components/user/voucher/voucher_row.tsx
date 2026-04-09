"use client";

import {
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  CheckCircle2,
  FileQuestion,
  Loader2,
  CircleAlert,
  Trash2,
  Undo2,
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
  onDelete,
  onRestore,
}: {
  voucher: IVoucher;
  onClick: () => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
}) {
  const { t } = useTranslation();
  const lineItems = voucher.lineItems.lines;

  const isAnalysisFailed = voucher.analysisStatus === AIAnalysisStatus.FAILED;

  const actionsColumn = (
    <td
      aria-label="Actions"
      className="p-2 text-center align-middle lg:px-4 lg:py-4"
      onClick={(e) => e.stopPropagation()}
    >
      {voucher.isDeleted ? (
        <button
          title={t("common.restore")}
          onClick={() => onRestore(voucher.id)}
          className="rounded-full p-2 text-slate-400 transition-colors hover:bg-emerald-100 hover:text-emerald-500"
        >
          <Undo2 size={20} />
        </button>
      ) : (
        <button
          title={t("common.delete")}
          onClick={() => onDelete(voucher.id)}
          className="rounded-full p-2 text-slate-400 transition-colors hover:bg-red-100 hover:text-red-500"
        >
          <Trash2 size={20} />
        </button>
      )}
    </td>
  );

  const renderType = (type: TradingType | null) => {
    switch (type) {
      case TradingType.INCOME:
        return (
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-500 lg:text-xs">
            <ArrowDownLeft size={14} className="shrink-0 stroke-[2.5]" />
            <span>{t("voucher.main_view.table.types.income")}</span>
          </div>
        );
      case TradingType.OUTCOME:
        return (
          <div className="flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[10px] font-bold text-red-500 lg:text-xs">
            <ArrowUpRight size={14} className="shrink-0 stroke-[2.5]" />
            <span>{t("voucher.main_view.table.types.outcome")}</span>
          </div>
        );
      case TradingType.TRANSFER:
        return (
          <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold text-slate-700 lg:text-xs">
            <ArrowRightLeft size={14} className="shrink-0 stroke-[2.5]" />
            <span>{t("voucher.main_view.table.types.transfer")}</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold text-slate-600 lg:text-xs">
            <FileQuestion size={14} className="stroke-[2.5]" />
            <span>{t("voucher.main_view.table.types.unknown")}</span>
          </div>
        );
    }
  };

  // Info: (20260320 - Julian) 尚未開始
  if (voucher.analysisStatus === AIAnalysisStatus.PENDING) {
    return (
      <tr
        className={`border-b text-sm opacity-80 transition-colors last:border-0 ${voucher.isDeleted ? "border-slate-300 bg-slate-50 text-slate-500" : "border-slate-300 bg-slate-50 text-slate-400"}`}
      >
        {/* Info: (20260320 - Julian) File Preview loading */}
        <td className="p-2 text-center lg:px-6 lg:py-4">
          <div className="mx-auto flex size-14 items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-white p-1 shadow-sm sm:h-16 sm:w-16">
            {voucher.isDeleted ? (
              <Trash2 className="size-6 text-slate-400" />
            ) : (
              <Loader2 className="size-6 animate-spin text-orange-400" />
            )}
          </div>
        </td>
        {/* Info: (20260320 - Julian) Trading Date (still showing the created date conceptually) */}
        <td className="p-2 text-center align-middle font-bold whitespace-nowrap lg:px-6 lg:py-4">
          <p className="text-xs lg:text-sm">
            {timestampToString(voucher.tradingDate).dateWithDash}
          </p>
        </td>
        {/* Info: (20260320 - Julian) Colspan the rest of the parsing info to show a generic loading center */}
        <td
          colSpan={5}
          className="p-2 text-center align-middle lg:px-6 lg:py-4"
        >
          {voucher.isDeleted ? (
            <span className="flex items-center justify-center gap-2 font-bold text-slate-500">
              <Trash2 size={16} />
              {t("common.status_deleted")}
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2 text-sm font-medium italic">
              <Loader2 className="size-4 animate-spin text-orange-500" />
              {t("common.ai.pending")}
            </span>
          )}
        </td>
        {actionsColumn}
      </tr>
    );
  }

  // Info: (20260320 - Julian) 處理中
  if (voucher.analysisStatus === AIAnalysisStatus.PROCESSING) {
    return (
      <tr
        className={`border-b text-sm opacity-90 transition-colors last:border-0 ${voucher.isDeleted ? "border-slate-300 bg-slate-50 text-slate-500" : "border-blue-200 bg-blue-50 text-blue-400"}`}
      >
        {/* Info: (20260320 - Julian) File Preview loading */}
        <td className="p-2 text-center lg:px-6 lg:py-4">
          <div className="mx-auto flex size-14 items-center justify-center overflow-hidden rounded-lg border border-dashed border-blue-300 bg-white p-1 shadow-sm sm:h-16 sm:w-16">
            {voucher.isDeleted ? (
              <Trash2 className="size-6 text-slate-400" />
            ) : (
              <Loader2 className="size-6 animate-spin text-blue-500" />
            )}
          </div>
        </td>
        {/* Info: (20260320 - Julian) Trading Date */}
        <td className="p-2 text-center align-middle font-bold whitespace-nowrap lg:px-6 lg:py-4">
          <p className="text-xs lg:text-sm">
            {timestampToString(voucher.tradingDate).dateWithDash}
          </p>
        </td>
        <td
          aria-label="AI Processing"
          colSpan={5}
          className="p-2 text-center align-middle lg:px-6 lg:py-4"
        >
          {voucher.isDeleted ? (
            <span className="flex items-center justify-center gap-2 font-bold text-slate-500">
              <Trash2 size={16} />
              {t("common.status_deleted")}
            </span>
          ) : (
            <div className="mx-auto flex max-w-sm flex-col items-center justify-center gap-2">
              <span className="flex items-center justify-center gap-2 text-sm font-bold text-blue-600 italic">
                <Loader2 className="size-4 animate-spin text-blue-500" />
                {t("voucher.main_view.table.ai.processing")}
              </span>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-200">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-blue-500"></div>
              </div>
            </div>
          )}
        </td>
        {actionsColumn}
      </tr>
    );
  }

  // Info: (20260320 - Julian) 分析出錯
  if (voucher.analysisStatus === AIAnalysisStatus.FAILED) {
    const failedMessage =
      voucher.aiNote && voucher.aiNote !== "無 AI 分析備註"
        ? voucher.aiNote
        : (t("voucher.main_view.table.ai.failed") as string);

    return (
      <tr
        onClick={!voucher.isDeleted ? onClick : undefined}
        className={`border-b text-sm opacity-80 transition-colors last:border-0 ${voucher.isDeleted ? "border-slate-300 bg-slate-50 text-slate-500" : "border-slate-300 bg-red-50 text-red-500 hover:cursor-pointer hover:bg-red-100"}`}
      >
        {/* Info: (20260320 - Julian) File Preview loading */}
        <td className="p-2 lg:px-6 lg:py-4">
          <div className="mx-auto flex size-14 items-center justify-center overflow-hidden rounded-lg border border-dashed border-red-300 bg-white p-1 shadow-sm sm:size-16">
            {voucher.isDeleted ? (
              <Trash2 className="size-6 text-slate-400" />
            ) : (
              <CircleAlert className="size-6 text-red-500" />
            )}
          </div>
        </td>
        {/* Info: (20260320 - Julian) Trading Date (still showing the created date conceptually) */}
        <td className="p-2 text-center align-middle font-bold whitespace-nowrap lg:px-6 lg:py-4">
          <p className="text-xs lg:text-sm">
            {timestampToString(voucher.tradingDate).dateWithDash}
          </p>
        </td>
        {/* Info: (20260320 - Julian) Colspan the rest of the parsing info to show a generic loading center */}
        <td
          colSpan={5}
          className="p-2 text-center align-middle lg:px-6 lg:py-4"
        >
          {voucher.isDeleted ? (
            <span className="flex items-center justify-center gap-2 font-bold text-slate-500">
              <Trash2 size={16} />
              {t("common.status_deleted")}
            </span>
          ) : (
            <p
              className="truncate font-bold text-red-500"
              title={failedMessage}
            >
              {failedMessage}
            </p>
          )}
        </td>
        {actionsColumn}
      </tr>
    );
  }

  const voucherline =
    lineItems.length > 0 ? (
      <>
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
                  } max-w-[100px] truncate text-xs lg:max-w-[250px] lg:text-sm`}
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
                <span>
                  {line.isDebit ? numberWithCommas(line.amount) : "−"}
                </span>
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
                <span>
                  {!line.isDebit ? numberWithCommas(line.amount) : "−"}
                </span>
              </div>
            ))}
          </div>
        </td>
      </>
    ) : (
      <td
        colSpan={3}
        className="py-2 text-center align-middle font-medium text-slate-800 lg:py-4"
      >
        ==== {t("voucher.main_view.table.no_entries")} ====
      </td>
    );

  return (
    <tr
      onClick={!voucher.isDeleted ? onClick : undefined}
      className={`border-b border-slate-300 text-sm transition-colors last:border-0 ${isAnalysisFailed ? "bg-red-200" : "bg-white"} ${voucher.isDeleted ? "opacity-50" : "cursor-pointer hover:bg-orange-100"}`}
    >
      {/* Info: (20260316 - Julian) File */}
      <td className="p-2 text-center lg:px-6 lg:py-4">
        <div className="relative mx-auto flex size-14 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-sm sm:h-16 sm:w-16">
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
      </td>
      {/* Info: (20260316 - Julian) Type */}
      <td
        aria-label="Type"
        className="p-2 text-center align-middle lg:px-6 lg:py-4"
      >
        <div className="flex w-[100px] flex-col items-center justify-center gap-2 lg:w-auto">
          {renderType(voucher.tradingType)}
          <span className="text-[8px] font-black tracking-wider text-slate-800 lg:text-xs">
            {voucher.id}
          </span>
        </div>
      </td>

      {/* Info: (20260325 - Julian) Accounting, Debit, Credit */}
      {voucherline}

      {/* Info: (20260409 - Julian) Status / AI Confidence */}
      <td
        aria-label="Status"
        className="p-2 text-center align-middle lg:px-6 lg:py-4"
      >
        <div className="flex flex-col items-center gap-2">
          {voucher.isDeleted ? (
            <div className="mx-auto flex flex-col items-center justify-center gap-1 text-slate-400">
              <Trash2 size={24} />
              <span className="text-xs font-bold whitespace-nowrap">
                {t("common.status_deleted")}
              </span>
            </div>
          ) : voucher.isVerified ? (
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
          <AiConfidence confidence={voucher.confidence} barOnly />
        </div>
      </td>
      {/* Info: (20260404 - Luphia) Actions */}
      {actionsColumn}
    </tr>
  );
}
