"use client";

import { useTranslation } from "@/i18n/i18n_context";
import VoucherSummary from "@/components/user/voucher/voucher_summary";
import VoucherTableSection from "@/components/user/voucher/voucher_table_section";

export default function VoucherMainView() {
  const { t } = useTranslation();

  return (
    <div className="flex max-w-[calc(100vw-30px)] flex-col gap-y-4 px-0 lg:gap-y-6 lg:px-12">
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
      </div>

      {/* Info: (20260316 - Julian) Summary */}
      <VoucherSummary />

      {/* Info: (20260316 - Julian) Table Section */}
      <VoucherTableSection />
    </div>
  );
}
