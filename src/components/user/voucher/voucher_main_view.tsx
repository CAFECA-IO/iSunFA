"use client";

import { useState } from "react";
import {
  useParams,
  useSearchParams,
  useRouter,
  usePathname,
} from "next/navigation";
import { useTranslation } from "@/i18n/i18n_context";
import VoucherSummary from "@/components/user/voucher/voucher_summary";
import VoucherTableSection from "@/components/user/voucher/voucher_table_section";
import ExportSettingsModal, {
  ExportType,
} from "@/components/user/common/export_settings_modal";
import AccountManagementTab from "@/components/user/voucher/account_management_tab";
import { Download } from "lucide-react";

enum VoucherTab {
  VOUCHERS = "vouchers",
  ACCOUNTS = "accounts",
}

export default function VoucherMainView() {
  const { t } = useTranslation();
  const params = useParams();
  const accountBookId = params?.account_book_id as string;

  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  // Info: (20260703 - Julian) 取得 URL 參數中的 tab
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Info: (20260703 - Julian) 從 URL 參數取得 tab，預設顯示 records
  const tabParams = useSearchParams().get("tab");
  const activeTab =
    tabParams === "accounts" ? VoucherTab.ACCOUNTS : VoucherTab.VOUCHERS;

  const handleTabChange = (tab: VoucherTab) => {
    // Info: (20260703 - Julian) 複製目前的 URLSearchParams，再把 tab 的參數加上去
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.set("tab", tab);

    // Info: (20260703 - Julian) 更新 URL，並指定 scroll: false
    router.replace(`${pathname}?${newSearchParams.toString()}`, {
      scroll: false,
    });
  };

  const tabContent =
    activeTab === VoucherTab.VOUCHERS ? (
      <>
        {/* Info: (20260316 - Julian) Summary */}
        <VoucherSummary />
        {/* Info: (20260316 - Julian) Table Section */}
        <VoucherTableSection />
      </>
    ) : (
      <AccountManagementTab
        backToMainTab={() => handleTabChange(VoucherTab.VOUCHERS)}
      />
    );

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
          {t("voucher.main_view.actions.export")}
        </button>
      </div>

      {/* Info: (20260703 - Julian) Tab Switch */}
      <div className="grid w-full grid-cols-2 space-x-1 rounded-xl border border-gray-200 bg-gray-100 p-1.5 lg:w-fit">
        {Object.values(VoucherTab).map((tab) => (
          <button
            key={tab}
            title={t(`voucher.main_view.tab.${tab.toLowerCase()}`)}
            type="button"
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-200 lg:px-4 lg:py-2.5 lg:text-sm ${
              activeTab === tab
                ? "bg-white text-orange-600 shadow-sm"
                : "text-gray-600 hover:bg-gray-200/50 hover:text-gray-900"
            }`}
            onClick={() => handleTabChange(tab)}
            disabled={tab === activeTab} // Info: (20260420 - Julian) 避免重複 call API
          >
            {t(`voucher.tab.${tab.toLowerCase()}`)}
          </button>
        ))}
      </div>

      {/* Info: (20260703 - Julian) Tab Content */}
      {tabContent}

      {/* Info: (20260617 - Julian) Export Settings Modal */}
      {accountBookId && (
        <ExportSettingsModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          accountBookId={accountBookId}
          type={ExportType.VOUCHER}
        />
      )}
    </div>
  );
}
