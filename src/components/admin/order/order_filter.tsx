import React from "react";
import { Search, X } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { ORDER_STATUS } from "@/constants/status";

// Info: (20260625 - Julian) 訂單類型
export const ORDER_TYPE = {
  BALANCE_SHEET: "balance_sheet", // Info: (20260625 - Julian) 資產負債表
  CASH_FLOW: "cash_flow", // Info: (20260625 - Julian) 現金流量表
  INCOME_STATEMENT: "income_statement", // Info: (20260625 - Julian) 損益表
  IRSC: "irsc", // Info: (20260625 - Julian) 智能企業評級
  FINANCIAL_COMPLIANCE: "financial_compliance", // Info: (20260625 - Julian) 財報合規性
  FINANCIAL_HEALTH: "financial_health", // Info: (20260625 - Julian) 財務健康
  MARKET_TRENDS: "market_trends", // Info: (20260625 - Julian) 市場趨勢
  INDUSTRY_DEVELOPMENT: "industry_development", // Info: (20260625 - Julian) 產業趨勢
  FINANCIAL_PRODUCT_RATING: "financial_product_rating", // Info: (20260625 - Julian) 投資評級
  CARBON_HEALTH_CHECK: "carbon_health_check", // Info: (20260625 - Julian) 碳健檢
  NET_ZERO_EMISSIONS: "net_zero_emissions", // Info: (20260625 - Julian) 碳中和
  AI_CONSULTING: "ai_consulting", // Info: (20260625 - Julian) AI 諮詢
  JOURNAL_UPLOAD: "journal_upload", // Info: (20260625 - Julian) 日記帳建檔
  CERTIFICATE_ANALYSIS: "certificate_analysis", // Info: (20260625 - Julian) 憑證分析
  TRANSPORTATION_CARBON_FOOTPRINT: "transportation_carbon_footprint", // Info: (20260625 - Julian) 運輸碳足跡
} as const;

// Info: (20260626 - Julian) 訂單類型
export type OrderType = (typeof ORDER_TYPE)[keyof typeof ORDER_TYPE];

interface IOrderFilterProps {
  searchInput: string;
  setSearchInput: (val: string) => void;
  type: string;
  handleTypeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  orderStatus: string;
  handleOrderStatusChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  executionStatus: string;
  handleExecutionStatusChange: (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => void;
  hasActiveFilters: boolean;
  handleResetFilters: () => void;
  isBatchMode: boolean;
  handleToggleBatchMode: () => void;
  hasReactivatableOrders: boolean;
  getOrderTypeLabel: (type: string) => string;
}

export default function OrderFilter({
  searchInput,
  setSearchInput,
  type,
  handleTypeChange,
  orderStatus,
  handleOrderStatusChange,
  executionStatus,
  handleExecutionStatusChange,
  hasActiveFilters,
  handleResetFilters,
  isBatchMode,
  handleToggleBatchMode,
  hasReactivatableOrders,
  getOrderTypeLabel,
}: IOrderFilterProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 items-end gap-2 md:grid-cols-5">
        {/* Info: (20260624 - Julian) Search Input */}
        <div className="col-span-1 flex flex-col gap-1 md:col-span-2">
          <p className="text-xs font-medium text-slate-500">
            {t("order_management.table.user")} &{" "}
            {t("order_management.table.order_id")}
          </p>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex shrink-0 items-center pl-3 text-gray-400">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder={t("order_management.table.search_bar_placeholder")}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pr-10 pl-10 text-sm placeholder-gray-400 transition-colors focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="absolute inset-y-0 right-0 flex shrink-0 items-center pr-3 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Info: (20260624 - Julian) Type Dropdowns */}
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-slate-500">
            {t("order_management.table.type")}
          </p>
          <select
            value={type}
            onChange={handleTypeChange}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 transition-colors focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
          >
            <option value="ALL">{t("common.all")}</option>
            {Object.values(ORDER_TYPE).map((typeVal) => (
              <option key={typeVal} value={typeVal}>
                {getOrderTypeLabel(typeVal)}
              </option>
            ))}
          </select>
        </div>

        {/* Info: (20260624 - Julian) Order Status Dropdowns */}
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-slate-500">
            {t("order_management.table.order_status")}
          </p>
          <select
            value={orderStatus}
            onChange={handleOrderStatusChange}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 transition-colors focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
          >
            <option value="ALL">{t("common.all")}</option>
            <option value={ORDER_STATUS.PENDING}>PENDING</option>
            <option value={ORDER_STATUS.PAYING}>PAYING</option>
            <option value={ORDER_STATUS.PAID}>PAID</option>
            <option value={ORDER_STATUS.PAYMENT_FAILED}>PAYMENT_FAILED</option>
            <option value={ORDER_STATUS.EXECUTING}>
              {t("order_management.table.processing")}
            </option>
            <option value={ORDER_STATUS.COMPLETED}>
              {t("order_management.table.executed")}
            </option>
            <option value={ORDER_STATUS.FAILED}>
              {t("order_management.table.failed")}
            </option>
            <option value={ORDER_STATUS.MINT_FAILED}>MINT_FAILED</option>
            <option value={ORDER_STATUS.CANCEL}>{t("common.cancel")}</option>
          </select>
        </div>

        {/* Info: (20260624 - Julian) Execution Status Dropdowns */}
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-slate-500">
            {t("order_management.table.execution_status")}
          </p>
          <select
            value={executionStatus}
            onChange={handleExecutionStatusChange}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 transition-colors focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
          >
            <option value="ALL">{t("common.all")}</option>
            <option value="PENDING">
              {t("order_management.table.pending")}
            </option>
            <option value="EXECUTING">
              {t("order_management.table.processing")}
            </option>
            <option value="COMPLETED">
              {t("order_management.table.executed")}
            </option>
            <option value="FAILED">{t("order_management.table.failed")}</option>
            <option value="CANCEL">{t("common.cancel")}</option>
          </select>
        </div>
      </div>

      {/* Info: (20260624 - Julian) Reset & Batch Reactivate Button */}
      <div className="flex items-center justify-end gap-2">
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:outline-none md:w-auto"
          >
            <X size={16} />
            <p>{t("common.clear_filters")}</p>
          </button>
        )}

        <button
          type="button"
          disabled={!hasReactivatableOrders && !isBatchMode}
          onClick={handleToggleBatchMode}
          className={`inline-flex items-center justify-center gap-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:outline-none ${
            isBatchMode
              ? "border border-orange-300 bg-orange-100 text-orange-700 hover:bg-orange-200"
              : !hasReactivatableOrders
                ? "cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400"
                : "border border-transparent bg-orange-600 text-white hover:bg-orange-700"
          }`}
        >
          {isBatchMode
            ? t("order_management.table.cancel_batch")
            : t("order_management.table.batch_reactivate")}
        </button>
      </div>
    </div>
  );
}
