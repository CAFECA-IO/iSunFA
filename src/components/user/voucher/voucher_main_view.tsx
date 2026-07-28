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
import ExportSettingsModal from "@/components/user/common/export_settings_modal";
import AccountManagementTab from "@/components/user/voucher/account_management_tab";
import LedgerView from "@/components/user/voucher/ledger_view";
import { Download } from "lucide-react";
import { ExportCsvType } from "@/constants/enums";

enum VoucherTab {
  VOUCHERS = "vouchers",
  ACCOUNTS = "accounts",
  LEDGER = "ledger",
}

export default function VoucherMainView() {
  const { t } = useTranslation();
  const params = useParams();
  const accountBookId = params?.account_book_id as string;

  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  // Info: (20260727 - Julian) 分類帳目前的匯出條件（由 LedgerView 上報），供共用匯出 Modal 使用
  const [ledgerExportParams, setLedgerExportParams] = useState<{
    startDate: string;
    endDate: string;
    extraParams: Record<string, string>;
  } | null>(null);

  // Info: (20260703 - Julian) 取得 URL 參數中的 tab
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Info: (20260703 - Julian) 從 URL 參數取得 tab，預設顯示 records
  const tabParams = useSearchParams().get("tab");
  let activeTab = VoucherTab.VOUCHERS;
  if (tabParams === "accounts") activeTab = VoucherTab.ACCOUNTS;
  else if (tabParams === "ledger") activeTab = VoucherTab.LEDGER;

  const handleTabChange = (tab: VoucherTab) => {
    // Info: (20260703 - Julian) 複製目前的 URLSearchParams，再把 tab 的參數加上去
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.set("tab", tab);

    // Info: (20260703 - Julian) 更新 URL，並指定 scroll: false
    router.replace(`${pathname}?${newSearchParams.toString()}`, {
      scroll: false,
    });
  };

  // Info: (20260727 - Julian) 目前 tab
  const isLedger = activeTab === VoucherTab.LEDGER;

  // Info: (20260727 - Julian) UI 文字
  const titleText = isLedger
    ? t("voucher.main_view.title_ledger")
    : t("voucher.main_view.title");
  const subtitleText = isLedger
    ? t("voucher.main_view.subtitle_ledger")
    : t("voucher.main_view.subtitle");
  const downloadText = isLedger
    ? t("voucher.ledger.export")
    : t("voucher.main_view.actions.export");

  const renderTabContent = () => {
    switch (activeTab) {
      // Info: (20260727 - Julian) 傳票管理
      case VoucherTab.VOUCHERS:
        return (
          <>
            {/* Info: (20260316 - Julian) Summary */}
            <VoucherSummary />
            {/* Info: (20260316 - Julian) Table Section */}
            <VoucherTableSection />
          </>
        );

      // Info: (20260727 - Julian) 會計科目管理
      case VoucherTab.ACCOUNTS:
        return (
          <AccountManagementTab
            backToMainTab={() => handleTabChange(VoucherTab.VOUCHERS)}
          />
        );

      // Info: (20260727 - Julian) 分類帳
      case VoucherTab.LEDGER:
        return <LedgerView onExportParamsChange={setLedgerExportParams} />;

      default:
        return null;
    }
  };

  return (
    <div className="flex max-w-[calc(100vw-30px)] flex-col gap-y-4 px-0 lg:gap-y-6 lg:px-12">
      {/* Info: (20260316 - Julian) Header */}
      <div className="flex flex-col items-center justify-start gap-4 lg:flex-row lg:justify-between">
        {/* Info: (20260617 - Julian) Title */}
        <div className="flex flex-col gap-2">
          <h1 className="flex items-center text-base font-bold text-slate-800 lg:text-2xl">
            {titleText}
          </h1>
          <p className="text-xs font-medium text-slate-500 lg:text-sm">
            {subtitleText}
          </p>
        </div>
        {/* Info: (20260617 - Julian) Export CSV Button */}
        <button
          type="button"
          onClick={() => setIsExportModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-orange-500 px-6 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-600 lg:text-base"
        >
          <Download className="size-5 shrink-0 lg:size-6" />
          {downloadText}
        </button>
      </div>

      {/* Info: (20260703 - Julian) Tab Switch */}
      <div className="grid w-full grid-cols-3 space-x-1 rounded-xl border border-gray-200 bg-gray-100 p-1.5 lg:w-fit">
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
      {renderTabContent()}

      {/* Info: (20260727 - Julian) Export Settings Modal */}
      {accountBookId && (
        <ExportSettingsModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          accountBookId={accountBookId}
          type={isLedger ? ExportCsvType.LEDGER : ExportCsvType.VOUCHER}
          initialStartDate={
            isLedger ? ledgerExportParams?.startDate : undefined
          }
          initialEndDate={isLedger ? ledgerExportParams?.endDate : undefined}
          extraParams={isLedger ? ledgerExportParams?.extraParams : undefined}
        />
      )}
    </div>
  );
}
