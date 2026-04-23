"use client";

import { useTranslation } from "@/i18n/i18n_context";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import JournalUploadView from "@/components/user/journal/journal_upload_view";
import JournalListView from "@/components/user/journal/journal_list_view";
import JournalLogView from "@/components/user/journal/journal_log_view";
import JournalScanView from "@/components/user/journal/journal_scan_view";

enum EJournalTab {
  UPLOAD = "upload",
  SCAN = "scan",
  LIST = "list",
  LOG = "log",
}

export default function JournalMainView() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Info: (20260423 - Julian) 取得 URL 參數中的 activeTab，如果沒有就預設為 UPLOAD
  const activeTabParam = searchParams.get("tab") as EJournalTab | null;
  const activeTab = Object.values(EJournalTab).includes(
    activeTabParam as EJournalTab,
  )
    ? (activeTabParam as EJournalTab)
    : EJournalTab.UPLOAD;

  // Info: (20260423 - Julian) 切換 tab 時更新 URL 參數
  const handleTabChange = (tab: EJournalTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const renderView = () => {
    switch (activeTab) {
      case EJournalTab.UPLOAD:
        return (
          <JournalUploadView
            onUploadComplete={() => handleTabChange(EJournalTab.LIST)}
          />
        );
      case EJournalTab.SCAN:
        return (
          <JournalScanView
            onScanComplete={() => handleTabChange(EJournalTab.LIST)}
          />
        );
      case EJournalTab.LIST:
        return <JournalListView />;
      case EJournalTab.LOG:
        return <JournalLogView />;
    }
  };

  const menuData = [
    {
      key: EJournalTab.UPLOAD,
      label: t("journal.main_view.upload"),
    },
    {
      key: EJournalTab.SCAN,
      label: t("ocr.quick_scan"),
    },
    {
      key: EJournalTab.LIST,
      label: t("journal.main_view.list"),
    },
    {
      key: EJournalTab.LOG,
      label: t("journal.main_view.log"),
    },
  ];

  const renderMenu = () => {
    return menuData.map((item) => (
      <button
        key={item.key}
        type="button"
        className={`flex min-w-max shrink-0 items-center justify-center gap-3 rounded-lg p-2.5 text-sm font-medium transition-colors lg:w-full lg:justify-start lg:px-4 lg:py-3 ${
          activeTab === item.key
            ? "bg-white text-orange-600 shadow-sm"
            : "text-gray-600 hover:bg-gray-200"
        }`}
        onClick={() => handleTabChange(item.key)}
        disabled={activeTab === item.key}
      >
        {item.label}
      </button>
    ));
  };

  return (
    <div className="flex w-full min-w-0 flex-col bg-gray-50">
      <div className="flex justify-between px-4 py-4 md:px-8 md:py-6">
        <h1 className="font-sans text-xl font-bold text-slate-800 md:text-2xl">
          {t("journal.main_view.title")}
        </h1>
      </div>

      {/* Info: (20260304 - Julian) Menu */}
      <div className="flex max-w-full min-w-0 flex-col gap-4 sm:px-4 lg:flex-row">
        {/* Info: (20260304 - Julian) Upload Area */}
        <div className="hide-scrollbar grid h-fit w-full max-w-full grid-flow-row grid-cols-2 rounded-lg border border-gray-200 bg-gray-100 p-2 lg:w-[180px] lg:grid-cols-1 lg:p-4">
          {renderMenu()}
        </div>

        {/* Info: (20260304 - Julian) Main View */}
        <div className="w-full min-w-0 lg:w-[calc(100vw-250px)] lg:px-4">
          {renderView()}
        </div>
      </div>
    </div>
  );
}
