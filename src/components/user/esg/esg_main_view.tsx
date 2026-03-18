"use client";

import { Leaf, Download } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import EsgSummary from "@/components/user/esg/esg_summary";
import EsgTableSection from "@/components/user/esg/esg_table_section";

export default function EsgMainView() {
  const { t } = useTranslation();

  return (
    <div className="flex max-w-[calc(100vw-30px)] flex-col space-y-6 px-0 md:px-12">
      {/* Info: (20260312 - Julian) Header */}
      <div className="flex flex-col items-center justify-start gap-4 lg:flex-row lg:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="flex items-center text-base font-bold text-slate-800 lg:text-2xl">
            <Leaf className="mr-2 h-6 w-6 text-green-500" strokeWidth={2.5} />
            {t("esg_main.title")}
          </h1>
          <p className="text-xs font-medium text-slate-500 lg:text-sm">
            {t("esg_main.description")}
          </p>
        </div>
        <button
          type="button"
          disabled
          className="flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-colors enabled:hover:bg-slate-300 disabled:cursor-not-allowed disabled:text-slate-400"
        >
          <Download className="mr-2 h-4 w-4" />
          {t("esg_main.export_button")}
        </button>
      </div>

      {/* Info: (20260312 - Julian) Summary */}
      <EsgSummary />

      {/* Info: (20260312 - Julian) Table Section */}
      <EsgTableSection />
    </div>
  );
}
