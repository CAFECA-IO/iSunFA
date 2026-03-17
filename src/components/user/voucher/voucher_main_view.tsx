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
    <div className="flex w-full flex-col space-y-6 px-12">
      {/* Info: (20260316 - Julian) Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center text-2xl font-bold text-slate-800">
            {t("智能傳票管理")}
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            {t("AI 已根據您的憑證辨識結果自動產生對應的會計分錄。")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled
            className="flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-colors enabled:hover:bg-slate-300 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            <Download className="mr-2 h-4 w-4" />
            匯出傳票
          </button>
          <button
            type="button"
            disabled
            onClick={createVoucher}
            className="flex items-center rounded-lg border border-amber-500 bg-amber-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors enabled:hover:border-amber-600 enabled:hover:bg-amber-600 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-white disabled:text-slate-400"
          >
            <Plus className="mr-2 h-4 w-4" />
            新增傳票
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
