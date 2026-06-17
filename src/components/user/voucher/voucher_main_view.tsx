"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useTranslation } from "@/i18n/i18n_context";
import VoucherSummary from "@/components/user/voucher/voucher_summary";
import VoucherTableSection from "@/components/user/voucher/voucher_table_section";
import ExportSettingsModal from "@/components/user/common/export_settings_modal";
import { Download } from "lucide-react";

export default function VoucherMainView() {
  const { t } = useTranslation();
  const params = useParams();
  const accountBookId = params?.account_book_id as string;
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  return (
    <div className="flex max-w-[calc(100vw-30px)] flex-col gap-y-4 px-0 lg:gap-y-6 lg:px-12">
      {/* Info: (20260316 - Julian) Header */}
      <div className="flex flex-col items-center justify-start gap-4 lg:flex-row lg:justify-between">
        {/* Info: (20260617 - Julian) Title */}
        <div className="flex flex-col gap-2">
          <h1 className="flex items-center text-base font-bold text-slate-800 lg:text-2xl">
            {t("voucher.main_view.title")}
          </h1>
          <p className="text-xs font-medium text-slate-500 lg:text-sm">
            {t("voucher.main_view.subtitle")}
          </p>
        </div>
        {/* Info: (20260617 - Julian) Export CSV Button */}
        <button
          type="button"
          onClick={() => setIsExportModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-orange-500 px-6 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-600 lg:text-base"
        >
          <Download className="size-5 shrink-0 lg:size-6" />
          Export CSV
        </button>
      </div>

      {/* Info: (20260316 - Julian) Summary */}
      <VoucherSummary />

      {/* Info: (20260316 - Julian) Table Section */}
      <VoucherTableSection />

      {/* Info: (20260617 - Julian) Export Settings Modal */}
      {accountBookId && (
        <ExportSettingsModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          accountBookId={accountBookId}
          type="voucher"
        />
      )}
    </div>
  );
}
