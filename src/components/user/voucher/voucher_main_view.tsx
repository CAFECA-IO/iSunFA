"use client";

import { Plus, Download } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import VoucherSummary from "@/components/user/voucher/voucher_summary";
import VoucherTableSection from "@/components/user/voucher/voucher_table_section";

export default function VoucherMainView() {
  const { t } = useTranslation();

  // Info: (20260316 - Julian) 新增傳票
  const createVoucher = async () => {
    // ToDo: (20260316 - Julian) 建立傳票邏輯
  };

  return (
    <div className="flex max-w-[calc(100vw-30px)] flex-col space-y-6 px-0 md:px-12">
      {/* Info: (20260316 - Julian) Header */}
      <div className="flex flex-col items-center justify-start gap-4 lg:flex-row lg:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="flex items-center text-base font-bold text-slate-800 lg:text-2xl">
            {t("voucher.main_view.title")}
          </h1>
          <p className="text-xs font-medium text-slate-500 lg:text-sm">
            {t("voucher.main_view.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled
            className="flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-colors enabled:hover:bg-slate-300 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            <Download className="mr-2 h-4 w-4" />
            {t("voucher.main_view.actions.export")}
          </button>
          <button
            type="button"
            disabled
            onClick={createVoucher}
            className="flex items-center rounded-lg border border-amber-500 bg-amber-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors enabled:hover:border-amber-600 enabled:hover:bg-amber-600 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300 disabled:text-slate-400"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("voucher.main_view.actions.add")}
          </button>
        </div>
      </div>

      {/* Info: (20260316 - Julian) Summary */}
      <VoucherSummary />

      {/* Info: (20260316 - Julian) Table Section */}
      <VoucherTableSection />
    </div>
  );
}
