"use client";

import { Leaf, Download, Target } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { useParams } from "next/navigation";
import { useState } from "react";
import EsgSummary from "@/components/user/esg/esg_summary";
import EsgTableSection from "@/components/user/esg/esg_table_section";
import EsgTargetModal from "@/components/user/esg/esg_target_modal";

export default function EsgMainView() {
  const { t } = useTranslation();
  const params = useParams();
  const accountBookId = params?.account_book_id as string;

  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);

  return (
    <div className="flex max-w-[calc(100vw-30px)] flex-col space-y-6 px-0 md:px-12">
      {/* Info: (20260312 - Julian) Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="flex items-center text-base font-bold text-slate-800 lg:text-2xl">
            <Leaf className="mr-2 h-6 w-6 text-green-500" strokeWidth={2.5} />
            {t("esg_main.title")}
          </h1>
          <p className="text-xs font-medium text-slate-500 lg:text-sm">
            {t("esg_main.description")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setIsTargetModalOpen(true)}
            className="flex items-center rounded-lg bg-[#FF5A1F] px-5 py-2 text-sm font-medium text-white hover:bg-[#E04914] transition-all focus:outline-none"
          >
            <Target className="mr-2 h-4 w-4" />
            {t("esg_target.btn")}
          </button>
          <button
            type="button"
            disabled
            className="flex items-center rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-bold text-slate-500 transition-colors enabled:hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Download className="mr-2 h-4 w-4" />
            {t("esg_main.export_button")}
          </button>
        </div>
      </div>

      {/* Info: (20260312 - Julian) Summary */}
      <EsgSummary />

      {/* Info: (20260312 - Julian) Table Section */}
      <EsgTableSection />

      {/* Info: (20260321 - Luphia) Target Modal */}
      <EsgTargetModal
        isOpen={isTargetModalOpen}
        onClose={() => setIsTargetModalOpen(false)}
        accountBookId={accountBookId}
      />
    </div>
  );
}
